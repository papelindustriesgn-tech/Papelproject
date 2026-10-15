-- =============================================================================
-- UNY — schéma principal
-- Multi-pays dès le départ : countries → cities → universities → profiles.
-- Toutes les tables exposées sont protégées par RLS.
-- =============================================================================

create extension if not exists pg_trgm with schema extensions;

-- -----------------------------------------------------------------------------
-- Types
-- -----------------------------------------------------------------------------
create type public.user_role as enum ('student', 'admin');
create type public.verification_status as enum ('unverified', 'pending', 'verified');
create type public.verification_request_status as enum ('pending', 'approved', 'rejected');
create type public.document_type as enum ('student_card', 'enrollment_certificate', 'registration_certificate', 'other');
create type public.deal_category as enum ('restauration', 'shopping', 'transport', 'sport', 'sante', 'tech', 'formation', 'loisirs');
create type public.job_type as enum ('job', 'stage', 'alternance', 'freelance', 'benevolat', 'concours', 'bourse', 'formation');
create type public.housing_type as enum ('studio', 'chambre', 'colocation', 'appartement');
create type public.market_category as enum ('smartphones', 'informatique', 'livres', 'fournitures', 'mode', 'maison', 'transport', 'autres');
create type public.item_condition as enum ('neuf', 'comme_neuf', 'bon_etat', 'usage');
create type public.listing_status as enum ('active', 'sold', 'hidden', 'removed');
create type public.card_status as enum ('active', 'revoked');
create type public.view_entity as enum ('deal', 'job', 'housing', 'marketplace');

-- -----------------------------------------------------------------------------
-- Référentiels géographiques et établissements
-- -----------------------------------------------------------------------------
create table public.countries (
  code char(2) primary key,
  name text not null,
  currency char(3) not null,
  phone_prefix text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.cities (
  id integer generated always as identity primary key,
  country_code char(2) not null references public.countries(code),
  name text not null,
  slug text not null unique,
  districts text[] not null default '{}',
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);
create index cities_country_idx on public.cities(country_code);

create table public.universities (
  id integer generated always as identity primary key,
  country_code char(2) not null references public.countries(code),
  city_id integer references public.cities(id),
  name text not null,
  short_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (country_code, name)
);
create index universities_city_idx on public.universities(city_id);

-- -----------------------------------------------------------------------------
-- Profils
-- -----------------------------------------------------------------------------
create table public.uny_id_counters (
  country_code char(2) not null references public.countries(code),
  year integer not null,
  last_value integer not null default 0,
  primary key (country_code, year)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  uny_id text not null unique,
  first_name text not null check (char_length(first_name) between 1 and 60),
  last_name text not null check (char_length(last_name) between 1 and 60),
  birth_date date,
  gender text check (gender in ('female', 'male', 'other')),
  phone text unique,
  email text,
  university_id integer references public.universities(id),
  university_other text check (char_length(university_other) <= 120),
  field_of_study text check (char_length(field_of_study) <= 120),
  study_level text check (char_length(study_level) <= 40),
  city_id integer references public.cities(id),
  country_code char(2) not null default 'GN' references public.countries(code),
  avatar_url text,
  role public.user_role not null default 'student',
  verification_status public.verification_status not null default 'unverified',
  verified_at timestamptz,
  notify_email boolean not null default true,
  notify_deals boolean not null default true,
  notify_jobs boolean not null default true,
  is_test_account boolean not null default false,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_created_idx on public.profiles(created_at desc);
create index profiles_status_idx on public.profiles(verification_status);
create index profiles_last_seen_idx on public.profiles(last_seen_at desc);
create index profiles_university_idx on public.profiles(university_id);

-- Carte étudiante digitale
create table public.student_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  uny_id text not null unique,
  academic_year text not null,
  qr_token text not null unique default encode(extensions.gen_random_bytes(18), 'hex'),
  status public.card_status not null default 'active',
  issued_at timestamptz not null default now(),
  expires_at date not null,
  updated_at timestamptz not null default now()
);

-- Justificatifs étudiants
create table public.student_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  document_type public.document_type not null,
  document_path text not null,
  note text check (char_length(note) <= 500),
  status public.verification_request_status not null default 'pending',
  rejection_reason text check (char_length(rejection_reason) <= 500),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index student_verifications_user_idx on public.student_verifications(user_id, created_at desc);
create index student_verifications_status_idx on public.student_verifications(status, created_at);
create unique index student_verifications_one_pending on public.student_verifications(user_id) where status = 'pending';

-- -----------------------------------------------------------------------------
-- Partenaires & avantages
-- -----------------------------------------------------------------------------
create table public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  category public.deal_category not null,
  logo_url text,
  description text,
  city_id integer references public.cities(id),
  district text,
  address text,
  phone text,
  website text,
  is_demo boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 140),
  discount_label text not null check (char_length(discount_label) between 1 and 40),
  category public.deal_category not null,
  description text not null default '',
  conditions text not null default '',
  city_id integer references public.cities(id),
  district text,
  image_url text,
  valid_from date not null default current_date,
  valid_until date,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  requires_verification boolean not null default true,
  is_demo boolean not null default false,
  view_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index deals_active_idx on public.deals(is_active, created_at desc);
