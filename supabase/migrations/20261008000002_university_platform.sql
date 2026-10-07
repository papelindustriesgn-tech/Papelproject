-- =============================================================================
-- UNY — universités partenaires & identité étudiante
--   • portail université (membres, fiche, branding, template de carte versionné)
--   • inscriptions étudiantes vérifiées (API, import, portail, justificatif, manuel)
--   • listes d'étudiants importées sous forme d'empreintes (HMAC), jamais en clair
--   • connecteurs API (configuration non secrète + accord obligatoire avant activation)
--   • vérification du BAC (preuve minimale), emails étudiants, journal d'audit
--   • nouvel identifiant Uny non séquentiel : UNY-GN-2026-7K3QX9
-- Principe : vérifier auprès de la source, conserver le minimum comme preuve.
-- =============================================================================

create type public.enrollment_status as enum ('pending', 'verified', 'rejected', 'expired', 'manual_review');
create type public.verification_method as enum ('api', 'import', 'portal', 'document', 'manual');
create type public.student_email_status as enum ('pending', 'active', 'suspended', 'alumni', 'disabled');

-- Slug ASCII (accents retirés) : « Université Gamal Abdel Nasser » → universite-gamal-abdel-nasser
create or replace function public.slugify(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(both '-' from regexp_replace(
    translate(lower(coalesce(p, '')),
      'àáâãäåāçćčďèéêëēęěìíîïīłñńňòóôõöøōŕřśšťùúûüūůýÿžźżœæ',
      'aaaaaaacccdeeeeeeeiiiiilnnnooooooorrsstuuuuuuyyzzzoa'),
    '[^a-z0-9]+', '-', 'g'));
$$;

-- Fin de validité d'une année universitaire « 2026-2027 » → 30/09/2027
create or replace function public.academic_year_end_of(p_year text)
returns date
language sql
immutable
set search_path = ''
as $$
  select make_date(split_part(p_year, '-', 2)::int, 9, 30);
$$;

-- -----------------------------------------------------------------------------
-- Établissements
-- -----------------------------------------------------------------------------
alter table public.universities
  add column slug text,
  add column partner_status text not null default 'listed'
    check (partner_status in ('listed', 'pending', 'partner', 'suspended')),
  add column website text check (website is null or website ~* '^https?://[^ ]+$'),
  add column contact_email text check (contact_email is null or contact_email ~* '^[^@ ]+@[^@ ]+\.[a-z]{2,}$'),
  add column faculties text[] not null default '{}' check (cardinality(faculties) <= 60),
  add column approved_at timestamptz,
  add column updated_at timestamptz not null default now();

update public.universities set slug = public.slugify(coalesce(short_name, name));
-- Doublons éventuels de sigle : suffixe par identifiant
update public.universities u set slug = u.slug || '-' || u.id
 where exists (select 1 from public.universities o where o.slug = u.slug and o.id < u.id);
alter table public.universities alter column slug set not null;
create unique index universities_slug_key on public.universities(slug);

create trigger universities_updated_at before update on public.universities
  for each row execute function public.set_updated_at();

create or replace function public.universities_default_slug()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug := public.slugify(coalesce(new.short_name, new.name));
    if exists (select 1 from public.universities where slug = new.slug) then
      new.slug := new.slug || '-' || substr(md5(random()::text), 1, 4);
    end if;
  end if;
  return new;
end;
$$;
create trigger universities_slug before insert on public.universities
  for each row execute function public.universities_default_slug();

-- Comptes du portail université
create table public.university_members (
  university_id integer not null references public.universities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (university_id, user_id)
);
create index university_members_user_idx on public.university_members(user_id);

-- Membre d'une université dont l'accès n'est pas suspendu
create or replace function public.is_university_member(p_university integer)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_university is not null and exists (
    select 1 from public.university_members m
      join public.universities u on u.id = m.university_id
     where m.university_id = p_university and m.user_id = auth.uid()
       and u.partner_status in ('pending', 'partner')
  );
$$;
revoke all on function public.is_university_member(integer) from public, anon;
grant execute on function public.is_university_member(integer) to authenticated;

alter table public.university_members enable row level security;
create policy "university_members_read" on public.university_members for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy "university_members_admin" on public.university_members for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
revoke all on public.university_members from anon;

create policy "universities_member_update" on public.universities for update to authenticated
  using (public.is_university_member(id)) with check (public.is_university_member(id));

-- Les membres modifient leur fiche, jamais le statut de partenariat ni le nom de référence
create or replace function public.protect_university()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  new.id := old.id;
  new.name := old.name;
  new.slug := old.slug;
  new.country_code := old.country_code;
  new.is_active := old.is_active;
  new.partner_status := old.partner_status;
  new.approved_at := old.approved_at;
  return new;
end;
$$;
create trigger universities_protect before update on public.universities
  for each row execute function public.protect_university();

-- -----------------------------------------------------------------------------
-- Identité visuelle et template de carte (aucune carte codée à la main)
-- -----------------------------------------------------------------------------
create table public.university_branding (
  university_id integer primary key references public.universities(id) on delete cascade,
  official_name text check (char_length(official_name) between 2 and 200),
  logo_url text check (
    logo_url is null
    or logo_url ~ '^https?://[^/]+/storage/v1/object/public/(marketplace|content)/'
  ),
  primary_color text not null default '#1e3a8a' check (primary_color ~ '^#[0-9a-fA-F]{6}$'),
  secondary_color text not null default '#2563eb' check (secondary_color ~ '^#[0-9a-fA-F]{6}$'),
  accent_color text not null default '#f59e0b' check (accent_color ~ '^#[0-9a-fA-F]{6}$'),
  motto text check (char_length(motto) <= 120),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);
create trigger university_branding_updated_at before update on public.university_branding
  for each row execute function public.set_updated_at();

alter table public.university_branding enable row level security;
create policy "branding_read" on public.university_branding for select using (true);
create policy "branding_write" on public.university_branding for all to authenticated
  using (public.is_university_member(university_id) or public.is_admin())
  with check (public.is_university_member(university_id) or public.is_admin());

-- Champs optionnels qu'une université peut afficher sur la carte. Les éléments Uny
-- (nom, photo, identifiant Uny, QR code, statut de vérification) sont toujours présents.
create or replace function public.card_template_fields()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array['faculty', 'department', 'program', 'study_level', 'student_number', 'academic_year', 'expires_at']::text[];
$$;

create table public.university_card_templates (
  id uuid primary key default gen_random_uuid(),
  university_id integer not null references public.universities(id) on delete cascade,
  version integer not null,
  layout text not null default 'classic' check (layout in ('classic', 'band', 'minimal')),
  fields text[] not null default array['faculty', 'program', 'study_level', 'student_number', 'academic_year', 'expires_at']::text[]
    check (fields <@ public.card_template_fields() and cardinality(fields) <= 7),
  labels jsonb not null default '{}'::jsonb check (jsonb_typeof(labels) = 'object'),
  is_active boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (university_id, version)
);
create unique index card_templates_one_active on public.university_card_templates(university_id) where is_active;

alter table public.university_card_templates enable row level security;
create policy "card_templates_read" on public.university_card_templates for select using (true);
revoke insert, update, delete on public.university_card_templates from anon, authenticated;

-- Publie une nouvelle version du template (l'historique est conservé)
create or replace function public.publish_card_template(
  p_university integer,
  p_layout text,
  p_fields text[],
  p_labels jsonb default '{}'::jsonb
)
returns public.university_card_templates
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version integer;
  v_key text;
  r public.university_card_templates;
begin
  if not (public.is_university_member(p_university) or public.is_admin()) then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  for v_key in select jsonb_object_keys(coalesce(p_labels, '{}'::jsonb)) loop
    if not (v_key = any (public.card_template_fields()))
       or jsonb_typeof(p_labels -> v_key) <> 'string'
       or char_length(p_labels ->> v_key) > 30 then
      raise exception 'Libellé invalide : %', v_key using errcode = 'P0001';
    end if;
  end loop;

  select coalesce(max(version), 0) + 1 into v_version
    from public.university_card_templates where university_id = p_university;
  update public.university_card_templates set is_active = false
   where university_id = p_university and is_active;
  insert into public.university_card_templates (university_id, version, layout, fields, labels, is_active, created_by)
  values (p_university, v_version, p_layout, coalesce(p_fields, '{}'), coalesce(p_labels, '{}'::jsonb), true, auth.uid())
  returning * into r;

  insert into public.audit_log (actor_id, university_id, action, details)
  values (auth.uid(), p_university, 'card_template.published', jsonb_build_object('version', v_version));
  return r;
end;
$$;

-- -----------------------------------------------------------------------------
-- Journal d'audit (actions sensibles : vérifications, imports, connecteurs, emails)
-- -----------------------------------------------------------------------------
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  university_id integer references public.universities(id) on delete set null,
  subject_id uuid references public.profiles(id) on delete set null,
  action text not null check (char_length(action) <= 60),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log(created_at desc);
create index audit_log_university_idx on public.audit_log(university_id, created_at desc);
create index audit_log_subject_idx on public.audit_log(subject_id);
alter table public.audit_log enable row level security;
create policy "audit_read" on public.audit_log for select to authenticated
  using (public.is_admin() or public.is_university_member(university_id));
revoke all on public.audit_log from anon;
revoke insert, update, delete on public.audit_log from authenticated;

revoke all on function public.publish_card_template(integer, text, text[], jsonb) from public, anon;
grant execute on function public.publish_card_template(integer, text, text[], jsonb) to authenticated;

-- -----------------------------------------------------------------------------
-- Inscriptions étudiantes (une par année universitaire)
-- -----------------------------------------------------------------------------
create table public.student_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  university_id integer not null references public.universities(id),
  academic_year text not null check (academic_year ~ '^\d{4}-\d{4}$'),
  student_number text not null check (char_length(student_number) between 2 and 40),
  student_number_norm text generated always as (upper(regexp_replace(student_number, '[^0-9A-Za-z]', '', 'g'))) stored,
  faculty text check (char_length(faculty) <= 120),
  department text check (char_length(department) <= 120),
  program text check (char_length(program) <= 120),
  study_level text check (char_length(study_level) <= 40),
  -- Identité déclarée au moment de la demande : preuve de ce qui a été comparé
  claimed_first_name text not null,
  claimed_last_name text not null,
  claimed_birth_date date,
  status public.enrollment_status not null default 'pending',
  method public.verification_method,
  -- Critères de rapprochement (vrai/faux), jamais les données de la source
  match_details jsonb,
  source_ref text check (char_length(source_ref) <= 120),
  rejection_reason text check (char_length(rejection_reason) <= 500),
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  expires_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, academic_year)
);
create index enrollments_university_idx on public.student_enrollments(university_id, status, created_at desc);
create index enrollments_number_idx on public.student_enrollments(university_id, academic_year, student_number_norm);
-- Un matricule ne peut être validé que pour un seul compte par année
create unique index enrollments_number_verified on public.student_enrollments(university_id, academic_year, student_number_norm)
  where status = 'verified';
