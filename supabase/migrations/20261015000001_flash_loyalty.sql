-- =============================================================================
-- UNY — offres flash, fidélité et bilan hebdomadaire des partenaires
--   • offre flash : durée (2 à 48 h) et quantité limitée, notification immédiate à tous les étudiants
--     (au plus une alerte flash par partenaire et par 20 h)
--   • fidélité : chaque passage validé (carte scannée ou code promo) ajoute un tampon ; au palier
--     choisi par le partenaire, la récompense est débloquée. Le partenaire peut aussi offrir un
--     tampon ou une récompense à ses meilleurs clients.
--   • bilan hebdomadaire envoyé aux partenaires chaque lundi (vues, codes, clients, ventes)
-- Aucune offre n'est limitée à une université ou un quartier : tous les étudiants les voient.
-- =============================================================================

alter table public.deals
  add column flash_hours smallint check (flash_hours is null or flash_hours in (2, 4, 8, 24, 48)),
  add column flash_quantity integer check (flash_quantity is null or flash_quantity between 1 and 10000),
  add column flash_started_at timestamptz,
  add column flash_ends_at timestamptz;
create index deals_flash_idx on public.deals(flash_ends_at) where flash_ends_at is not null;

-- La fenêtre flash démarre quand la durée est choisie (ou changée), ou quand l'offre est republiée
create or replace function public.set_flash_window()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.flash_hours is null then
    new.flash_started_at := null;
    new.flash_ends_at := null;
  elsif tg_op = 'INSERT'
        or old.flash_hours is distinct from new.flash_hours
        or (new.is_active and not old.is_active and (old.flash_ends_at is null or old.flash_ends_at <= now())) then
    new.flash_started_at := now();
    new.flash_ends_at := now() + make_interval(hours => new.flash_hours);
  end if;
  return new;
end;
$$;
create trigger deals_flash_window before insert or update on public.deals
  for each row execute function public.set_flash_window();

-- Annonce aux étudiants : nouvelle offre (une fois) ou offre flash (immédiate, à tous)
create or replace function public.announce_new_deal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_partner record;
  v_flash_new boolean;
begin
  if not new.is_active or new.is_demo
     or new.valid_from > current_date
     or (new.valid_until is not null and new.valid_until < current_date) then
    return new;
  end if;
  v_flash_new := new.flash_ends_at is not null and new.flash_ends_at > now()
    and (tg_op = 'INSERT' or old.flash_ends_at is distinct from new.flash_ends_at or not old.is_active);
  if not v_flash_new and new.announced_at is not null then
    return new;
  end if;
  select name, is_active, is_demo into v_partner from public.partners where id = new.partner_id;
  if not found or not v_partner.is_active or v_partner.is_demo then
    return new;
  end if;

  update public.deals set announced_at = coalesce(announced_at, now()) where id = new.id;

  if v_flash_new then
    -- Au plus une alerte flash par partenaire toutes les 20 heures
    if exists (select 1 from public.notifications n
                join public.deals d on n.link = '/avantages/' || d.id::text
               where n.type = 'flash_deal' and d.partner_id = new.partner_id
                 and n.created_at > now() - interval '20 hours') then
      return new;
    end if;
    insert into public.notifications (user_id, type, title, body, link)
    select p.id, 'flash_deal',
           format('⚡ Offre flash : %s', left(v_partner.name, 60)),
           left(format('%s — %s. Jusqu''à %s%s', new.title, new.discount_label,
                       replace(to_char(new.flash_ends_at at time zone 'Africa/Conakry', 'HH24:MI'), ':', 'h'),
                       case when new.flash_quantity is not null then format(', %s places', new.flash_quantity) else '' end), 200),
           format('/avantages/%s', new.id)
      from public.profiles p
     where p.role = 'student' and p.account_status = 'approved' and not p.is_test_account;
    return new;
  end if;

  insert into public.notifications (user_id, type, title, body, link)
  select p.id, 'new_deal',
         format('Nouvelle offre : %s 🔥', left(v_partner.name, 60)),
         left(format('%s — %s', new.title, new.discount_label), 200),
         format('/avantages/%s', new.id)
    from public.profiles p
   where p.role = 'student'
     and p.account_status = 'approved'
     and not p.is_test_account
     and not exists (select 1 from public.notifications n
                      where n.user_id = p.id and n.type = 'new_deal' and n.created_at > now() - interval '6 hours');
  return new;