create index deals_category_idx on public.deals(category);
create index deals_partner_idx on public.deals(partner_id);
create index deals_title_trgm on public.deals using gin (title extensions.gin_trgm_ops);

create table public.deal_favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  deal_id uuid not null references public.deals(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, deal_id)
);
create index deal_favorites_deal_idx on public.deal_favorites(deal_id);

-- -----------------------------------------------------------------------------
-- Jobs & opportunités
-- -----------------------------------------------------------------------------
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  company_name text not null check (char_length(company_name) between 2 and 120),
  partner_id uuid references public.partners(id) on delete set null,
  title text not null check (char_length(title) between 3 and 140),
  type public.job_type not null,
  city_id integer references public.cities(id),
  location text,
  is_remote boolean not null default false,
  compensation text,
  description text not null default '',
  skills text[] not null default '{}',
  deadline date,
  apply_url text,
  apply_email text,
  logo_url text,
  is_active boolean not null default true,
  is_demo boolean not null default false,
  view_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index jobs_active_idx on public.jobs(is_active, created_at desc);
create index jobs_type_idx on public.jobs(type);
create index jobs_title_trgm on public.jobs using gin (title extensions.gin_trgm_ops);

create table public.job_favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, job_id)
);
create index job_favorites_job_idx on public.job_favorites(job_id);

create table public.job_applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  message text not null check (char_length(message) between 10 and 2000),
  created_at timestamptz not null default now(),
  unique (job_id, user_id)
);
create index job_applications_user_idx on public.job_applications(user_id);

-- -----------------------------------------------------------------------------
-- Logement
-- -----------------------------------------------------------------------------
create table public.housing (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 140),
  type public.housing_type not null,
  city_id integer references public.cities(id),
  district text not null,
  price_gnf bigint not null check (price_gnf >= 0),
  rooms integer not null default 1 check (rooms between 0 and 20),
  description text not null default '',
  amenities text[] not null default '{}',
  images text[] not null default '{}',
  available_from date,
  is_available boolean not null default true,
  contact_name text,
  contact_phone text,
  is_active boolean not null default true,
  is_demo boolean not null default false,
  view_count integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index housing_active_idx on public.housing(is_active, created_at desc);
create index housing_filters_idx on public.housing(type, price_gnf);

create table public.housing_favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  housing_id uuid not null references public.housing(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, housing_id)
);

-- -----------------------------------------------------------------------------
-- Marketplace
-- -----------------------------------------------------------------------------
create table public.marketplace_items (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 100),
  category public.market_category not null,
  price_gnf bigint not null check (price_gnf >= 0 and price_gnf <= 1000000000),
  is_negotiable boolean not null default false,
  condition public.item_condition not null default 'bon_etat',
  description text not null default '' check (char_length(description) <= 2000),
  city_id integer references public.cities(id),
  district text,
  contact_phone text,
  status public.listing_status not null default 'active',
  moderation_note text,
  is_demo boolean not null default false,
  view_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index marketplace_status_idx on public.marketplace_items(status, created_at desc);
