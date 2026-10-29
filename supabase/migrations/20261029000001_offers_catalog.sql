-- =============================================================================
-- Offres façon UNiDAYS (non destructif).
--   • Canal de l'offre : en magasin (par défaut, comportement actuel), à distance (« online »), ou les deux.
--   • Offre à distance : la plupart des marques n'ont pas de site ; l'étudiant commande par WhatsApp, appel,
--     page Facebook/Instagram ou site s'il existe. Contact et code dans une table protégée, jamais lisible
--     publiquement. Mode de code :
--       unique  → code personnel Uny (même circuit que le magasin, validé par la marque dans son espace) ;
--       shared  → code fourni par la marque, révélé uniquement aux étudiants vérifiés.
--   • Exclusivité Uny (réservée aux administrateurs, comme la mise en avant).
--   • Ouvertures d'offres à distance journalisées (statistiques de la marque), tendances calculées en base.
-- =============================================================================

alter table public.deals
  add column if not exists channel text not null default 'in_store',
  add column if not exists online_code_mode text,
  add column if not exists is_exclusive boolean not null default false;

alter table public.deals add constraint deals_channel_check
  check (channel in ('in_store', 'online', 'both')) not valid;
alter table public.deals validate constraint deals_channel_check;
alter table public.deals add constraint deals_online_mode_check
  check (online_code_mode is null or online_code_mode in ('unique', 'shared')) not valid;
alter table public.deals validate constraint deals_online_mode_check;
alter table public.deals add constraint deals_online_complete
  check (channel = 'in_store' or online_code_mode is not null) not valid;
alter table public.deals validate constraint deals_online_complete;
create index if not exists deals_channel_idx on public.deals (channel) where is_active;

-- Une offre en magasin n'a pas de mode de code à distance
create or replace function public.deals_normalize_channel()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.channel = 'in_store' then
    new.online_code_mode := null;
  end if;
  return new;
end;
$$;
create or replace trigger deals_normalize_channel
  before insert or update of channel, online_code_mode on public.deals
  for each row execute function public.deals_normalize_channel();

-- Champs réservés à l'administration : mise en avant et exclusivité (redéfinition, logique inchangée sinon)
create or replace function public.protect_partner_content()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if tg_table_name = 'partners' then
    new.id := old.id;
    new.is_demo := old.is_demo;
    new.is_active := old.is_active;
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.is_demo := false;
    new.view_count := 0;
    if tg_table_name = 'deals' then
      new.is_featured := false;
      new.is_exclusive := false;
    end if;
    if tg_table_name = 'housing' then
      new.created_by := auth.uid();
    end if;
  else
    new.is_demo := old.is_demo;
    new.view_count := old.view_count;
    if tg_table_name = 'deals' then
      new.is_featured := old.is_featured;
      new.is_exclusive := old.is_exclusive;
    end if;
  end if;
  return new;
end;
$$;

-- Contact et code partagé de l'offre à distance : jamais lisibles par les étudiants (révélés par open_online_offer)
--   whatsapp / phone : numéro guinéen au format +224XXXXXXXXX ; facebook / instagram / website : adresse https
create table if not exists public.deal_online_access (
  deal_id uuid primary key references public.deals (id) on delete cascade,
  contact_kind text not null check (contact_kind in ('whatsapp', 'phone', 'facebook', 'instagram', 'website')),
  contact text not null check (
    (contact_kind in ('whatsapp', 'phone') and contact ~ '^\+224[0-9]{8,9}$')
    or (contact_kind in ('facebook', 'instagram', 'website') and contact ~ '^https://[^[:space:]]+$' and char_length(contact) <= 500)
  ),
  code text check (code is null or char_length(code) between 2 and 40),
  updated_at timestamptz not null default now()
);
alter table public.deal_online_access enable row level security;
create policy "deal_online_access_member" on public.deal_online_access for all to authenticated
  using (exists (select 1 from public.deals d where d.id = deal_id and (public.is_partner_member(d.partner_id) or public.is_admin())))
  with check (exists (select 1 from public.deals d where d.id = deal_id and (public.is_partner_member(d.partner_id) or public.is_admin())));
revoke all on public.deal_online_access from anon;