create trigger student_enrollments_updated_at before update on public.student_enrollments
  for each row execute function public.set_updated_at();

alter table public.student_enrollments enable row level security;
create policy "enrollments_read" on public.student_enrollments for select to authenticated
  using (user_id = (select auth.uid()) or public.is_university_member(university_id) or public.is_admin());
revoke all on public.student_enrollments from anon;
revoke insert, update, delete on public.student_enrollments from authenticated;

alter table public.student_cards
  add column enrollment_id uuid references public.student_enrollments(id) on delete set null;

-- Demande de l'étudiant (crée ou remplace sa demande de l'année en cours)
create or replace function public.submit_enrollment(
  p_university integer,
  p_student_number text,
  p_faculty text default null,
  p_department text default null,
  p_program text default null,
  p_study_level text default null
)
returns public.student_enrollments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  p public.profiles;
  e public.student_enrollments;
  v_year text := public.current_academic_year();
begin
  if v_uid is null then
    raise exception 'Connexion requise' using errcode = '42501';
  end if;
  select * into p from public.profiles where id = v_uid;
  if p.role <> 'student' then
    raise exception 'Réservé aux comptes étudiants.' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.universities where id = p_university and partner_status = 'partner') then
    raise exception 'Cet établissement ne vérifie pas encore les inscriptions via Uny. Envoie un justificatif.' using errcode = 'P0001';
  end if;
  select * into e from public.student_enrollments where user_id = v_uid and academic_year = v_year;
  if e.status = 'verified' then
    raise exception 'Ton inscription est déjà confirmée pour cette année.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.audit_log
       where subject_id = v_uid and action = 'enrollment.submitted' and created_at > now() - interval '1 day') >= 5 then
    raise exception 'Trop de demandes aujourd''hui. Réessaie demain ou contacte le support.' using errcode = 'P0001';
  end if;

  insert into public.student_enrollments (
    user_id, university_id, academic_year, student_number, faculty, department, program, study_level,
    claimed_first_name, claimed_last_name, claimed_birth_date, status, method, match_details, rejection_reason,
    decided_by, decided_at
  ) values (
    v_uid, p_university, v_year, trim(p_student_number), nullif(trim(p_faculty), ''), nullif(trim(p_department), ''),
    nullif(trim(p_program), ''), nullif(trim(p_study_level), ''), p.first_name, p.last_name, p.birth_date,
    'pending', null, null, null, null, null
  )
  on conflict (user_id, academic_year) do update set
    university_id = excluded.university_id, student_number = excluded.student_number, faculty = excluded.faculty,
    department = excluded.department, program = excluded.program, study_level = excluded.study_level,
    claimed_first_name = excluded.claimed_first_name, claimed_last_name = excluded.claimed_last_name,
    claimed_birth_date = excluded.claimed_birth_date, status = 'pending', method = null, match_details = null,
    rejection_reason = null, decided_by = null, decided_at = null, source_ref = null
  returning * into e;

  update public.profiles set verification_status = 'pending'
   where id = v_uid and verification_status = 'unverified';

  insert into public.audit_log (actor_id, university_id, subject_id, action, details)
  values (v_uid, p_university, v_uid, 'enrollment.submitted', jsonb_build_object('enrollment', e.id));
  return e;