end;
$$;
revoke execute on function public.announce_new_deal() from public, anon, authenticated;
create or replace trigger deals_announce after insert or update of is_active, flash_ends_at on public.deals
  for each row execute function public.announce_new_deal();

create or replace function public.claim_promo_code(p_deal uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_deal record;
  v_status public.verification_status;
  v_card_ok boolean;
  v_existing record;
  v_expires timestamptz;
  v_code text;
begin
  if v_user is null then
    raise exception 'Connexion requise.' using errcode = '42501';
  end if;

  select d.id, d.partner_id, d.is_active, d.valid_from, d.valid_until, d.requires_verification, p.is_active as partner_active,
         d.flash_ends_at, d.flash_started_at, d.flash_quantity
    into v_deal
    from public.deals d join public.partners p on p.id = d.partner_id
   where d.id = p_deal;
  if not found or not v_deal.is_active or not v_deal.partner_active then
    raise exception 'Offre indisponible.' using errcode = 'P0001';
  end if;
  if v_deal.valid_from > current_date or (v_deal.valid_until is not null and v_deal.valid_until < current_date) then
    raise exception 'Cette offre n''est pas valable aujourd''hui.' using errcode = 'P0001';
  end if;
  if v_deal.flash_ends_at is not null and v_deal.flash_ends_at <= now() then
    raise exception 'Cette offre flash est terminée.' using errcode = 'P0001';
  end if;

  select verification_status into v_status from public.profiles where id = v_user;
  select exists (
    select 1 from public.student_cards c
     where c.user_id = v_user and c.status = 'active' and c.expires_at >= current_date
  ) into v_card_ok;
  if v_deal.requires_verification and (v_status is distinct from 'verified' or not v_card_ok) then
    raise exception 'Cette offre est réservée aux étudiants vérifiés avec une carte valide.' using errcode = 'P0001';
  end if;

  select code, expires_at into v_existing
    from public.promo_codes
   where deal_id = p_deal and student_id = v_user and status = 'active' and expires_at > now()
   order by created_at desc limit 1;
  if found then
    return jsonb_build_object('code', v_existing.code, 'expires_at', v_existing.expires_at, 'created', false);
  end if;

  if v_deal.flash_ends_at is not null and v_deal.flash_quantity is not null
     and (select count(*) from public.promo_codes
           where deal_id = p_deal and created_at >= v_deal.flash_started_at and status <> 'cancelled') >= v_deal.flash_quantity then
    raise exception 'Offre flash épuisée : toutes les places sont parties.' using errcode = 'P0001';
  end if;

  if (select count(*) from public.promo_codes where student_id = v_user and created_at > now() - interval '1 day') >= 20 then
    raise exception 'Trop de codes demandés aujourd''hui. Réessaie demain.' using errcode = 'P0001';
  end if;

  v_expires := now() + interval '7 days';
  if v_deal.valid_until is not null then
    v_expires := least(v_expires, (v_deal.valid_until + 1)::timestamp at time zone 'Africa/Conakry');
  end if;
  -- Offre flash : le code reste utilisable 24 h après la fin de l'offre
  if v_deal.flash_ends_at is not null then
    v_expires := least(v_expires, v_deal.flash_ends_at + interval '24 hours');
  end if;
  v_code := public.new_promo_code();
  insert into public.promo_codes (code, deal_id, partner_id, student_id, expires_at)
  values (v_code, p_deal, v_deal.partner_id, v_user, v_expires);
  return jsonb_build_object('code', v_code, 'expires_at', v_expires, 'created', true);
end;
$$;

-- -----------------------------------------------------------------------------
-- Fidélité
-- -----------------------------------------------------------------------------
create table public.loyalty_programs (
  partner_id uuid primary key references public.partners(id) on delete cascade,
  is_active boolean not null default true,
  stamps_required smallint not null default 5 check (stamps_required between 2 and 20),
  reward text not null check (char_length(reward) between 3 and 120),
  updated_at timestamptz not null default now()
);
alter table public.loyalty_programs enable row level security;
create policy "loyalty_programs_read" on public.loyalty_programs for select to authenticated using (true);
create policy "loyalty_programs_insert" on public.loyalty_programs for insert to authenticated
  with check (public.is_partner_member(partner_id) or public.is_admin());
create policy "loyalty_programs_update" on public.loyalty_programs for update to authenticated
  using (public.is_partner_member(partner_id) or public.is_admin())
  with check (public.is_partner_member(partner_id) or public.is_admin());
revoke all on public.loyalty_programs from anon;
revoke delete on public.loyalty_programs from authenticated;

create table public.loyalty_cards (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  stamps smallint not null default 0 check (stamps >= 0),
  rewards_available smallint not null default 0 check (rewards_available >= 0),
  rewards_used integer not null default 0,
  total_visits integer not null default 0,
  total_spent_gnf bigint not null default 0,
  last_visit_at timestamptz,
  created_at timestamptz not null default now(),
  unique (partner_id, student_id)
);
create index loyalty_cards_student_idx on public.loyalty_cards(student_id);
create index loyalty_cards_partner_idx on public.loyalty_cards(partner_id, total_visits desc);
alter table public.loyalty_cards enable row level security;
create policy "loyalty_cards_read" on public.loyalty_cards for select to authenticated
  using (student_id = (select auth.uid()) or public.is_partner_member(partner_id) or public.is_admin());
revoke all on public.loyalty_cards from anon;
revoke insert, update, delete on public.loyalty_cards from authenticated;

create table public.loyalty_events (
  id bigint generated always as identity primary key,
  card_id uuid not null references public.loyalty_cards(id) on delete cascade,
  kind text not null check (kind in ('visit', 'reward_unlocked', 'reward_used', 'gift_stamp', 'gift_reward')),
  amount_gnf bigint,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index loyalty_events_card_idx on public.loyalty_events(card_id, created_at desc);
alter table public.loyalty_events enable row level security;
create policy "loyalty_events_read" on public.loyalty_events for select to authenticated
  using (exists (select 1 from public.loyalty_cards c where c.id = card_id
                  and (c.student_id = (select auth.uid()) or public.is_partner_member(c.partner_id) or public.is_admin())));
revoke all on public.loyalty_events from anon;
revoke insert, update, delete on public.loyalty_events from authenticated;

-- État de la carte de fidélité d'un étudiant chez un partenaire (null si ni programme ni passage)
create or replace function public.loyalty_status(p_partner uuid, p_student uuid, p_unlocked boolean default false)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when lp.partner_id is null and c.id is null then null else jsonb_build_object(
    'card_id', c.id,
    'program', lp.partner_id is not null,
    'stamps', coalesce(c.stamps, 0),
    'required', lp.stamps_required,
    'reward', lp.reward,
    'rewards_available', coalesce(c.rewards_available, 0),
    'total_visits', coalesce(c.total_visits, 0),
    'unlocked', p_unlocked
  ) end
  from (select 1) x
  left join public.loyalty_programs lp on lp.partner_id = p_partner and lp.is_active
  left join public.loyalty_cards c on c.partner_id = p_partner and c.student_id = p_student;
$$;
revoke all on function public.loyalty_status(uuid, uuid, boolean) from public, anon, authenticated;

-- Passage validé : un tampon (un seul par tranche de 2 h : carte + code = un même achat)
create or replace function public.loyalty_add_visit(p_partner uuid, p_student uuid, p_amount bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prog public.loyalty_programs;
  v_card public.loyalty_cards;
  v_unlocked boolean := false;
  v_partner_name text;
begin
  insert into public.loyalty_cards (partner_id, student_id) values (p_partner, p_student)
  on conflict (partner_id, student_id) do nothing;
  select * into v_card from public.loyalty_cards where partner_id = p_partner and student_id = p_student for update;
  select * into v_prog from public.loyalty_programs where partner_id = p_partner and is_active;

  if v_card.last_visit_at is not null and v_card.last_visit_at > now() - interval '2 hours' then
    update public.loyalty_cards set total_spent_gnf = total_spent_gnf + coalesce(p_amount, 0) where id = v_card.id;
    return public.loyalty_status(p_partner, p_student);
  end if;

  update public.loyalty_cards
     set total_visits = total_visits + 1,
         total_spent_gnf = total_spent_gnf + coalesce(p_amount, 0),
         last_visit_at = now(),
         stamps = case when v_prog.partner_id is null then stamps else stamps + 1 end
   where id = v_card.id
  returning * into v_card;
  insert into public.loyalty_events (card_id, kind, amount_gnf, created_by) values (v_card.id, 'visit', p_amount, auth.uid());

  if v_prog.partner_id is not null and v_card.stamps >= v_prog.stamps_required then
    update public.loyalty_cards
       set stamps = stamps - v_prog.stamps_required, rewards_available = rewards_available + 1
     where id = v_card.id;
    insert into public.loyalty_events (card_id, kind, created_by) values (v_card.id, 'reward_unlocked', auth.uid());
    select name into v_partner_name from public.partners where id = p_partner;
    insert into public.notifications (user_id, type, title, body, link)
    values (p_student, 'loyalty_reward', format('🎁 Récompense débloquée chez %s', left(v_partner_name, 60)),
            format('Ta fidélité paie : %s. Montre ta carte Uny lors de ta prochaine visite.', v_prog.reward), '/avantages/fidelite');
    v_unlocked := true;
  end if;
  return public.loyalty_status(p_partner, p_student, v_unlocked);
end;
$$;
revoke all on function public.loyalty_add_visit(uuid, uuid, bigint) from public, anon, authenticated;

-- Le partenaire utilise une récompense au comptoir
create or replace function public.partner_use_reward(p_partner uuid, p_card uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_card public.loyalty_cards;
  v_partner_name text;
begin
  if not (public.is_partner_member(p_partner) or public.is_admin()) then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  update public.loyalty_cards set rewards_available = rewards_available - 1, rewards_used = rewards_used + 1
   where id = p_card and partner_id = p_partner and rewards_available > 0
  returning * into v_card;
  if not found then
    raise exception 'Aucune récompense disponible pour ce client.' using errcode = 'P0001';
  end if;
  insert into public.loyalty_events (card_id, kind, created_by) values (v_card.id, 'reward_used', auth.uid());
  select name into v_partner_name from public.partners where id = p_partner;
  insert into public.notifications (user_id, type, title, body, link)
  values (v_card.student_id, 'loyalty_used', 'Récompense utilisée ✅',
          format('Merci pour ta fidélité chez %s !', left(v_partner_name, 60)), '/avantages/fidelite');
  return public.loyalty_status(p_partner, v_card.student_id);
end;
$$;
revoke all on function public.partner_use_reward(uuid, uuid) from public, anon;
grant execute on function public.partner_use_reward(uuid, uuid) to authenticated;

-- Le partenaire récompense un bon client : un tampon ou une récompense offerte
create or replace function public.partner_gift_loyalty(p_partner uuid, p_card uuid, p_kind text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_card public.loyalty_cards;
  v_prog public.loyalty_programs;
  v_partner_name text;
  v_unlocked boolean := false;
begin
  if not (public.is_partner_member(p_partner) or public.is_admin()) then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  if p_kind not in ('stamp', 'reward') then
    raise exception 'Cadeau inconnu.' using errcode = 'P0001';
  end if;
  select * into v_prog from public.loyalty_programs where partner_id = p_partner and is_active;
  if v_prog.partner_id is null then
    raise exception 'Active d''abord ton programme de fidélité.' using errcode = 'P0001';
  end if;
  select * into v_card from public.loyalty_cards where id = p_card and partner_id = p_partner for update;
  if not found then
    raise exception 'Client inconnu.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.loyalty_events e join public.loyalty_cards c on c.id = e.card_id
       where c.partner_id = p_partner and e.kind in ('gift_stamp', 'gift_reward') and e.created_at > now() - interval '1 day') >= 50 then
    raise exception 'Limite de 50 cadeaux par jour atteinte.' using errcode = 'P0001';
  end if;

  if p_kind = 'stamp' then
    update public.loyalty_cards set stamps = stamps + 1 where id = p_card returning * into v_card;
    insert into public.loyalty_events (card_id, kind, created_by) values (p_card, 'gift_stamp', auth.uid());
    if v_card.stamps >= v_prog.stamps_required then
      update public.loyalty_cards set stamps = stamps - v_prog.stamps_required, rewards_available = rewards_available + 1
       where id = p_card;
      insert into public.loyalty_events (card_id, kind, created_by) values (p_card, 'reward_unlocked', auth.uid());
      v_unlocked := true;
    end if;
  else
    update public.loyalty_cards set rewards_available = rewards_available + 1 where id = p_card;
    insert into public.loyalty_events (card_id, kind, created_by) values (p_card, 'gift_reward', auth.uid());
    v_unlocked := true;
  end if;

  select name into v_partner_name from public.partners where id = p_partner;
  insert into public.notifications (user_id, type, title, body, link)
  values (v_card.student_id, 'loyalty_gift',
          case when v_unlocked then format('🎁 %s t''offre une récompense', left(v_partner_name, 60))
               else format('⭐ %s t''offre un tampon fidélité', left(v_partner_name, 60)) end,
          case when v_unlocked then format('Merci d''être un client fidèle : %s. Montre ta carte Uny lors de ta prochaine visite.', v_prog.reward)
               else 'Merci d''être un client fidèle ! Ta carte de fidélité avance.' end,
          '/avantages/fidelite');
  return public.loyalty_status(p_partner, v_card.student_id, v_unlocked);
end;
$$;
revoke all on function public.partner_gift_loyalty(uuid, uuid, text) from public, anon;
grant execute on function public.partner_gift_loyalty(uuid, uuid, text) to authenticated;

-- Meilleurs clients d'un partenaire (prénom + initiale du nom)
create or replace function public.partner_top_customers(p_partner uuid, p_limit integer default 50)
returns table (
  card_id uuid, first_name text, last_initial text, avatar_url text, uny_id text,
  total_visits integer, total_spent_gnf bigint, stamps smallint, rewards_available smallint,
  rewards_used integer, last_visit_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (public.is_partner_member(p_partner) or public.is_admin()) then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  return query
  select c.id, p.first_name, left(p.last_name, 1), p.avatar_url, p.uny_id,
         c.total_visits, c.total_spent_gnf, c.stamps, c.rewards_available, c.rewards_used, c.last_visit_at
    from public.loyalty_cards c join public.profiles p on p.id = c.student_id
   where c.partner_id = p_partner
   order by c.total_visits desc, c.total_spent_gnf desc, c.last_visit_at desc nulls last
   limit least(greatest(p_limit, 1), 200);
end;
$$;
revoke all on function public.partner_top_customers(uuid, integer) from public, anon;
grant execute on function public.partner_top_customers(uuid, integer) to authenticated;

create or replace function public.partner_validate_card(
  p_partner uuid,
  p_token text default null,
  p_uny_id text default null,
  p_deal uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_uny_id text;
  v_year text;
  v_card_status public.card_status;
  v_expires date;
  v_first text;
  v_last text;
  v_avatar text;
  v_university text;
  v_field text;
  v_status public.verification_status;
  v_outcome text;
  v_eligible boolean;
  v_deal_title text;
  v_deal_requires boolean := true;
  v_uses integer := 0;
  v_partner_name text;
  v_loyalty jsonb;
begin
  if not (public.is_partner_member(p_partner) or public.is_admin()) then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  if (select count(*) from public.card_validations
       where partner_id = p_partner and created_at > now() - interval '1 hour') >= 300 then
    raise exception 'Trop de vérifications en une heure. Réessaie plus tard.' using errcode = 'P0001';
  end if;

  if p_deal is not null then
    select d.title, d.requires_verification into v_deal_title, v_deal_requires
      from public.deals d where d.id = p_deal and d.partner_id = p_partner;
    if not found then
      raise exception 'Offre inconnue.' using errcode = 'P0001';
    end if;
  end if;

  select c.user_id, c.uny_id, c.academic_year, c.status, c.expires_at,
         p.first_name, p.last_name, p.avatar_url, coalesce(b.official_name, u.name, p.university_other),
         coalesce(e.program, p.field_of_study), p.verification_status
    into v_user, v_uny_id, v_year, v_card_status, v_expires,
         v_first, v_last, v_avatar, v_university, v_field, v_status
    from public.student_cards c
    join public.profiles p on p.id = c.user_id
    left join public.universities u on u.id = p.university_id
    left join public.university_branding b on b.university_id = u.id
    left join public.student_enrollments e on e.id = c.enrollment_id
   where (p_token is not null and c.qr_token = p_token)
      or (p_token is null and p_uny_id is not null and c.uny_id = upper(trim(p_uny_id)))
   limit 1;

  if v_user is null then
    return jsonb_build_object('found', false);
  end if;

  v_outcome := case
    when v_card_status = 'revoked' then 'revoked'
    when v_card_status = 'expired' or v_expires < current_date then 'expired'
    when v_status <> 'verified' then 'unverified'
    else 'valid'
  end;
  v_eligible := v_outcome = 'valid' or (v_outcome = 'unverified' and p_deal is not null and not v_deal_requires);

  if p_deal is not null then
    select count(*) into v_uses from public.card_validations
     where deal_id = p_deal and student_id = v_user and eligible
       and created_at >= date_trunc('day', now());
  end if;

  insert into public.card_validations
    (partner_id, deal_id, student_id, scanned_by, student_name, student_uny_id, outcome, eligible)
  values (p_partner, p_deal, v_user, auth.uid(), v_first || ' ' || v_last, v_uny_id, v_outcome, v_eligible);

  if v_eligible then
    select name into v_partner_name from public.partners where id = p_partner;
    insert into public.notifications (user_id, type, title, body, link)
    values (v_user, 'card_validated', 'Carte Uny validée ✅',
            'Chez ' || v_partner_name || coalesce(' · ' || v_deal_title, '') || '. Bon plan !', '/carte');
    v_loyalty := public.loyalty_add_visit(p_partner, v_user, null);
  else
    v_loyalty := public.loyalty_status(p_partner, v_user);
  end if;

  return jsonb_build_object(
    'found', true,
    'outcome', v_outcome,
    'eligible', v_eligible,
    'uny_id', v_uny_id,
    'first_name', v_first,
    'last_name', v_last,
    'avatar_url', v_avatar,
    'university', v_university,
    'field_of_study', v_field,
    'academic_year', v_year,
    'expires_at', v_expires,
    'deal_title', v_deal_title,
    'deal_requires_verification', v_deal_requires,
    'uses_today', v_uses,
    'loyalty', v_loyalty
  );
end;
$$;
create or replace function public.partner_redeem_promo_code(
  p_partner uuid,
  p_code text,
  p_redeem boolean default false,
  p_payment_method text default null,
  p_reference text default null,
  p_amount bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row record;
  v_state text;
  v_loyalty jsonb;
begin
  if not (public.is_partner_member(p_partner) or public.is_admin()) then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  if p_payment_method is not null and p_payment_method not in ('orange_money', 'cash', 'other') then
    raise exception 'Mode de paiement inconnu.' using errcode = 'P0001';
  end if;
  if p_amount is not null and (p_amount < 0 or p_amount > 1000000000) then
    raise exception 'Montant invalide.' using errcode = 'P0001';
  end if;

  select pc.*, d.title as deal_title, d.discount_label, d.price_gnf, d.promo_price_gnf,
         pr.first_name, pr.last_name, pr.avatar_url, pr.uny_id
    into v_row
    from public.promo_codes pc
    join public.deals d on d.id = pc.deal_id
    join public.profiles pr on pr.id = pc.student_id
   where pc.code = upper(trim(p_code)) and pc.partner_id = p_partner
   for update of pc;
  if not found then
    return jsonb_build_object('found', false);
  end if;

  v_state := case
    when v_row.status = 'used' then 'used'
    when v_row.status = 'cancelled' then 'cancelled'
    when v_row.expires_at <= now() then 'expired'
    else 'active' end;

  if p_redeem and v_state = 'active' then
    update public.promo_codes
       set status = 'used', used_at = now(), used_by = auth.uid(),
           payment_method = coalesce(p_payment_method, payment_method),
           payment_reference = coalesce(nullif(trim(p_reference), ''), payment_reference),
           amount_gnf = coalesce(p_amount, v_row.promo_price_gnf)
     where id = v_row.id;
    insert into public.notifications (user_id, type, title, body, link)
    values (v_row.student_id, 'promo_used', 'Code promo utilisé ✅',
            format('Ton code %s a été validé : %s.', v_row.code, v_row.deal_title), '/avantages/mes-codes');
    v_loyalty := public.loyalty_add_visit(p_partner, v_row.student_id, coalesce(p_amount, v_row.promo_price_gnf));
    v_state := 'redeemed';
  end if;
  if v_loyalty is null then
    v_loyalty := public.loyalty_status(p_partner, v_row.student_id);
  end if;

  return jsonb_build_object(
    'found', true,
    'state', v_state,
    'code', v_row.code,
    'deal_title', v_row.deal_title,
    'discount_label', v_row.discount_label,
    'price_gnf', v_row.price_gnf,
    'promo_price_gnf', v_row.promo_price_gnf,
    'first_name', v_row.first_name,
    'last_name', v_row.last_name,
    'avatar_url', v_row.avatar_url,
    'uny_id', v_row.uny_id,
    'expires_at', v_row.expires_at,
    'used_at', case when v_state = 'redeemed' then now() else v_row.used_at end,
    'payment_reference', coalesce(nullif(trim(p_reference), ''), v_row.payment_reference),
    'loyalty', v_loyalty
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Bilan hebdomadaire des partenaires (chaque lundi)
-- -----------------------------------------------------------------------------
create or replace function public.partner_weekly_report()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  with stats as (
    select pa.id,
      (select count(*) from public.deals d where d.partner_id = pa.id and d.is_active) as deals,
      (select count(*) from public.content_views v join public.deals d on d.id = v.entity_id
        where v.entity_type = 'deal' and d.partner_id = pa.id and v.created_at > now() - interval '7 days') as views,
      (select count(*) from public.promo_codes c where c.partner_id = pa.id and c.created_at > now() - interval '7 days') as codes,
      (select count(*) from public.promo_codes c where c.partner_id = pa.id and c.used_at > now() - interval '7 days') as used,
      (select coalesce(sum(c.amount_gnf), 0) from public.promo_codes c where c.partner_id = pa.id and c.used_at > now() - interval '7 days') as revenue,
      (select count(*) from public.loyalty_cards lc where lc.partner_id = pa.id and lc.last_visit_at > now() - interval '7 days') as clients,
      (select count(*) from public.loyalty_events e join public.loyalty_cards lc on lc.id = e.card_id
        where lc.partner_id = pa.id and e.kind = 'reward_unlocked' and e.created_at > now() - interval '7 days') as rewards
    from public.partners pa
    where pa.is_active and not pa.is_demo
  )
  insert into public.notifications (user_id, type, title, body, link)
  select m.user_id, 'partner_report', 'Votre bilan Uny de la semaine 📊',
         case when s.deals = 0 then
           'Vous n''avez pas encore d''offre en ligne. Publiez-en une : elle est envoyée à tous les étudiants Uny.'
         else format('%s vues · %s codes obtenus · %s utilisés · %s clients · %s GNF de ventes%s',
                     s.views, s.codes, s.used, s.clients, replace(to_char(s.revenue, 'FM999,999,999,990'), ',', ' '),
                     case when s.rewards > 0 then format(' · %s récompenses fidélité', s.rewards) else '' end) end,
         case when s.deals = 0 then '/partenaire/offres/nouveau' else '/partenaire' end
    from stats s join public.partner_members m on m.partner_id = s.id
    join public.profiles pr on pr.id = m.user_id
   where pr.role <> 'admin' and not pr.is_test_account;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function public.partner_weekly_report() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('uny-partner-report', '30 8 * * 1', 'select public.partner_weekly_report()');
  end if;
end;
$$;

-- Places restantes d'une offre flash (null si pas de limite)
create or replace function public.deal_flash_remaining(p_deal uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case when d.flash_quantity is null or d.flash_ends_at is null then null
              else greatest(d.flash_quantity - (select count(*) from public.promo_codes c
                                                 where c.deal_id = d.id and c.created_at >= d.flash_started_at
                                                   and c.status <> 'cancelled'), 0)::integer end
    from public.deals d where d.id = p_deal;
$$;
revoke all on function public.deal_flash_remaining(uuid) from public;
grant execute on function public.deal_flash_remaining(uuid) to anon, authenticated;
