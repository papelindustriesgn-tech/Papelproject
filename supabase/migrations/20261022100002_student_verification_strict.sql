-- =============================================================================
-- Vérification étudiante plus stricte (non destructif : aucune donnée supprimée, statuts existants conservés).
-- On ne se fie plus aux seules réponses de l'étudiant :
--   1. Justificatif (équipe Uny) : contrôles obligatoires cochés, matricule et année lus SUR le document,
--      année académique en cours, aucun doublon (même fichier ou même matricule sur un autre compte) ;
--      un étudiant d'un établissement partenaire est confirmé par son établissement, pas par un justificatif.
--   2. Établissement (portail) : une confirmation manuelle exige la référence du registre officiel consulté et
--      les 4 critères vérifiés (matricule, nom, prénom, date de naissance), sauf correspondance automatique complète.
--   3. Plus de « validation manuelle du statut » sans preuve depuis la fiche utilisateur.
--   4. Toutes les réductions sont réservées aux étudiants vérifiés.
-- =============================================================================

alter table public.student_verifications
  add column if not exists file_sha256 text check (file_sha256 is null or file_sha256 ~ '^[0-9a-f]{64}$'),
  add column if not exists checks jsonb,
  add column if not exists document_student_number text check (document_student_number is null or char_length(document_student_number) between 2 and 40),
  add column if not exists document_academic_year text check (document_academic_year is null or document_academic_year ~ '^\d{4}-\d{4}$');
create index if not exists student_verifications_file_idx on public.student_verifications (file_sha256) where file_sha256 is not null;

-- -----------------------------------------------------------------------------
-- 1. Justificatifs
-- -----------------------------------------------------------------------------
alter function public.review_verification(uuid, boolean, text) rename to review_verification_impl;
revoke all on function public.review_verification_impl(uuid, boolean, text) from public, anon, authenticated;

create or replace function public.review_verification(
  p_verification_id uuid,
  p_approve boolean,
  p_reason text default null,
  p_checks jsonb default null,
  p_student_number text default null,
  p_academic_year text default null
)
returns public.student_verifications
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.student_verifications;
  p public.profiles;
  v_number text := upper(regexp_replace(coalesce(p_student_number, ''), '[^0-9A-Za-z]', '', 'g'));
  v_year text := trim(coalesce(p_academic_year, ''));
  v_key text;
begin
  if not public.is_admin() then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  if not p_approve then
    return public.review_verification_impl(p_verification_id, false, p_reason);
  end if;

  select * into v from public.student_verifications where id = p_verification_id and status = 'pending' for update;
  if v.id is null then
    raise exception 'Demande introuvable ou déjà traitée' using errcode = 'P0002';
  end if;
  select * into p from public.profiles where id = v.user_id;

  -- Contrôles visuels obligatoires
  foreach v_key in array array['identity', 'institution', 'academic_year', 'authentic'] loop
    if coalesce((p_checks ->> v_key)::boolean, false) is not true then
      raise exception 'Coche les 4 contrôles du document avant de valider.' using errcode = 'P0001';
    end if;
  end loop;
  if char_length(v_number) < 2 then
    raise exception 'Saisis le matricule lu sur le document.' using errcode = 'P0001';
  end if;
  if v_year is distinct from public.current_academic_year() then
    raise exception 'Le document doit porter l''année académique en cours (%).', public.current_academic_year() using errcode = 'P0001';
  end if;

  -- Établissement partenaire : la confirmation passe par l'établissement lui-même
  if p.university_id is not null and exists (
    select 1 from public.universities u
     where u.id = p.university_id and u.partner_status = 'partner'
       and exists (select 1 from public.university_members m where m.university_id = u.id)
  ) then
    raise exception 'Établissement partenaire : l''inscription doit être confirmée par l''établissement dans son portail.'
      using errcode = 'P0001';
  end if;

  -- Doublons : même fichier ou même matricule déjà utilisé par un autre compte
  if v.file_sha256 is not null and exists (
    select 1 from public.student_verifications o
     where o.file_sha256 = v.file_sha256 and o.user_id <> v.user_id
  ) then
    raise exception 'Ce document a déjà été envoyé par un autre compte : validation impossible.' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.student_verifications o
      join public.profiles op on op.id = o.user_id
     where o.status = 'approved' and o.user_id <> v.user_id
       and upper(regexp_replace(o.document_student_number, '[^0-9A-Za-z]', '', 'g')) = v_number
       and coalesce(op.university_id::text, lower(op.university_other)) is not distinct from coalesce(p.university_id::text, lower(p.university_other))
  ) or exists (
    select 1 from public.student_enrollments e
     where e.status = 'verified' and e.user_id <> v.user_id and e.university_id = p.university_id
       and upper(regexp_replace(e.student_number, '[^0-9A-Za-z]', '', 'g')) = v_number
  ) then
    raise exception 'Ce matricule est déjà vérifié pour un autre compte : validation impossible.' using errcode = 'P0001';
  end if;

  update public.student_verifications
     set checks = p_checks, document_student_number = v_number, document_academic_year = v_year
   where id = v.id;
  insert into public.audit_log (actor_id, subject_id, action, details)
  values (auth.uid(), v.user_id, 'verification.document_approved',
          jsonb_build_object('verification', v.id, 'checks', p_checks, 'academic_year', v_year,
                             'student_number_masked', '••••' || right(v_number, 3)));
  return public.review_verification_impl(p_verification_id, true, null);