end;
$$;
revoke all on function public.submit_enrollment(integer, text, text, text, text, text) from public, anon;
grant execute on function public.submit_enrollment(integer, text, text, text, text, text) to authenticated;

-- Autorise la mise à jour de l'identité verrouillée par le moteur de vérification
create or replace function public.protect_profile_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(current_setting('uny.verification_engine', true), '') = 'on' then
    return new;
  end if;
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

-- Décision sur une inscription : admin, membre de l'université concernée, ou serveur (connecteurs)
create or replace function public.set_enrollment_status(
  p_enrollment uuid,
  p_status public.enrollment_status,
  p_method public.verification_method default null,
  p_reason text default null,
  p_details jsonb default null,
  p_source_ref text default null
)
returns public.student_enrollments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_admin boolean := public.is_admin();
  e public.student_enrollments;
  v_prev public.enrollment_status;
  v_uni text;
  v_reason text := nullif(trim(p_reason), '');
  v_auto boolean;
begin
  select * into e from public.student_enrollments where id = p_enrollment for update;
  if e.id is null then
    raise exception 'Demande introuvable' using errcode = 'P0002';
  end if;
  v_prev := e.status;

  if v_actor is not null and not v_admin then
    if not public.is_university_member(e.university_id) then
      raise exception 'Accès refusé' using errcode = '42501';
    end if;
    if not exists (select 1 from public.universities where id = e.university_id and partner_status = 'partner') then
      raise exception 'Ton établissement doit être approuvé par Uny avant de confirmer des inscriptions.' using errcode = 'P0001';
    end if;
    if p_status not in ('verified', 'rejected', 'expired') then
      raise exception 'Action non autorisée' using errcode = 'P0001';
    end if;
  end if;
  if v_actor is not null and p_status = 'rejected' and v_reason is null then
    raise exception 'Indique le motif du refus.' using errcode = 'P0001';
  end if;

  update public.student_enrollments set
    status = p_status,
    method = coalesce(p_method, case when v_actor is null then method when v_admin then 'manual' else 'portal' end::public.verification_method),
    rejection_reason = case when p_status in ('rejected', 'expired') then v_reason end,
    match_details = coalesce(p_details, match_details),
    source_ref = coalesce(p_source_ref, source_ref),
    decided_by = case when p_status in ('pending', 'manual_review') then null else v_actor end,
    decided_at = case when p_status in ('pending', 'manual_review') then null else now() end,
    expires_at = case when p_status = 'verified' then public.academic_year_end_of(academic_year) else expires_at end
  where id = e.id
  returning * into e;

  select coalesce(b.official_name, u.name) into v_uni
    from public.universities u left join public.university_branding b on b.university_id = u.id
   where u.id = e.university_id;

  perform set_config('uny.verification_engine', 'on', true);

  if p_status = 'verified' then
    update public.profiles set
      verification_status = 'verified',
      verified_at = now(),
      university_id = e.university_id,
      university_other = null,
      field_of_study = coalesce(e.program, field_of_study),
      study_level = coalesce(e.study_level, study_level)
    where id = e.user_id;

    update public.student_cards set
      academic_year = e.academic_year,
      expires_at = e.expires_at,
      status = 'active',
      enrollment_id = e.id
    where user_id = e.user_id;

    if v_prev is distinct from 'verified' then
      insert into public.notifications (user_id, type, title, body, link)
      values (e.user_id, 'verification_approved', 'Inscription confirmée ✅',
              v_uni || ' a confirmé ton inscription. Ta carte Uny affiche maintenant « Étudiant vérifié ».', '/carte');
    end if;

    select coalesce((value ->> 'auto_allocate')::boolean, false) and value ->> 'domain' is not null into v_auto
      from public.platform_settings where key = 'student_email';
    if coalesce(v_auto, false) then
      begin
        perform public.allocate_student_email(e.user_id);
      exception when others then
        null; -- l'attribution pourra être relancée depuis l'admin
      end;
    end if;

  elsif p_status in ('rejected', 'expired') then
    update public.profiles set verification_status = 'unverified', verified_at = null
     where id = e.user_id and verification_status in ('pending', 'verified');
    update public.student_cards set
      status = case when p_status = 'expired' then 'expired'::public.card_status
                    when v_prev = 'verified' then 'revoked'::public.card_status
                    else status end
    where user_id = e.user_id;

    insert into public.notifications (user_id, type, title, body, link)
    values (e.user_id, 'verification_rejected',
            case when p_status = 'expired' then 'Statut étudiant expiré'
                 when v_prev = 'verified' then 'Carte Uny désactivée'
                 else 'Inscription non confirmée' end,
            case when p_status = 'expired'
                 then 'Ton inscription ' || e.academic_year || ' n''est plus valide. Fais confirmer ta nouvelle inscription.'
                 else v_uni || ' n''a pas confirmé ton inscription.' || coalesce(' Motif : ' || v_reason, '') end,
            '/profil/verification');

  else -- pending, manual_review
    update public.profiles set verification_status = 'pending'
     where id = e.user_id and verification_status = 'unverified';
  end if;

  perform set_config('uny.verification_engine', 'off', true);

  insert into public.audit_log (actor_id, university_id, subject_id, action, details)
  values (v_actor, e.university_id, e.user_id, 'enrollment.' || p_status::text,
          jsonb_build_object('enrollment', e.id, 'method', e.method, 'previous', v_prev)
            || case when v_reason is not null then jsonb_build_object('reason', v_reason) else '{}'::jsonb end);
  return e;
