-- Décision « À compléter » (motif obligatoire, responsable et date enregistrés, étudiant notifié)
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

  return public.set_enrollment_status_impl(p_enrollment, p_status, p_method, p_reason, p_details, p_source_ref);
end;
$$;