create index marketplace_seller_idx on public.marketplace_items(seller_id, created_at desc);
create index marketplace_category_idx on public.marketplace_items(category);
create index marketplace_title_trgm on public.marketplace_items using gin (title extensions.gin_trgm_ops);

create table public.marketplace_images (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.marketplace_items(id) on delete cascade,
  url text not null,
  storage_path text,
  position smallint not null default 0,
  created_at timestamptz not null default now()
);
create index marketplace_images_item_idx on public.marketplace_images(item_id, position);

-- -----------------------------------------------------------------------------
-- Notifications & statistiques
-- -----------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, created_at desc);

create table public.content_views (
  id bigint generated always as identity primary key,
  entity_type public.view_entity not null,
  entity_id uuid not null,
  user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index content_views_type_idx on public.content_views(entity_type, created_at desc);
create index content_views_dedupe_idx on public.content_views(user_id, entity_id, created_at desc);

-- =============================================================================
-- Fonctions utilitaires
-- =============================================================================
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['profiles','student_cards','partners','deals','jobs','housing','marketplace_items'] loop
    execute format('create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- Année universitaire courante (rentrée en octobre en Guinée)
create or replace function public.current_academic_year()
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when extract(month from now()) >= 10
      then extract(year from now())::int || '-' || (extract(year from now())::int + 1)
    else (extract(year from now())::int - 1) || '-' || extract(year from now())::int
  end;
$$;

create or replace function public.academic_year_end()
returns date
language sql
stable
set search_path = ''
as $$
  select make_date(split_part(public.current_academic_year(), '-', 2)::int, 9, 30);
$$;

-- Génère un identifiant Uny : GN-2026-000145
create or replace function public.next_uny_id(p_country char(2))
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_year integer := extract(year from now())::int;
  v_value integer;
begin
  insert into public.uny_id_counters (country_code, year, last_value)
  values (p_country, v_year, 1)
  on conflict (country_code, year)
  do update set last_value = public.uny_id_counters.last_value + 1
  returning last_value into v_value;

  return format('%s-%s-%s', upper(p_country), v_year, lpad(v_value::text, 6, '0'));
end;
$$;
revoke all on function public.next_uny_id(char) from public, anon, authenticated;

-- =============================================================================
-- Création automatique du profil + carte à l'inscription
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_city_id integer := nullif(m->>'city_id', '')::integer;
  v_country char(2);
  v_uny_id text;
begin
  select c.country_code into v_country from public.cities c where c.id = v_city_id;
  v_country := coalesce(v_country, 'GN');
  v_uny_id := public.next_uny_id(v_country);

  insert into public.profiles (
    id, uny_id, first_name, last_name, birth_date, gender, phone, email,
    university_id, university_other, field_of_study, study_level, city_id,
    country_code, is_test_account
  ) values (
    new.id,
    v_uny_id,
    coalesce(nullif(trim(m->>'first_name'), ''), 'Étudiant'),
    coalesce(nullif(trim(m->>'last_name'), ''), 'Uny'),
    nullif(m->>'birth_date', '')::date,
    nullif(m->>'gender', ''),
    nullif(trim(m->>'phone'), ''),
    new.email,
    nullif(m->>'university_id', '')::integer,
    nullif(trim(m->>'university_other'), ''),
    nullif(trim(m->>'field_of_study'), ''),
    nullif(trim(m->>'study_level'), ''),
    v_city_id,
    v_country,
    -- uniquement positionnable côté serveur (app_metadata), jamais par l'utilisateur
    coalesce((new.raw_app_meta_data->>'is_test_account')::boolean, false)
  );

  insert into public.student_cards (user_id, uny_id, academic_year, expires_at)
  values (new.id, v_uny_id, public.current_academic_year(), public.academic_year_end());

  insert into public.notifications (user_id, type, title, body, link)
  values (
    new.id, 'welcome', 'Bienvenue sur Uny 👋',
    'Ta carte Uny est prête. Envoie ton justificatif pour obtenir le statut « Étudiant vérifié » et débloquer toutes les réductions.',
    '/profil/verification'
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Garde l'email du profil synchronisé avec auth.users
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- Empêche un étudiant vérifié de modifier son identité (sauf admin / service)
create or replace function public.protect_profile_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is not null and not public.is_admin() and old.verification_status = 'verified' then
    if new.first_name is distinct from old.first_name
      or new.last_name is distinct from old.last_name
      or new.birth_date is distinct from old.birth_date
      or new.university_id is distinct from old.university_id
      or new.university_other is distinct from old.university_other then
      raise exception 'Identité verrouillée après vérification. Contacte le support Uny pour la modifier.'
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_identity
  before update on public.profiles
  for each row execute function public.protect_profile_identity();

-- =============================================================================
-- Vérification étudiante
-- =============================================================================
create or replace function public.on_verification_submitted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
     set verification_status = 'pending'
   where id = new.user_id and verification_status <> 'verified';
  return new;
end;
$$;

create trigger student_verifications_submitted
  after insert on public.student_verifications
  for each row execute function public.on_verification_submitted();

-- Validation / refus par un administrateur (atomique)
create or replace function public.review_verification(
  p_verification_id uuid,
  p_approve boolean,
  p_reason text default null
)
returns public.student_verifications
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.student_verifications;
begin
  if not public.is_admin() then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;

  update public.student_verifications
     set status = case when p_approve then 'approved'::public.verification_request_status
                       else 'rejected'::public.verification_request_status end,
         rejection_reason = case when p_approve then null else nullif(trim(p_reason), '') end,
         reviewed_by = auth.uid(),
         reviewed_at = now()
   where id = p_verification_id and status = 'pending'
  returning * into v;

  if v.id is null then
    raise exception 'Demande introuvable ou déjà traitée' using errcode = 'P0002';
  end if;

  if p_approve then
    update public.profiles
       set verification_status = 'verified', verified_at = now()
     where id = v.user_id;

    update public.student_cards
       set academic_year = public.current_academic_year(),
           expires_at = public.academic_year_end(),
           status = 'active'
     where user_id = v.user_id;

    insert into public.notifications (user_id, type, title, body, link)
    values (v.user_id, 'verification_approved', 'Tu es vérifié ✅',
            'Ton statut étudiant est confirmé. Ta carte Uny affiche désormais « Étudiant vérifié ».', '/carte');
  else
    update public.profiles
       set verification_status = 'unverified'
     where id = v.user_id and verification_status = 'pending';

    insert into public.notifications (user_id, type, title, body, link)
    values (v.user_id, 'verification_rejected', 'Justificatif refusé',
            coalesce('Motif : ' || nullif(trim(p_reason), ''), 'Ton justificatif n''a pas pu être validé.') ||
            ' Tu peux envoyer un nouveau document.', '/profil/verification');
  end if;

  return v;
end;
$$;
revoke all on function public.review_verification(uuid, boolean, text) from public, anon;
grant execute on function public.review_verification(uuid, boolean, text) to authenticated;

-- Changement de rôle (admin uniquement)
create or replace function public.admin_set_role(p_user_id uuid, p_role public.user_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() and p_role <> 'admin' then
    raise exception 'Tu ne peux pas retirer ton propre accès administrateur.';
  end if;
  update public.profiles set role = p_role where id = p_user_id;
end;
$$;
revoke all on function public.admin_set_role(uuid, public.user_role) from public, anon;
grant execute on function public.admin_set_role(uuid, public.user_role) to authenticated;

-- Révocation / réactivation d'une carte ou d'un statut (admin)
create or replace function public.admin_set_verification(p_user_id uuid, p_status public.verification_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  update public.profiles
     set verification_status = p_status,
         verified_at = case when p_status = 'verified' then now() else null end
   where id = p_user_id;
  if p_status = 'verified' then
    update public.student_cards
       set academic_year = public.current_academic_year(), expires_at = public.academic_year_end(), status = 'active'
     where user_id = p_user_id;
  end if;
end;
$$;
revoke all on function public.admin_set_verification(uuid, public.verification_status) from public, anon;
grant execute on function public.admin_set_verification(uuid, public.verification_status) to authenticated;

-- =============================================================================
-- Vérification publique d'une carte (QR code)
-- Ne renvoie que le strict nécessaire pour qu'un partenaire contrôle la carte.
-- =============================================================================
create or replace function public.verify_card(p_token text)
returns table (
  uny_id text,
  first_name text,
  last_name text,
  avatar_url text,
  university text,
  field_of_study text,
  academic_year text,
  verification_status public.verification_status,
  card_status public.card_status,
  expires_at date
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.uny_id, p.first_name, p.last_name, p.avatar_url,
         coalesce(u.name, p.university_other), p.field_of_study,
         c.academic_year, p.verification_status, c.status, c.expires_at
    from public.student_cards c
    join public.profiles p on p.id = c.user_id
    left join public.universities u on u.id = p.university_id
   where c.qr_token = p_token
   limit 1;
$$;
grant execute on function public.verify_card(text) to anon, authenticated;

-- =============================================================================
-- Consultations (statistiques) & activité
-- =============================================================================
create or replace function public.track_view(p_type public.view_entity, p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  -- 1 vue par utilisateur et par contenu toutes les 30 minutes
  if v_uid is not null and exists (
    select 1 from public.content_views
     where user_id = v_uid and entity_id = p_id and created_at > now() - interval '30 minutes'
  ) then
    return;
  end if;

  insert into public.content_views (entity_type, entity_id, user_id) values (p_type, p_id, v_uid);

  case p_type
    when 'deal' then update public.deals set view_count = view_count + 1 where id = p_id;
    when 'job' then update public.jobs set view_count = view_count + 1 where id = p_id;
    when 'housing' then update public.housing set view_count = view_count + 1 where id = p_id;
    when 'marketplace' then update public.marketplace_items set view_count = view_count + 1 where id = p_id;
  end case;
end;
$$;
revoke all on function public.track_view(public.view_entity, uuid) from public, anon;
grant execute on function public.track_view(public.view_entity, uuid) to authenticated;

create or replace function public.touch_last_seen()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles
     set last_seen_at = now()
   where id = auth.uid()
     and (last_seen_at is null or last_seen_at < now() - interval '10 minutes');
$$;
revoke all on function public.touch_last_seen() from public, anon;
grant execute on function public.touch_last_seen() to authenticated;

-- Statistiques du dashboard admin (comptes de test exclus des chiffres réels)
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
    'users_total', (select count(*) from public.profiles where not is_test_account),
    'users_verified', (select count(*) from public.profiles where not is_test_account and verification_status = 'verified'),
    'users_pending', (select count(*) from public.profiles where not is_test_account and verification_status = 'pending'),
    'signups_today', (select count(*) from public.profiles where not is_test_account and created_at >= date_trunc('day', now())),
    'signups_week', (select count(*) from public.profiles where not is_test_account and created_at >= now() - interval '7 days'),
    'active_week', (select count(*) from public.profiles where not is_test_account and last_seen_at >= now() - interval '7 days'),
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
    'signups_by_day', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'count', coalesce(c.n, 0)) order by d), '[]'::jsonb)
        from generate_series(date_trunc('day', now()) - interval '13 days', date_trunc('day', now()), interval '1 day') d
        left join (
          select date_trunc('day', created_at) as day, count(*) as n
            from public.profiles where not is_test_account
           group by 1
        ) c on c.day = d
    )
  ) into result;

  return result;
end;
$$;
revoke all on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;

-- =============================================================================
-- Marketplace : champs protégés
-- =============================================================================
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
    if new.status not in ('active', 'hidden') then
      new.status := 'active';
    end if;
  else
    new.seller_id := old.seller_id;
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

create trigger marketplace_items_protect
  before insert or update on public.marketplace_items
  for each row execute function public.protect_marketplace_item();

-- Notification quand la modération retire une annonce
create or replace function public.on_marketplace_moderated()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'removed' and old.status <> 'removed' and new.seller_id is not null then
    insert into public.notifications (user_id, type, title, body, link)
    values (new.seller_id, 'marketplace_removed', 'Annonce retirée',
            'Ton annonce « ' || new.title || ' » a été retirée par la modération.' ||
            coalesce(' Motif : ' || new.moderation_note, ''), '/marketplace/mes-annonces');
  end if;
  return new;
end;
$$;

create trigger marketplace_items_moderated
  after update of status on public.marketplace_items
  for each row execute function public.on_marketplace_moderated();

-- Seller public (prénom + initiale, établissement, statut) pour la marketplace
create or replace function public.seller_public_info(p_ids uuid[])
returns table (id uuid, display_name text, university text, verification_status public.verification_status, avatar_url text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id,
         p.first_name || ' ' || left(p.last_name, 1) || '.',
         coalesce(u.short_name, u.name, p.university_other),
         p.verification_status,
         p.avatar_url
    from public.profiles p
    left join public.universities u on u.id = p.university_id
   where p.id = any(p_ids);
$$;
revoke all on function public.seller_public_info(uuid[]) from public, anon;
grant execute on function public.seller_public_info(uuid[]) to authenticated;

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.countries enable row level security;
alter table public.cities enable row level security;
alter table public.universities enable row level security;
alter table public.uny_id_counters enable row level security;
alter table public.profiles enable row level security;
alter table public.student_cards enable row level security;
alter table public.student_verifications enable row level security;
alter table public.partners enable row level security;
alter table public.deals enable row level security;
alter table public.deal_favorites enable row level security;
alter table public.jobs enable row level security;
alter table public.job_favorites enable row level security;
alter table public.job_applications enable row level security;
alter table public.housing enable row level security;
alter table public.housing_favorites enable row level security;
alter table public.marketplace_items enable row level security;
alter table public.marketplace_images enable row level security;
alter table public.notifications enable row level security;
alter table public.content_views enable row level security;

-- Référentiels : lecture publique, écriture admin
create policy "countries_read" on public.countries for select using (true);
create policy "countries_admin" on public.countries for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "cities_read" on public.cities for select using (true);
create policy "cities_admin" on public.cities for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "universities_read" on public.universities for select using (true);
create policy "universities_admin" on public.universities for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Profils
create policy "profiles_select_own" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke insert, update, delete on public.profiles from anon, authenticated;
revoke select on public.profiles from anon;
grant update (first_name, last_name, birth_date, gender, phone, university_id, university_other,
              field_of_study, study_level, city_id, avatar_url, notify_email, notify_deals, notify_jobs)
  on public.profiles to authenticated;

-- Cartes
create policy "cards_select_own" on public.student_cards for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
revoke insert, update, delete on public.student_cards from anon, authenticated;
revoke select on public.student_cards from anon;

-- Justificatifs
create policy "verifications_select" on public.student_verifications for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy "verifications_insert_own" on public.student_verifications for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'pending'
    and reviewed_by is null and reviewed_at is null and rejection_reason is null
    and document_path like (select auth.uid())::text || '/%'
  );
revoke update, delete on public.student_verifications from anon, authenticated;
revoke select, insert on public.student_verifications from anon;

-- Partenaires / avantages / jobs / logements : lecture publique des contenus actifs
create policy "partners_read" on public.partners for select using (is_active or public.is_admin());
create policy "partners_admin" on public.partners for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "deals_read" on public.deals for select using (is_active or public.is_admin());
create policy "deals_admin" on public.deals for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "jobs_read" on public.jobs for select using (is_active or public.is_admin());
create policy "jobs_admin" on public.jobs for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "housing_read" on public.housing for select using (is_active or public.is_admin());
create policy "housing_admin" on public.housing for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Les visiteurs non connectés ne voient pas les coordonnées des annonces logement
revoke select on public.housing from anon;
grant select (id, title, type, city_id, district, price_gnf, rooms, description, amenities, images,
              available_from, is_available, is_active, is_demo, view_count, created_at, updated_at)
  on public.housing to anon;

-- Favoris
create policy "deal_fav_own" on public.deal_favorites for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "job_fav_own" on public.job_favorites for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "housing_fav_own" on public.housing_favorites for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.deal_favorites, public.job_favorites, public.housing_favorites from anon;

-- Candidatures
create policy "applications_select" on public.job_applications for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy "applications_insert_own" on public.job_applications for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "applications_delete_own" on public.job_applications for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
revoke all on public.job_applications from anon;
revoke update on public.job_applications from authenticated;

-- Marketplace
create policy "market_read" on public.marketplace_items for select
  using (status = 'active' or seller_id = (select auth.uid()) or public.is_admin());
create policy "market_insert_own" on public.marketplace_items for insert to authenticated
  with check (seller_id = (select auth.uid()) or public.is_admin());
create policy "market_update_own" on public.marketplace_items for update to authenticated
  using (seller_id = (select auth.uid()) or public.is_admin())
  with check (seller_id = (select auth.uid()) or public.is_admin());
create policy "market_delete_own" on public.marketplace_items for delete to authenticated
  using (seller_id = (select auth.uid()) or public.is_admin());
revoke insert, update, delete on public.marketplace_items from anon;
revoke select on public.marketplace_items from anon;
grant select (id, title, category, price_gnf, is_negotiable, condition, description, city_id, district,
              status, is_demo, view_count, created_at, updated_at)
  on public.marketplace_items to anon;

create policy "market_images_read" on public.marketplace_images for select
  using (exists (
    select 1 from public.marketplace_items i
     where i.id = item_id and (i.status = 'active' or i.seller_id = (select auth.uid()) or public.is_admin())
  ));
create policy "market_images_write" on public.marketplace_images for all to authenticated
  using (exists (select 1 from public.marketplace_items i where i.id = item_id and (i.seller_id = (select auth.uid()) or public.is_admin())))
  with check (exists (select 1 from public.marketplace_items i where i.id = item_id and (i.seller_id = (select auth.uid()) or public.is_admin())));
revoke insert, update, delete on public.marketplace_images from anon;

-- Notifications
create policy "notifications_select_own" on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy "notifications_update_own" on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "notifications_delete_own" on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));
create policy "notifications_admin_insert" on public.notifications for insert to authenticated
  with check (public.is_admin());