end;
$$;
revoke all on function public.set_enrollment_status(uuid, public.enrollment_status, public.verification_method, text, jsonb, text)
  from public, anon;
grant execute on function public.set_enrollment_status(uuid, public.enrollment_status, public.verification_method, text, jsonb, text)
  to authenticated;

-- Liste des inscriptions d'une université (uniquement ses étudiants)
create or replace function public.university_enrollments(
  p_university integer,
  p_status public.enrollment_status[] default null,
  p_search text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  user_id uuid,
  uny_id text,
  first_name text,
  last_name text,
  birth_date date,
  avatar_url text,
  student_number text,
  faculty text,
  department text,
  program text,
  study_level text,
  academic_year text,
  status public.enrollment_status,
  method public.verification_method,
  match_details jsonb,
  rejection_reason text,
  created_at timestamptz,
  decided_at timestamptz,
  expires_at date,
  card_status public.card_status,
  total bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (public.is_university_member(p_university) or public.is_admin()) then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  return query
  select e.id, e.user_id, p.uny_id, e.claimed_first_name, e.claimed_last_name, e.claimed_birth_date, p.avatar_url,
         e.student_number, e.faculty, e.department, e.program, e.study_level, e.academic_year, e.status, e.method,
         e.match_details, e.rejection_reason, e.created_at, e.decided_at, e.expires_at, c.status,
         count(*) over ()
    from public.student_enrollments e
    join public.profiles p on p.id = e.user_id
    left join public.student_cards c on c.user_id = e.user_id
   where e.university_id = p_university
     and (p_status is null or e.status = any (p_status))
     and (p_search is null or p_search = ''
          or e.claimed_last_name ilike '%' || p_search || '%'
          or e.claimed_first_name ilike '%' || p_search || '%'
          or e.student_number ilike '%' || p_search || '%'
          or p.uny_id ilike '%' || p_search || '%')
   order by case when e.status in ('pending', 'manual_review') then 0 else 1 end, e.created_at desc
   limit least(greatest(p_limit, 1), 200) offset greatest(p_offset, 0);
end;
$$;
revoke all on function public.university_enrollments(integer, public.enrollment_status[], text, integer, integer) from public, anon;
grant execute on function public.university_enrollments(integer, public.enrollment_status[], text, integer, integer) to authenticated;

-- -----------------------------------------------------------------------------
-- Niveau 2 — listes importées par l'université, stockées en empreintes HMAC
-- (clé secrète côté serveur : la base ne contient ni matricules ni noms en clair)
-- -----------------------------------------------------------------------------
create table public.university_imports (
  id uuid primary key default gen_random_uuid(),
  university_id integer not null references public.universities(id) on delete cascade,
  academic_year text not null check (academic_year ~ '^\d{4}-\d{4}$'),
  file_name text check (char_length(file_name) <= 200),
  row_count integer not null default 0,
  skipped_count integer not null default 0,
  matched_count integer not null default 0,
  status text not null default 'active' check (status in ('active', 'archived')),
  imported_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  -- Les empreintes sont supprimées à la fin de l'année universitaire
  purge_after date not null
);
create index university_imports_idx on public.university_imports(university_id, created_at desc);

create table public.university_roster_entries (
  id bigint generated always as identity primary key,
  import_id uuid not null references public.university_imports(id) on delete cascade,
  university_id integer not null references public.universities(id) on delete cascade,
  academic_year text not null,
  student_number_hash text not null,
  last_name_hash text not null,
  first_name_hash text,
  birth_date_hash text,
  -- Informations académiques affichées sur la carte (non sensibles)
  faculty text check (char_length(faculty) <= 120),
  department text check (char_length(department) <= 120),
  program text check (char_length(program) <= 120),
  study_level text check (char_length(study_level) <= 40),
  unique (import_id, student_number_hash)
);
create index roster_lookup_idx on public.university_roster_entries(university_id, academic_year, student_number_hash);

alter table public.university_imports enable row level security;
alter table public.university_roster_entries enable row level security;
create policy "imports_read" on public.university_imports for select to authenticated
  using (public.is_university_member(university_id) or public.is_admin());
revoke all on public.university_imports from anon;
revoke insert, update, delete on public.university_imports from authenticated;
-- Empreintes : aucun accès direct (le serveur rapproche avec la clé de service)
revoke all on public.university_roster_entries from anon, authenticated;

-- -----------------------------------------------------------------------------
-- Niveau 1 — connecteurs API (configuration non secrète uniquement)
-- -----------------------------------------------------------------------------
create table public.university_integrations (
  university_id integer primary key references public.universities(id) on delete cascade,
  provider text not null default 'rest_json_v1' check (provider in ('rest_json_v1')),
  status text not null default 'not_configured' check (status in ('not_configured', 'testing', 'active', 'disabled')),
  base_url text check (base_url is null or base_url ~* '^https://[^ ]+$'),
  auth_type text not null default 'bearer' check (auth_type in ('bearer', 'api_key_header')),
  -- Nom de la variable d'environnement serveur qui contient la clé (jamais la clé elle-même)
  secret_ref text check (secret_ref is null or secret_ref ~ '^UNIV_[A-Z0-9_]{2,60}$'),
  field_mapping jsonb not null default '{}'::jsonb check (jsonb_typeof(field_mapping) = 'object'),
  agreement_reference text check (char_length(agreement_reference) <= 200),
  agreement_signed_at date,
  last_test_at timestamptz,
  last_test_ok boolean,
  last_test_message text check (char_length(last_test_message) <= 500),
  last_call_at timestamptz,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  -- Aucune intégration ne peut être active sans accord signé et sans clé
  constraint integration_active_requirements check (
    status <> 'active' or (agreement_signed_at is not null and base_url is not null and secret_ref is not null)
  )
);
create trigger university_integrations_updated_at before update on public.university_integrations
  for each row execute function public.set_updated_at();
alter table public.university_integrations enable row level security;
create policy "integrations_read" on public.university_integrations for select to authenticated
  using (public.is_university_member(university_id) or public.is_admin());
create policy "integrations_admin" on public.university_integrations for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
revoke all on public.university_integrations from anon;

-- Demandes « Université partenaire » (formulaire public)
create table public.university_applications (
  id uuid primary key default gen_random_uuid(),
  university_id integer references public.universities(id) on delete set null,
  university_name text not null check (char_length(university_name) between 2 and 200),
  city_id integer references public.cities(id),
  contact_name text not null check (char_length(contact_name) between 2 and 120),
  contact_title text check (char_length(contact_title) <= 120),
  email text not null check (char_length(email) between 5 and 200),
  phone text not null check (char_length(phone) between 6 and 30),
  student_count integer check (student_count between 0 and 1000000),
  has_api boolean not null default false,
  message text check (char_length(message) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index university_applications_status_idx on public.university_applications(status, created_at desc);
alter table public.university_applications enable row level security;
create policy "university_applications_admin" on public.university_applications for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
revoke all on public.university_applications from anon;

-- -----------------------------------------------------------------------------
-- Vérification du BAC : preuve minimale (jamais de copie de la base nationale)
-- -----------------------------------------------------------------------------
create table public.bac_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  exam_year smallint not null check (exam_year between 1980 and 2100),
  -- Numéro de candidat masqué pour l'affichage (ex. ••••4521) + empreinte HMAC pour détecter les doublons
  candidate_ref text not null check (char_length(candidate_ref) <= 20),
  candidate_hash text not null,
  provider text not null default 'manual' check (provider in ('manual', 'official_api')),
  method text not null default 'document' check (method in ('official_api', 'official_exchange', 'document')),
  status public.enrollment_status not null default 'manual_review',
  result text check (result in ('admis', 'non_admis')),
  source_reference text check (char_length(source_reference) <= 120),
  -- Relevé envoyé par l'étudiant (vérification manuelle) : supprimé dès la décision
  document_path text,
  rejection_reason text check (char_length(rejection_reason) <= 500),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, exam_year)
);
create index bac_verifications_status_idx on public.bac_verifications(status, created_at);
create unique index bac_candidate_verified on public.bac_verifications(exam_year, candidate_hash) where status = 'verified';
alter table public.bac_verifications enable row level security;
create policy "bac_read" on public.bac_verifications for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
revoke all on public.bac_verifications from anon;
revoke insert, update, delete on public.bac_verifications from authenticated;

-- -----------------------------------------------------------------------------
-- Emails étudiants Uny (boîtes créées chez un fournisseur professionnel)
-- -----------------------------------------------------------------------------
create table public.platform_settings (
  key text primary key check (key in ('student_email')),
  value jsonb not null,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.platform_settings enable row level security;
create policy "settings_admin" on public.platform_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
revoke all on public.platform_settings from anon;

insert into public.platform_settings (key, value) values (
  'student_email',
  '{"domain": null, "provider": "manual", "auto_allocate": false, "expiry_policy": "suspend", "grace_days": 30}'::jsonb
);

create table public.student_email_accounts (
  id uuid primary key default gen_random_uuid(),
  -- Conservé (null) après suppression du compte : l'adresse n'est jamais réattribuée
  user_id uuid references public.profiles(id) on delete set null,
  university_id integer references public.universities(id) on delete set null,
  local_part text not null check (local_part ~ '^[a-z0-9]([a-z0-9.-]{0,62}[a-z0-9])?$'),
  domain text not null check (domain ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'),
  address text generated always as (local_part || '@' || domain) stored,
  status public.student_email_status not null default 'pending',
  provider text not null check (provider in ('manual', 'google_workspace', 'microsoft_365', 'zoho')),
  provider_account_ref text check (char_length(provider_account_ref) <= 200),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  status_changed_at timestamptz not null default now(),
  last_synced_at timestamptz
);
create unique index student_email_address_key on public.student_email_accounts(address);
create unique index student_email_one_live on public.student_email_accounts(user_id)
  where status in ('pending', 'active', 'suspended', 'alumni');
create index student_email_status_idx on public.student_email_accounts(status, created_at desc);

create or replace function public.student_email_track()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id is null and old.user_id is not null then
    new.status := 'disabled';
  end if;
  if new.status is distinct from old.status then
    new.status_changed_at := now();
    if new.status = 'active' and new.activated_at is null then
      new.activated_at := now();
    end if;
  end if;
  -- l'adresse est définitive
  new.local_part := old.local_part;
  new.domain := old.domain;
  return new;
end;
$$;
create trigger student_email_track before update on public.student_email_accounts
  for each row execute function public.student_email_track();

alter table public.student_email_accounts enable row level security;
create policy "student_email_read" on public.student_email_accounts for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy "student_email_admin_update" on public.student_email_accounts for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
revoke all on public.student_email_accounts from anon;
revoke insert, delete on public.student_email_accounts from authenticated;

-- Réserve une adresse prenom.nom@domaine (prenom.nom2, prenom.nom3… pour les homonymes)
create or replace function public.allocate_student_email(p_user uuid)
returns public.student_email_accounts
language plpgsql
security definer
set search_path = ''
as $$
declare
  s jsonb;
  v_domain text;
  p public.profiles;
  v_base text;
  v_local text;
  n integer := 1;
  r public.student_email_accounts;
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  select value into s from public.platform_settings where key = 'student_email';
  v_domain := lower(s ->> 'domain');
  if v_domain is null then
    raise exception 'Domaine des emails étudiants non configuré.' using errcode = 'P0001';
  end if;
  select * into p from public.profiles where id = p_user;
  if p.id is null or p.verification_status <> 'verified' or p.role <> 'student' then
    raise exception 'Seuls les étudiants vérifiés reçoivent une adresse Uny.' using errcode = 'P0001';
  end if;
  select * into r from public.student_email_accounts
   where user_id = p_user and status in ('pending', 'active', 'suspended', 'alumni');
  if found then
    return r;
  end if;

  v_base := left(public.slugify(p.first_name), 30) || '.' || left(public.slugify(p.last_name), 30);
  v_base := trim(both '.-' from v_base);
  if v_base = '' or v_base !~ '^[a-z0-9]' then
    v_base := 'etudiant';
  end if;

  loop
    v_local := case when n = 1 then v_base else v_base || n end;
    if v_local not in ('admin', 'postmaster', 'abuse', 'hostmaster', 'webmaster', 'support', 'contact', 'noreply', 'no-reply', 'security')
       and not exists (select 1 from public.student_email_accounts where domain = v_domain and local_part = v_local) then
      begin
        insert into public.student_email_accounts (user_id, university_id, local_part, domain, provider, created_by)
        values (p_user, p.university_id, v_local, v_domain, coalesce(s ->> 'provider', 'manual'), auth.uid())
        returning * into r;
        exit;
      exception when unique_violation then
        null; -- adresse prise entre-temps : on essaie la suivante
      end;
    end if;
    n := n + 1;
    if n > 500 then
      raise exception 'Aucune adresse disponible.' using errcode = 'P0001';
    end if;
  end loop;

  insert into public.audit_log (actor_id, university_id, subject_id, action, details)
  values (auth.uid(), p.university_id, p_user, 'student_email.allocated', jsonb_build_object('address', r.address));
  return r;
end;
$$;
revoke all on function public.allocate_student_email(uuid) from public, anon;
grant execute on function public.allocate_student_email(uuid) to authenticated;

-- Politique de fin de statut : l'adresse n'est jamais supprimée brutalement
create or replace function public.apply_student_email_policy()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  s jsonb;
  v_policy public.student_email_status;
  v_grace integer;
  v_count integer;
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  select value into s from public.platform_settings where key = 'student_email';
  v_policy := case when s ->> 'expiry_policy' = 'alumni' then 'alumni' else 'suspended' end::public.student_email_status;
  v_grace := coalesce((s ->> 'grace_days')::integer, 30);

  with targets as (
    select a.id,
           case when c.status = 'revoked' then 'suspended'::public.student_email_status else v_policy end as next_status
      from public.student_email_accounts a
      join public.student_cards c on c.user_id = a.user_id
      join public.profiles p on p.id = a.user_id
     where a.status in ('pending', 'active')
       and p.verification_status <> 'verified'
       and (c.status = 'revoked' or c.expires_at < current_date - v_grace or (c.status = 'expired' and c.updated_at < now() - make_interval(days => v_grace)))
  )
  update public.student_email_accounts a set status = t.next_status
    from targets t where a.id = t.id;
  get diagnostics v_count = row_count;
  if v_count > 0 then
    insert into public.audit_log (actor_id, action, details)
    values (auth.uid(), 'student_email.policy_applied', jsonb_build_object('count', v_count, 'policy', v_policy));
  end if;
  return v_count;
end;
$$;
revoke all on function public.apply_student_email_policy() from public, anon;
grant execute on function public.apply_student_email_policy() to authenticated;

-- Expiration annuelle des inscriptions (tâche planifiée quotidienne)
create or replace function public.expire_enrollments()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_count integer := 0;
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  for v_id in
    select id from public.student_enrollments where status = 'verified' and expires_at < current_date
  loop
    perform public.set_enrollment_status(v_id, 'expired', null, 'Fin de l''année universitaire');
    v_count := v_count + 1;
  end loop;
  delete from public.university_imports where purge_after < current_date;
  perform public.apply_student_email_policy();
  return v_count;
end;
$$;
revoke all on function public.expire_enrollments() from public, anon;
grant execute on function public.expire_enrollments() to authenticated;

do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('uny-expire-enrollments', '15 3 * * *', 'select public.expire_enrollments()');
exception when others then
  raise notice 'pg_cron indisponible : expiration à lancer depuis l''admin (%).', sqlerrm;
end $$;

-- -----------------------------------------------------------------------------
-- Statistiques d'une université (uniquement ses étudiants)
-- -----------------------------------------------------------------------------
create or replace function public.university_stats(p_university integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_year text := public.current_academic_year();
begin
  if not (public.is_university_member(p_university) or public.is_admin()) then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'academic_year', v_year,
    'pending', (select count(*) from public.student_enrollments where university_id = p_university and status = 'pending'),
    'manual_review', (select count(*) from public.student_enrollments where university_id = p_university and status = 'manual_review'),
    'verified', (select count(*) from public.student_enrollments where university_id = p_university and status = 'verified'),
    'rejected', (select count(*) from public.student_enrollments where university_id = p_university and status = 'rejected'),
    'expired', (select count(*) from public.student_enrollments where university_id = p_university and status = 'expired'),
    'auto_verified', (select count(*) from public.student_enrollments
                       where university_id = p_university and status = 'verified' and method in ('api', 'import')),
    'cards_active', (select count(*) from public.student_enrollments e join public.student_cards c on c.enrollment_id = e.id
                      where e.university_id = p_university and e.status = 'verified' and c.status = 'active'),
    'card_uses_30d', (select count(*) from public.card_validations v
                        join public.student_enrollments e on e.user_id = v.student_id and e.status = 'verified'
                       where e.university_id = p_university and v.eligible and v.created_at > now() - interval '30 days'),
    'roster_size', (select coalesce(sum(row_count), 0) from public.university_imports
                     where university_id = p_university and academic_year = v_year and status = 'active'),
    'last_import_at', (select max(created_at) from public.university_imports where university_id = p_university),
    'by_faculty', (select coalesce(jsonb_agg(jsonb_build_object('label', f, 'count', n) order by n desc), '[]'::jsonb)
                     from (select coalesce(faculty, 'Non renseignée') f, count(*) n from public.student_enrollments
                            where university_id = p_university and status = 'verified' group by 1 order by 2 desc limit 8) t)
  );
end;
$$;
revoke all on function public.university_stats(integer) from public, anon;
grant execute on function public.university_stats(integer) to authenticated;

-- -----------------------------------------------------------------------------
-- Identifiant Uny non séquentiel : UNY-GN-2026-7K3QX9
-- 5 caractères aléatoires (alphabet Crockford, sans I L O U) + 1 caractère de contrôle.
-- Les identifiants déjà attribués restent valables (identifiant permanent).
-- -----------------------------------------------------------------------------
create or replace function public.next_uny_id(p_country char(2))
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  v_weights constant integer[] := array[1, 3, 5, 7, 9];
  v_bytes bytea;
  v_body text;
  v_sum integer;
  v_id text;
begin
  loop
    v_bytes := extensions.gen_random_bytes(5);
    v_body := '';
    v_sum := 0;
    for i in 1..5 loop
      v_body := v_body || substr(v_alphabet, (get_byte(v_bytes, i - 1) % 32) + 1, 1);
      v_sum := v_sum + (get_byte(v_bytes, i - 1) % 32) * v_weights[i];
    end loop;
    v_id := format('UNY-%s-%s-%s%s', upper(p_country), extract(year from now())::int, v_body,
                   substr(v_alphabet, (v_sum % 32) + 1, 1));
    exit when not exists (select 1 from public.profiles where uny_id = v_id)
          and not exists (select 1 from public.student_cards where uny_id = v_id);
  end loop;
  return v_id;
end;
$$;
revoke all on function public.next_uny_id(char) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Scan partenaire : une carte expirée par l'université est refusée
-- -----------------------------------------------------------------------------
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

-- Page publique de vérification (QR) : établissement officiel + carte expirée
drop function if exists public.verify_card(text);
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
  expires_at date,
  university_logo text,
  university_color text
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.uny_id, p.first_name, p.last_name, p.avatar_url,
         coalesce(b.official_name, u.name, p.university_other), coalesce(e.program, p.field_of_study),
         c.academic_year, p.verification_status, c.status, c.expires_at,
         case when u.partner_status = 'partner' then b.logo_url end,
         case when u.partner_status = 'partner' then b.primary_color end
    from public.student_cards c
    join public.profiles p on p.id = c.user_id
    left join public.universities u on u.id = p.university_id
    left join public.university_branding b on b.university_id = u.id
    left join public.student_enrollments e on e.id = c.enrollment_id
   where c.qr_token = p_token
   limit 1;
$$;
grant execute on function public.verify_card(text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Statistiques admin : comptes partenaires et universités exclus des « étudiants »
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
    'users_total', (select count(*) from public.profiles where not is_test_account and role in ('student', 'admin')),
    'users_verified', (select count(*) from public.profiles where not is_test_account and role in ('student', 'admin') and verification_status = 'verified'),
    'users_pending', (select count(*) from public.profiles where not is_test_account and role in ('student', 'admin') and verification_status = 'pending'),
    'signups_today', (select count(*) from public.profiles where not is_test_account and role in ('student', 'admin') and created_at >= date_trunc('day', now())),
    'signups_week', (select count(*) from public.profiles where not is_test_account and role in ('student', 'admin') and created_at >= now() - interval '7 days'),
    'active_week', (select count(*) from public.profiles where not is_test_account and role in ('student', 'admin') and last_seen_at >= now() - interval '7 days'),
    'test_accounts', (select count(*) from public.profiles where is_test_account),
    'verifications_pending', (select count(*) from public.student_verifications where status = 'pending'),
    'verifications_approved', (select count(*) from public.student_verifications where status = 'approved'),
    'verifications_rejected', (select count(*) from public.student_verifications where status = 'rejected'),
    'enrollments_pending', (select count(*) from public.student_enrollments where status in ('pending', 'manual_review')),
    'enrollments_verified', (select count(*) from public.student_enrollments where status = 'verified'),
    'bac_pending', (select count(*) from public.bac_verifications where status in ('pending', 'manual_review')),
    'universities_partner', (select count(*) from public.universities where partner_status = 'partner'),
    'university_applications_pending', (select count(*) from public.university_applications where status = 'pending'),
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
            from public.profiles where not is_test_account and role in ('student', 'admin')
           group by 1
        ) c on c.day = d
    )
  ) into result;

  return result;
end;
$$;
