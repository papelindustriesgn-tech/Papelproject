-- =============================================================================
-- UNY — cloisonnement des établissements et rôles du portail
--   • Un établissement « en attente » prépare son espace (fiche, identité visuelle, carte)
--     mais n'accède à aucune donnée nominative d'étudiant.
--   • Les données d'étudiants (inscriptions, justificatifs, historique, exports) sont réservées
--     aux établissements approuvés (partner_status = 'partner'), selon le rôle du membre :
--       admin      : tout (fiche, imports, membres, décisions, annonces, historique)
--       validator  : consultation, décisions sur les inscriptions, historique
--       viewer     : consultation et export
--       announcer  : annonces aux étudiants (sans accès aux dossiers)
--   Migration non destructive : les membres existants deviennent « admin ».
-- =============================================================================

alter table public.university_members
  add column if not exists role text not null default 'admin'
    check (role in ('admin', 'validator', 'viewer', 'announcer')),
  add column if not exists invited_by uuid references public.profiles(id) on delete set null;

-- Membre d'un établissement en attente ou approuvé : préparation de l'espace uniquement
create or replace function public.is_university_workspace_member(p_university integer)
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
revoke all on function public.is_university_workspace_member(integer) from public, anon;
grant execute on function public.is_university_workspace_member(integer) to authenticated;

-- Membre d'un établissement APPROUVÉ (toute donnée d'étudiant passe par ici)
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
       and u.partner_status = 'partner'
  );
$$;

-- Droit précis d'un membre d'établissement approuvé
create or replace function public.university_can(p_university integer, p_action text)
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
       and u.partner_status = 'partner'
       and case p_action
             when 'read' then m.role in ('admin', 'validator', 'viewer')
             when 'decide' then m.role in ('admin', 'validator')
             when 'audit' then m.role in ('admin', 'validator')
             when 'announce' then m.role in ('admin', 'announcer')
             when 'manage' then m.role = 'admin'
             else false
           end
  );
$$;
revoke all on function public.university_can(integer, text) from public, anon;
grant execute on function public.university_can(integer, text) to authenticated;