revoke all on public.notifications from anon;
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

-- Statistiques / compteurs : admin uniquement
create policy "views_admin" on public.content_views for select to authenticated using (public.is_admin());
revoke all on public.content_views from anon;
revoke insert, update, delete on public.content_views from authenticated;
revoke all on public.uny_id_counters from anon, authenticated;

-- =============================================================================
-- Stockage (Supabase Storage)
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', true, 2097152, array['image/jpeg','image/png','image/webp']),
  ('verification-docs', 'verification-docs', false, 5242880, array['image/jpeg','image/png','image/webp','application/pdf']),
  ('marketplace', 'marketplace', true, 3145728, array['image/jpeg','image/png','image/webp']),
  ('content', 'content', true, 3145728, array['image/jpeg','image/png','image/webp','image/svg+xml'])
on conflict (id) do nothing;

-- Avatars : chacun dans son dossier {uid}/
create policy "avatars_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Justificatifs : privés. Lecture par le propriétaire et les admins uniquement.
create policy "docs_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "docs_select_own_or_admin" on storage.objects for select to authenticated
  using (bucket_id = 'verification-docs' and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin()));

-- Marketplace : photos dans {uid}/
create policy "market_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'marketplace' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "market_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'marketplace' and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin()));

-- Contenus éditoriaux (logos partenaires, photos logement) : admin
create policy "content_admin_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'content' and public.is_admin());
create policy "content_admin_update" on storage.objects for update to authenticated
  using (bucket_id = 'content' and public.is_admin());
create policy "content_admin_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'content' and public.is_admin());