end;
$$;
revoke all on function public.review_verification(uuid, boolean, text, jsonb, text, text) from public, anon;
grant execute on function public.review_verification(uuid, boolean, text, jsonb, text, text) to authenticated;

-- -----------------------------------------------------------------------------
-- 2. Plus de passage à « vérifié » sans preuve depuis la fiche utilisateur
-- -----------------------------------------------------------------------------
alter function public.admin_set_verification(uuid, public.verification_status) rename to admin_set_verification_impl;
revoke all on function public.admin_set_verification_impl(uuid, public.verification_status) from public, anon, authenticated;

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
  if p_status = 'verified' then
    raise exception 'Le statut vérifié s''obtient par un justificatif contrôlé ou par la confirmation de l''établissement.'
      using errcode = 'P0001';
  end if;
  perform public.admin_set_verification_impl(p_user_id, p_status);
  insert into public.audit_log (actor_id, subject_id, action, details)
  values (auth.uid(), p_user_id, 'verification.status_set', jsonb_build_object('status', p_status));
end;
$$;
revoke all on function public.admin_set_verification(uuid, public.verification_status) from public, anon;
grant execute on function public.admin_set_verification(uuid, public.verification_status) to authenticated;

-- -----------------------------------------------------------------------------
-- 3. Confirmation par l'établissement : preuve du registre officiel
-- -----------------------------------------------------------------------------
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
  v_reason text := nullif(trim(p_reason), '');
  e public.student_enrollments;
  v_prev public.enrollment_status;
  v_uni text;
  v_key text;
  v_full_match boolean;
  v_details jsonb := p_details;
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

  -- Décision humaine de confirmation : le registre officiel doit avoir été consulté
  if p_status = 'verified' and auth.uid() is not null then
    select * into e from public.student_enrollments where id = p_enrollment;
    if e.id is null then
      raise exception 'Demande introuvable' using errcode = 'P0002';
    end if;
    v_full_match := coalesce((e.match_details ->> 'student_number')::boolean, false)
      and coalesce((e.match_details ->> 'last_name')::boolean, false)
      and coalesce((e.match_details ->> 'first_name')::boolean, false)
      and coalesce((e.match_details ->> 'birth_date')::boolean, false)
      and coalesce((e.match_details ->> 'conflict')::boolean, false) is not true;
    if not v_full_match then
      if char_length(coalesce(trim(p_source_ref), '')) < 3 then
        raise exception 'Indiquez la référence du registre officiel consulté (n° de dossier ou d''inscription).' using errcode = 'P0001';
      end if;
      foreach v_key in array array['student_number', 'last_name', 'first_name', 'birth_date'] loop
        if coalesce((p_details -> 'checked' ->> v_key)::boolean, false) is not true then
          raise exception 'Cochez les 4 informations vérifiées dans votre registre (matricule, nom, prénom, date de naissance).'
            using errcode = 'P0001';
        end if;
      end loop;
    end if;
    v_details := coalesce(e.match_details, '{}'::jsonb) || coalesce(p_details, '{}'::jsonb);
    e := null;
  end if;

  if p_status = 'incomplete' then
    if v_reason is null or char_length(v_reason) < 3 then
      raise exception 'Indique ce que l''étudiant doit compléter.' using errcode = 'P0001';
    end if;
    select * into e from public.student_enrollments where id = p_enrollment for update;
    if e.id is null then
      raise exception 'Demande introuvable' using errcode = 'P0002';
    end if;
    if e.status not in ('pending', 'manual_review') then
      raise exception 'Seule une demande en cours peut être renvoyée à compléter.' using errcode = 'P0001';
    end if;
    v_prev := e.status;
    update public.student_enrollments set
      status = 'incomplete', rejection_reason = left(v_reason, 500),
      decided_by = auth.uid(), decided_at = now()
     where id = e.id
    returning * into e;
    select coalesce(b.official_name, u.name) into v_uni
      from public.universities u left join public.university_branding b on b.university_id = u.id
     where u.id = e.university_id;
    insert into public.notifications (user_id, type, title, body, link)
    values (e.user_id, 'verification_incomplete', 'Demande à compléter ✍️',
            left(v_uni || ' a besoin d''une correction : ' || v_reason, 300), '/profil/verification');
    insert into public.audit_log (actor_id, university_id, subject_id, action, details)
    values (auth.uid(), e.university_id, e.user_id, 'enrollment.incomplete',
            jsonb_build_object('enrollment', e.id, 'previous', v_prev, 'reason', v_reason));
    return e;
  end if;

  return public.set_enrollment_status_impl(p_enrollment, p_status, p_method, p_reason, v_details, p_source_ref);
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. Réductions réservées aux étudiants vérifiés
-- -----------------------------------------------------------------------------
alter table public.deals alter column requires_verification set default true;
update public.deals set requires_verification = true where requires_verification is not true;
alter table public.deals add constraint deals_verified_only check (requires_verification) not valid;
alter table public.deals validate constraint deals_verified_only;