-- Rôle du membre connecté dans un établissement en attente ou approuvé (préparation de l'espace)
create or replace function public.university_workspace_role(p_university integer)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select m.role from public.university_members m
    join public.universities u on u.id = m.university_id
   where m.university_id = p_university and m.user_id = auth.uid()
     and u.partner_status in ('pending', 'partner');
$$;
revoke all on function public.university_workspace_role(integer) from public, anon;
grant execute on function public.university_workspace_role(integer) to authenticated;

-- -----------------------------------------------------------------------------
-- Règles d'accès aux tables
-- -----------------------------------------------------------------------------
drop policy if exists "enrollments_read" on public.student_enrollments;
create policy "enrollments_read" on public.student_enrollments for select to authenticated
  using (user_id = (select auth.uid()) or public.university_can(university_id, 'read') or public.is_admin());

drop policy if exists "audit_read" on public.audit_log;
create policy "audit_read" on public.audit_log for select to authenticated
  using (public.is_admin() or public.university_can(university_id, 'audit'));

-- Préparation de l'espace : fiche et identité visuelle, réservées au rôle admin de l'établissement
drop policy if exists "universities_member_update" on public.universities;
create policy "universities_member_update" on public.universities for update to authenticated
  using (public.university_workspace_role(id) = 'admin') with check (public.university_workspace_role(id) = 'admin');

drop policy if exists "branding_write" on public.university_branding;
create policy "branding_write" on public.university_branding for all to authenticated
  using (public.university_workspace_role(university_id) = 'admin' or public.is_admin())
  with check (public.university_workspace_role(university_id) = 'admin' or public.is_admin());

drop policy if exists "integrations_read" on public.university_integrations;
create policy "integrations_read" on public.university_integrations for select to authenticated
  using (public.is_university_workspace_member(university_id) or public.is_admin());

-- Les membres d'un même établissement se voient entre eux (gestion des accès)
drop policy if exists "university_members_read" on public.university_members;
create policy "university_members_read" on public.university_members for select to authenticated
  using (user_id = (select auth.uid()) or public.university_can(university_id, 'manage') or public.is_admin());

-- -----------------------------------------------------------------------------
-- Fonctions : contrôle du rôle avant l'implémentation existante (renommée, non exposée)
-- -----------------------------------------------------------------------------
alter function public.set_enrollment_status(uuid, public.enrollment_status, public.verification_method, text, jsonb, text)
  rename to set_enrollment_status_impl;
revoke all on function public.set_enrollment_status_impl(uuid, public.enrollment_status, public.verification_method, text, jsonb, text)
  from public, anon, authenticated;

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
  v_university integer;
begin
  if auth.uid() is not null and not public.is_admin() then
    select university_id into v_university from public.student_enrollments where id = p_enrollment;
    if v_university is null then
      raise exception 'Demande introuvable' using errcode = 'P0002';
    end if;
    if public.is_university_workspace_member(v_university) and not public.is_university_member(v_university) then
      raise exception 'Ton établissement doit être approuvé par Uny avant de confirmer des inscriptions.' using errcode = 'P0001';
    end if;
    if not public.university_can(v_university, 'decide') then
      raise exception 'Accès refusé' using errcode = '42501';
    end if;
  end if;
  return public.set_enrollment_status_impl(p_enrollment, p_status, p_method, p_reason, p_details, p_source_ref);
end;
$$;
revoke all on function public.set_enrollment_status(uuid, public.enrollment_status, public.verification_method, text, jsonb, text)
  from public, anon;
grant execute on function public.set_enrollment_status(uuid, public.enrollment_status, public.verification_method, text, jsonb, text)
  to authenticated;

alter function public.university_enrollments(integer, public.enrollment_status[], text, integer, integer)
  rename to university_enrollments_impl;
revoke all on function public.university_enrollments_impl(integer, public.enrollment_status[], text, integer, integer)
  from public, anon, authenticated;

create or replace function public.university_enrollments(
  p_university integer,
  p_status public.enrollment_status[] default null,
  p_search text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid, user_id uuid, uny_id text, first_name text, last_name text, birth_date date, avatar_url text,
  student_number text, faculty text, department text, program text, study_level text, academic_year text,
  status public.enrollment_status, method public.verification_method, match_details jsonb, rejection_reason text,
  created_at timestamptz, decided_at timestamptz, expires_at date, card_status public.card_status, total bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (public.university_can(p_university, 'read') or public.is_admin()) then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  return query select * from public.university_enrollments_impl(p_university, p_status, p_search, p_limit, p_offset);
end;
$$;
revoke all on function public.university_enrollments(integer, public.enrollment_status[], text, integer, integer) from public, anon;
grant execute on function public.university_enrollments(integer, public.enrollment_status[], text, integer, integer) to authenticated;

alter function public.university_declared_students(integer) rename to university_declared_students_impl;
revoke all on function public.university_declared_students_impl(integer) from public, anon, authenticated;
create or replace function public.university_declared_students(p_university integer)
returns table (
  user_id uuid, first_name text, last_name text, study_level text, field_of_study text,
  verification_status public.verification_status, enrollment_status public.enrollment_status, created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (public.university_can(p_university, 'read') or public.is_admin()) then
    return;
  end if;
  return query select * from public.university_declared_students_impl(p_university);
end;
$$;
revoke all on function public.university_declared_students(integer) from public, anon;
grant execute on function public.university_declared_students(integer) to authenticated;

alter function public.university_send_announcement(integer, text, text, text, text, text)
  rename to university_send_announcement_impl;
revoke all on function public.university_send_announcement_impl(integer, text, text, text, text, text)
  from public, anon, authenticated;
create or replace function public.university_send_announcement(
  p_university integer, p_title text, p_body text, p_audience text,
  p_level text default null, p_faculty text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    if public.is_university_workspace_member(p_university) and not public.is_university_member(p_university) then
      raise exception 'Votre établissement doit être approuvé par Uny avant d''envoyer des annonces.' using errcode = 'P0001';
    end if;
    if not public.university_can(p_university, 'announce') then
      raise exception 'Accès refusé' using errcode = '42501';
    end if;
  end if;
  return public.university_send_announcement_impl(p_university, p_title, p_body, p_audience, p_level, p_faculty);
end;
$$;
revoke all on function public.university_send_announcement(integer, text, text, text, text, text) from public, anon;
grant execute on function public.university_send_announcement(integer, text, text, text, text, text) to authenticated;

alter function public.university_invite_declared(integer) rename to university_invite_declared_impl;
revoke all on function public.university_invite_declared_impl(integer) from public, anon, authenticated;
create or replace function public.university_invite_declared(p_university integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    if public.is_university_workspace_member(p_university) and not public.is_university_member(p_university) then
      raise exception 'Votre établissement doit être approuvé par Uny avant de confirmer des inscriptions.' using errcode = 'P0001';
    end if;
    if not public.university_can(p_university, 'announce') then
      raise exception 'Accès refusé' using errcode = '42501';
    end if;
  end if;
  return public.university_invite_declared_impl(p_university);
end;
$$;
revoke all on function public.university_invite_declared(integer) from public, anon;
grant execute on function public.university_invite_declared(integer) to authenticated;

-- Totaux sans nom : disponibles dès la préparation de l'espace
create or replace function public.university_declared_count(p_university integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (public.is_university_workspace_member(p_university) or public.is_admin()) then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  return (
    select jsonb_build_object(
      'total', count(*),
      'without_request', count(*) filter (
        where p.verification_status <> 'verified'
          and not exists (select 1 from public.student_enrollments e where e.user_id = p.id and e.university_id = p_university))
    )
    from public.profiles p
    where p.university_id = p_university and p.role = 'student' and p.account_status = 'approved' and not p.is_test_account
  );
end;
$$;

-- Carte : préparable avant l'approbation, par le rôle admin de l'établissement
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
  if not (public.university_workspace_role(p_university) = 'admin' or public.is_admin()) then
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
