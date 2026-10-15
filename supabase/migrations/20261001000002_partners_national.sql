-- =============================================================================
-- UNY — couverture nationale + espace partenaire
--   • toutes les villes de Guinée actives
--   • comptes partenaires (membres d'un partenaire) : offres, jobs, logements,
--     articles marketplace, validation des cartes étudiantes (scan QR)
--   • demandes « Devenir partenaire »
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Couverture nationale
-- -----------------------------------------------------------------------------
update public.cities set is_active = true where country_code = 'GN';

insert into public.cities (country_code, name, slug, is_active, districts) values
  ('GN', 'Coyah', 'coyah', true, '{}'),
  ('GN', 'Dubréka', 'dubreka', true, '{}'),
  ('GN', 'Kamsar', 'kamsar', true, '{}'),
  ('GN', 'Fria', 'fria', true, '{}'),
  ('GN', 'Pita', 'pita', true, '{}'),
  ('GN', 'Dalaba', 'dalaba', true, '{}'),
  ('GN', 'Faranah', 'faranah', true, '{}'),
  ('GN', 'Kissidougou', 'kissidougou', true, '{}'),
  ('GN', 'Siguiri', 'siguiri', true, '{}'),
  ('GN', 'Guéckédou', 'gueckedou', true, '{}'),
  ('GN', 'Macenta', 'macenta', true, '{}')
on conflict (slug) do update set is_active = true;

insert into public.universities (country_code, city_id, name, short_name)
select 'GN', c.id, 'Institut Supérieur Agronomique et Vétérinaire de Faranah', 'ISAV Faranah'
  from public.cities c where c.slug = 'faranah'
on conflict (country_code, name) do nothing;

create index if not exists deals_city_idx on public.deals(city_id);
create index if not exists jobs_city_idx on public.jobs(city_id);
create index if not exists housing_city_idx on public.housing(city_id);
create index if not exists marketplace_city_idx on public.marketplace_items(city_id);
create index if not exists profiles_city_idx on public.profiles(city_id);

-- -----------------------------------------------------------------------------
-- Membres d'un partenaire
-- -----------------------------------------------------------------------------
create table public.partner_members (
  partner_id uuid not null references public.partners(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (partner_id, user_id)
);
create index partner_members_user_idx on public.partner_members(user_id);

create or replace function public.is_partner_member(p_partner uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_partner is not null and exists (
    select 1 from public.partner_members m
     where m.partner_id = p_partner and m.user_id = auth.uid()
  );
$$;
revoke all on function public.is_partner_member(uuid) from public, anon;
grant execute on function public.is_partner_member(uuid) to authenticated;

alter table public.partner_members enable row level security;
create policy "partner_members_read" on public.partner_members for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy "partner_members_admin" on public.partner_members for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
revoke all on public.partner_members from anon;

-- Liens partenaire sur les logements et les articles marketplace
alter table public.housing add column partner_id uuid references public.partners(id) on delete cascade;
alter table public.marketplace_items add column partner_id uuid references public.partners(id) on delete cascade;
create index housing_partner_idx on public.housing(partner_id);
create index marketplace_partner_idx on public.marketplace_items(partner_id);
create index jobs_partner_idx on public.jobs(partner_id);
grant select (partner_id) on public.housing to anon;
grant select (partner_id) on public.marketplace_items to anon;

-- -----------------------------------------------------------------------------
-- Droits des membres sur les contenus de leur partenaire
-- -----------------------------------------------------------------------------
create policy "partners_member_read" on public.partners for select to authenticated
  using (public.is_partner_member(id));
create policy "partners_member_update" on public.partners for update to authenticated
  using (public.is_partner_member(id)) with check (public.is_partner_member(id));

create policy "deals_member_read" on public.deals for select to authenticated
  using (public.is_partner_member(partner_id));
create policy "deals_member_insert" on public.deals for insert to authenticated
  with check (public.is_partner_member(partner_id));
create policy "deals_member_update" on public.deals for update to authenticated
  using (public.is_partner_member(partner_id)) with check (public.is_partner_member(partner_id));
create policy "deals_member_delete" on public.deals for delete to authenticated
  using (public.is_partner_member(partner_id));

create policy "jobs_member_read" on public.jobs for select to authenticated
  using (public.is_partner_member(partner_id));
create policy "jobs_member_insert" on public.jobs for insert to authenticated
  with check (public.is_partner_member(partner_id));
create policy "jobs_member_update" on public.jobs for update to authenticated
  using (public.is_partner_member(partner_id)) with check (public.is_partner_member(partner_id));
create policy "jobs_member_delete" on public.jobs for delete to authenticated
  using (public.is_partner_member(partner_id));

create policy "housing_member_read" on public.housing for select to authenticated
  using (public.is_partner_member(partner_id));
create policy "housing_member_insert" on public.housing for insert to authenticated
  with check (public.is_partner_member(partner_id));
create policy "housing_member_update" on public.housing for update to authenticated
  using (public.is_partner_member(partner_id)) with check (public.is_partner_member(partner_id));
create policy "housing_member_delete" on public.housing for delete to authenticated
  using (public.is_partner_member(partner_id));

create policy "market_member_read" on public.marketplace_items for select to authenticated
  using (public.is_partner_member(partner_id));
create policy "market_member_update" on public.marketplace_items for update to authenticated
  using (public.is_partner_member(partner_id)) with check (public.is_partner_member(partner_id));
create policy "market_member_delete" on public.marketplace_items for delete to authenticated
  using (public.is_partner_member(partner_id));
create policy "market_images_member_write" on public.marketplace_images for all to authenticated
  using (exists (select 1 from public.marketplace_items i where i.id = item_id and public.is_partner_member(i.partner_id)))
  with check (exists (select 1 from public.marketplace_items i where i.id = item_id and public.is_partner_member(i.partner_id)));

-- Champs réservés à l'administration (mise en avant, démo, compteurs, statut du partenaire)
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
    end if;
    if tg_table_name = 'housing' then
      new.created_by := auth.uid();
    end if;
  else
    new.is_demo := old.is_demo;
    new.view_count := old.view_count;
    if tg_table_name = 'deals' then
      new.is_featured := old.is_featured;
    end if;
  end if;
  return new;
end;
$$;

create trigger partners_protect before update on public.partners
  for each row execute function public.protect_partner_content();
create trigger deals_protect before insert or update on public.deals
  for each row execute function public.protect_partner_content();
create trigger jobs_protect before insert or update on public.jobs
  for each row execute function public.protect_partner_content();
create trigger housing_protect before insert or update on public.housing
  for each row execute function public.protect_partner_content();

-- Marketplace : un article « partenaire » ne peut être rattaché qu'à son propre partenaire
create or replace function public.protect_marketplace_item()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.seller_id := auth.uid();
    new.is_demo := false;
    new.view_count := 0;
    new.moderation_note := null;
    if new.partner_id is not null and not public.is_partner_member(new.partner_id) then
      raise exception 'Partenaire non autorisé.' using errcode = '42501';
    end if;
    if new.status not in ('active', 'hidden') then
      new.status := 'active';
    end if;
  else
    new.seller_id := old.seller_id;
    new.partner_id := old.partner_id;
    new.is_demo := old.is_demo;
    new.view_count := old.view_count;
    new.moderation_note := old.moderation_note;
    if old.status = 'removed' then
      raise exception 'Cette annonce a été retirée par la modération.' using errcode = 'P0001';
    end if;
    if new.status = 'removed' then
      new.status := old.status;
    end if;
  end if;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Validation des cartes étudiantes par les partenaires
-- -----------------------------------------------------------------------------
create table public.card_validations (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  deal_id uuid references public.deals(id) on delete set null,
  student_id uuid not null references public.profiles(id) on delete cascade,
  scanned_by uuid references public.profiles(id) on delete set null,
  -- Copie de ce que le partenaire a vu au moment du scan (historique lisible sans accès aux profils)
  student_name text not null,
  student_uny_id text not null,
  outcome text not null check (outcome in ('valid', 'unverified', 'expired', 'revoked')),
  eligible boolean not null default false,
  created_at timestamptz not null default now()
);
create index card_validations_partner_idx on public.card_validations(partner_id, created_at desc);
create index card_validations_student_idx on public.card_validations(student_id, created_at desc);
create index card_validations_deal_idx on public.card_validations(deal_id, student_id, created_at);

alter table public.card_validations enable row level security;
create policy "validations_read" on public.card_validations for select to authenticated
  using (student_id = (select auth.uid()) or public.is_partner_member(partner_id) or public.is_admin());
revoke all on public.card_validations from anon;
revoke insert, update, delete on public.card_validations from authenticated;

-- Vérifie une carte (jeton du QR code ou numéro Uny) et enregistre le passage.
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
         p.first_name, p.last_name, p.avatar_url, coalesce(u.name, p.university_other),
         p.field_of_study, p.verification_status
    into v_user, v_uny_id, v_year, v_card_status, v_expires,
         v_first, v_last, v_avatar, v_university, v_field, v_status
    from public.student_cards c
    join public.profiles p on p.id = c.user_id
    left join public.universities u on u.id = p.university_id
   where (p_token is not null and c.qr_token = p_token)
      or (p_token is null and p_uny_id is not null and c.uny_id = upper(trim(p_uny_id)))
   limit 1;

  if v_user is null then
    return jsonb_build_object('found', false);
  end if;

  v_outcome := case
    when v_card_status = 'revoked' then 'revoked'
    when v_expires < current_date then 'expired'
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
    'uses_today', v_uses
  );
end;
$$;
revoke all on function public.partner_validate_card(uuid, text, text, uuid) from public, anon;
grant execute on function public.partner_validate_card(uuid, text, text, uuid) to authenticated;

-- Candidatures reçues sur les offres d'emploi d'un partenaire
create or replace function public.partner_job_applications(p_job uuid)
returns table (
  id uuid,
  message text,
  created_at timestamptz,
  first_name text,
  last_name text,
  email text,
  phone text,
  field_of_study text,
  study_level text,
  university text,
  verification_status public.verification_status
)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.message, a.created_at, p.first_name, p.last_name, p.email, p.phone,
         p.field_of_study, p.study_level, coalesce(u.name, p.university_other), p.verification_status
    from public.job_applications a
    join public.jobs j on j.id = a.job_id
    join public.profiles p on p.id = a.user_id
    left join public.universities u on u.id = p.university_id
   where a.job_id = p_job
     and (public.is_partner_member(j.partner_id) or public.is_admin())
   order by a.created_at desc;
$$;
revoke all on function public.partner_job_applications(uuid) from public, anon;
grant execute on function public.partner_job_applications(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Demandes « Devenir partenaire » (formulaire public, traitées par l'admin)
-- -----------------------------------------------------------------------------
create table public.partner_applications (
  id uuid primary key default gen_random_uuid(),
  business_name text not null check (char_length(business_name) between 2 and 120),
  category public.deal_category not null,
  city_id integer references public.cities(id),
  contact_name text not null check (char_length(contact_name) between 2 and 120),
  phone text not null check (char_length(phone) between 6 and 30),
  email text not null check (char_length(email) between 5 and 200),
  offer text check (char_length(offer) <= 1000),
  wants text[] not null default '{}'
    check (wants <@ array['avantages', 'jobs', 'logements', 'marketplace']::text[]),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  partner_id uuid references public.partners(id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index partner_applications_status_idx on public.partner_applications(status, created_at desc);
alter table public.partner_applications enable row level security;
create policy "partner_applications_admin" on public.partner_applications for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
revoke all on public.partner_applications from anon;

-- -----------------------------------------------------------------------------
-- Statistiques admin : les comptes partenaires ne sont pas des étudiants
-- -----------------------------------------------------------------------------
create or replace function public.admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'users_total', (select count(*) from public.profiles where not is_test_account and role <> 'partner'),
    'users_verified', (select count(*) from public.profiles where not is_test_account and role <> 'partner' and verification_status = 'verified'),
    'users_pending', (select count(*) from public.profiles where not is_test_account and role <> 'partner' and verification_status = 'pending'),
    'signups_today', (select count(*) from public.profiles where not is_test_account and role <> 'partner' and created_at >= date_trunc('day', now())),
    'signups_week', (select count(*) from public.profiles where not is_test_account and role <> 'partner' and created_at >= now() - interval '7 days'),
    'active_week', (select count(*) from public.profiles where not is_test_account and role <> 'partner' and last_seen_at >= now() - interval '7 days'),
    'test_accounts', (select count(*) from public.profiles where is_test_account),
    'verifications_pending', (select count(*) from public.student_verifications where status = 'pending'),
    'verifications_approved', (select count(*) from public.student_verifications where status = 'approved'),
    'verifications_rejected', (select count(*) from public.student_verifications where status = 'rejected'),
    'deals_active', (select count(*) from public.deals where is_active),
    'partners_total', (select count(*) from public.partners),
    'jobs_active', (select count(*) from public.jobs where is_active),
    'housing_active', (select count(*) from public.housing where is_active),
    'marketplace_active', (select count(*) from public.marketplace_items where status = 'active'),
    'marketplace_total', (select count(*) from public.marketplace_items),
    'applications_total', (select count(*) from public.job_applications),
    'views_deal', (select count(*) from public.content_views where entity_type = 'deal'),
    'views_job', (select count(*) from public.content_views where entity_type = 'job'),
    'views_housing', (select count(*) from public.content_views where entity_type = 'housing'),
    'views_marketplace', (select count(*) from public.content_views where entity_type = 'marketplace'),
    'card_validations_week', (select count(*) from public.card_validations where eligible and created_at >= now() - interval '7 days'),
    'partner_applications_pending', (select count(*) from public.partner_applications where status = 'pending'),
    'signups_by_day', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'count', coalesce(c.n, 0)) order by d), '[]'::jsonb)
        from generate_series(date_trunc('day', now()) - interval '13 days', date_trunc('day', now()), interval '1 day') d
        left join (
          select date_trunc('day', created_at) as day, count(*) as n
            from public.profiles where not is_test_account and role <> 'partner'
           group by 1
        ) c on c.day = d
    )
  ) into result;

  return result;
end;
$$;