-- Ouvertures d'offres à distance (statistiques ; pas de lecture directe hors administration)
create table if not exists public.deal_clicks (
  id bigint generated always as identity primary key,
  deal_id uuid not null references public.deals (id) on delete cascade,
  student_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists deal_clicks_deal_idx on public.deal_clicks (deal_id, created_at desc);
alter table public.deal_clicks enable row level security;
create policy "deal_clicks_admin_read" on public.deal_clicks for select to authenticated using (public.is_admin());
revoke all on public.deal_clicks from anon;

-- Ouvrir une offre à distance : mêmes conditions que le code en magasin (étudiant vérifié, carte valable, offre en cours)
create or replace function public.open_online_offer(p_deal uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  d record;
  v_status public.verification_status;
  v_card_ok boolean;
  v_code text;
  v_expires timestamptz;
  v_claim jsonb;
begin
  if v_user is null then
    raise exception 'Connexion requise.' using errcode = '42501';
  end if;
  select x.id, x.partner_id, x.is_active, x.valid_from, x.valid_until, x.flash_started_at, x.flash_ends_at,
         x.channel, x.online_code_mode, p.is_active as partner_active, a.contact_kind, a.contact, a.code as shared_code
    into d
    from public.deals x join public.partners p on p.id = x.partner_id
    left join public.deal_online_access a on a.deal_id = x.id
   where x.id = p_deal;
  if not found or not d.is_active or not d.partner_active or d.channel = 'in_store' or d.contact is null then
    raise exception 'Offre à distance indisponible.' using errcode = 'P0001';
  end if;

  if d.online_code_mode = 'unique' then
    -- Même circuit que le magasin : contrôles, quota flash et unicité gérés par claim_promo_code
    v_claim := public.claim_promo_code(p_deal);
    v_code := v_claim ->> 'code';
    v_expires := (v_claim ->> 'expires_at')::timestamptz;
  else
    if d.valid_from > (now() at time zone 'Africa/Conakry')::date
       or (d.valid_until is not null and d.valid_until < (now() at time zone 'Africa/Conakry')::date) then
      raise exception 'Cette offre n''est pas valable aujourd''hui.' using errcode = 'P0001';
    end if;
    if (d.flash_started_at is not null and d.flash_started_at > now()) or (d.flash_ends_at is not null and d.flash_ends_at <= now()) then
      raise exception 'Cette offre flash n''est pas en cours.' using errcode = 'P0001';
    end if;
    select verification_status into v_status from public.profiles where id = v_user;
    select exists (
      select 1 from public.student_cards c where c.user_id = v_user and c.status = 'active' and c.expires_at >= current_date
    ) into v_card_ok;
    if v_status is distinct from 'verified' or not v_card_ok then
      raise exception 'Cette offre est réservée aux étudiants vérifiés avec une carte valide.' using errcode = 'P0001';
    end if;
    if d.online_code_mode = 'shared' then
      v_code := d.shared_code;
      if v_code is null then
        raise exception 'Le code de cette offre n''est pas encore disponible.' using errcode = 'P0001';
      end if;
    end if;
  end if;

  insert into public.deal_clicks (deal_id, student_id) values (p_deal, v_user);
  return jsonb_build_object('contact_kind', d.contact_kind, 'contact', d.contact, 'mode', d.online_code_mode, 'code', v_code, 'expires_at', v_expires);
end;
$$;
revoke all on function public.open_online_offer(uuid) from public, anon;
grant execute on function public.open_online_offer(uuid) to authenticated;

-- Tendances (14 jours) : vues + codes obtenus + ouvertures à distance ; uniquement des offres réelles en cours
create or replace function public.deals_trending(p_limit integer default 10)
returns table (deal_id uuid, score bigint)
language sql
stable
security definer
set search_path = ''
as $$
  with since as (select now() - interval '14 days' as t),
  activity as (
    select v.entity_id as deal_id, 1 as w from public.content_views v, since
     where v.entity_type = 'deal' and v.created_at >= since.t
    union all
    select c.deal_id, 3 from public.promo_codes c, since where c.created_at >= since.t
    union all
    select k.deal_id, 3 from public.deal_clicks k, since where k.created_at >= since.t
  )
  select a.deal_id, sum(a.w)::bigint as score
    from activity a
    join public.deals d on d.id = a.deal_id
    join public.partners p on p.id = d.partner_id
   where d.is_active and p.is_active and not d.is_demo
     and (d.valid_until is null or d.valid_until >= (now() at time zone 'Africa/Conakry')::date)
     and (d.flash_ends_at is null or d.flash_ends_at > now())
   group by a.deal_id
   order by score desc, a.deal_id
   limit least(greatest(coalesce(p_limit, 10), 1), 50);
$$;
revoke all on function public.deals_trending(integer) from public;
grant execute on function public.deals_trending(integer) to anon, authenticated;

-- Statistiques par offre pour la marque (30 jours) : vues, ouvertures à distance, codes obtenus, codes utilisés
create or replace function public.partner_deal_stats(p_partner uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (public.is_partner_member(p_partner) or public.is_admin()) is not true then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'deal', d.id,
      'views', (select count(*) from public.content_views v
                 where v.entity_type = 'deal' and v.entity_id = d.id and v.created_at >= now() - interval '30 days'),
      'clicks', (select count(*) from public.deal_clicks k where k.deal_id = d.id and k.created_at >= now() - interval '30 days'),
      'students', (select count(distinct k.student_id) from public.deal_clicks k
                    where k.deal_id = d.id and k.created_at >= now() - interval '30 days'),
      'codes', (select count(*) from public.promo_codes c where c.deal_id = d.id and c.created_at >= now() - interval '30 days'),
      'used', (select count(*) from public.promo_codes c
                where c.deal_id = d.id and c.status = 'used' and c.used_at >= now() - interval '30 days')
    ))
      from public.deals d where d.partner_id = p_partner
  ), '[]'::jsonb);
end;
$$;
revoke all on function public.partner_deal_stats(uuid) from public, anon;
grant execute on function public.partner_deal_stats(uuid) to authenticated;
