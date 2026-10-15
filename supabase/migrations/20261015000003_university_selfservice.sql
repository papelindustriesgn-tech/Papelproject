-- =============================================================================
-- UNY — inscription des établissements en libre-service
--   Un établissement crée son espace et y accède tout de suite (statut « pending »).
--   Tant qu'Uny ne l'a pas vérifié, il ne voit que des totaux, jamais de données d'étudiants.
-- =============================================================================

create or replace function public.university_declared_count(p_university integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (public.is_university_member(p_university) or public.is_admin()) then
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
revoke all on function public.university_declared_count(integer) from public, anon;
grant execute on function public.university_declared_count(integer) to authenticated;

-- Liste nominative : seulement pour un établissement vérifié par Uny
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
  if not (public.is_university_member(p_university) or public.is_admin()) then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  if not public.is_admin() and not exists (select 1 from public.universities where id = p_university and partner_status = 'partner') then
    return;
  end if;
  return query
  select p.id, p.first_name, p.last_name, p.study_level, p.field_of_study, p.verification_status,
         (select e.status from public.student_enrollments e
           where e.user_id = p.id and e.university_id = p_university order by e.created_at desc limit 1),
         p.created_at
    from public.profiles p
   where p.university_id = p_university and p.role = 'student' and p.account_status = 'approved' and not p.is_test_account
   order by p.created_at desc
   limit 1000;
end;
$$;
