-- =============================================================================
-- UNY — universités : annonces aux étudiants et étudiants déjà inscrits sur Uny
--   • annonces : l'établissement écrit à ses étudiants (tous ou seulement les inscriptions
--     confirmées), éventuellement par niveau ou faculté ; elles arrivent en notification
--   • étudiants déclarés : ceux qui ont choisi l'établissement à l'inscription ; l'université
--     peut leur demander d'envoyer leur matricule pour confirmer leur inscription
-- =============================================================================

create table public.university_announcements (
  id uuid primary key default gen_random_uuid(),
  university_id integer not null references public.universities(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 80),
  body text not null check (char_length(body) between 3 and 500),
  audience text not null check (audience in ('all', 'verified')),
  study_level text check (char_length(study_level) <= 40),
  faculty text check (char_length(faculty) <= 120),
  recipients integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index university_announcements_idx on public.university_announcements(university_id, created_at desc);
alter table public.university_announcements enable row level security;
create policy "university_announcements_read" on public.university_announcements for select to authenticated
  using (public.is_university_member(university_id) or public.is_admin());
revoke all on public.university_announcements from anon;
revoke insert, update, delete on public.university_announcements from authenticated;

-- Destinataires d'une annonce
create or replace function public.university_audience(
  p_university integer, p_audience text, p_level text default null, p_faculty text default null
)
returns table (user_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct p.id
    from public.profiles p
    left join public.student_enrollments e
      on e.user_id = p.id and e.university_id = p_university and e.status = 'verified'
   where p.role = 'student' and p.account_status = 'approved' and not p.is_test_account
     and (e.id is not null or (p_audience = 'all' and p.university_id = p_university))
     and (nullif(p_level, '') is null or coalesce(e.study_level, p.study_level) = p_level)
     and (nullif(p_faculty, '') is null or e.faculty = p_faculty);
$$;
revoke all on function public.university_audience(integer, text, text, text) from public, anon, authenticated;

create or replace function public.university_audience_count(
  p_university integer, p_audience text, p_level text default null, p_faculty text default null
)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (public.is_university_member(p_university) or public.is_admin()) then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  return (select count(*) from public.university_audience(p_university, p_audience, p_level, p_faculty));
end;
$$;
revoke all on function public.university_audience_count(integer, text, text, text) from public, anon;
grant execute on function public.university_audience_count(integer, text, text, text) to authenticated;

create or replace function public.university_send_announcement(
  p_university integer, p_title text, p_body text, p_audience text,
  p_level text default null, p_faculty text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text := trim(coalesce(p_title, ''));
  v_body text := trim(coalesce(p_body, ''));
  v_name text;
  v_count integer;
begin
  if not (public.is_university_member(p_university) or public.is_admin()) then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  if not public.is_admin() and not exists (select 1 from public.universities where id = p_university and partner_status = 'partner') then
    raise exception 'Votre établissement doit être approuvé par Uny avant d''envoyer des annonces.' using errcode = 'P0001';
  end if;
  if p_audience not in ('all', 'verified') then
    raise exception 'Destinataires inconnus.' using errcode = 'P0001';
  end if;
  if char_length(v_title) not between 3 and 80 or char_length(v_body) not between 3 and 500 then
    raise exception 'Titre (3 à 80 caractères) et message (3 à 500) requis.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.university_announcements
       where university_id = p_university and created_at > now() - interval '1 day') >= 10 then
    raise exception 'Limite de 10 annonces par jour atteinte.' using errcode = 'P0001';
  end if;

  select coalesce(short_name, name) into v_name from public.universities where id = p_university;
  insert into public.notifications (user_id, type, title, body, link)
  select a.user_id, 'university_announcement', left(format('📣 %s : %s', v_name, v_title), 120), v_body, '/notifications'
    from public.university_audience(p_university, p_audience, p_level, p_faculty) a;
  get diagnostics v_count = row_count;

  insert into public.university_announcements (university_id, title, body, audience, study_level, faculty, recipients, created_by)
  values (p_university, v_title, v_body, p_audience, nullif(p_level, ''), nullif(p_faculty, ''), v_count, auth.uid());
  return v_count;
end;
$$;
revoke all on function public.university_send_announcement(integer, text, text, text, text, text) from public, anon;
grant execute on function public.university_send_announcement(integer, text, text, text, text, text) to authenticated;

-- Étudiants qui ont choisi l'établissement à leur inscription sur Uny
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
revoke all on function public.university_declared_students(integer) from public, anon;
grant execute on function public.university_declared_students(integer) to authenticated;

-- Demander leur matricule aux étudiants déclarés sans demande (une relance par semaine au plus)
create or replace function public.university_invite_declared(p_university integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_count integer;
begin
  if not (public.is_university_member(p_university) or public.is_admin()) then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  if not public.is_admin() and not exists (select 1 from public.universities where id = p_university and partner_status = 'partner') then
    raise exception 'Votre établissement doit être approuvé par Uny avant de confirmer des inscriptions.' using errcode = 'P0001';
  end if;
  select coalesce(short_name, name) into v_name from public.universities where id = p_university;
  insert into public.notifications (user_id, type, title, body, link)
  select p.id, 'university_invite', left(format('%s confirme les inscriptions sur Uny 🎓', v_name), 120),
         'Envoie ton matricule : ton établissement confirme ton inscription et ta carte Uny passe en « Étudiant vérifié ».',
         '/profil/verification'
    from public.profiles p
   where p.university_id = p_university and p.role = 'student' and p.account_status = 'approved'
     and not p.is_test_account and p.verification_status <> 'verified'
     and not exists (select 1 from public.student_enrollments e where e.user_id = p.id and e.university_id = p_university)
     and not exists (select 1 from public.notifications n
                      where n.user_id = p.id and n.type = 'university_invite' and n.created_at > now() - interval '7 days');
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function public.university_invite_declared(integer) from public, anon;
grant execute on function public.university_invite_declared(integer) to authenticated;
