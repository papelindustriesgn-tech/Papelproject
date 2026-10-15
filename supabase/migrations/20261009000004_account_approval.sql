-- =============================================================================
-- UNY — validation des inscriptions par l'équipe + veille sur les données
--   • chaque nouveau compte étudiant est « en attente » jusqu'à validation par un admin
--     (les comptes existants restent actifs : l'admin décide lui-même depuis la console)
--   • signaux automatiques : domaine réservé (example.com…), email jetable, rafale
--     d'inscriptions, nom + date de naissance en double
--   • alerte aux admins en cas de rafale ; bilan quotidien des inscriptions à valider
-- =============================================================================

-- Les lignes existantes prennent « approved » ; les nouvelles « pending » (défaut changé ensuite).
alter table public.profiles
  add column account_status text not null default 'approved'
    check (account_status in ('pending', 'approved', 'rejected')),
  add column signup_flags text[] not null default '{}',
  add column reviewed_at timestamptz,
  add column reviewed_by uuid references public.profiles(id) on delete set null,
  add column review_note text check (char_length(review_note) <= 300);
alter table public.profiles alter column account_status set default 'pending';
create index profiles_account_status_idx on public.profiles(account_status, created_at desc);

create or replace function public.is_approved()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and account_status = 'approved');
$$;
grant execute on function public.is_approved() to authenticated;

-- Signaux calculés à la création du profil (et statut forcé pour les comptes non étudiants)
create or replace function public.flag_new_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_domain text := split_part(lower(coalesce(new.email, '')), '@', 2);
  v_flags text[] := '{}';
  v_recent integer;
begin
  if new.role <> 'student' or new.is_test_account then
    new.account_status := 'approved';
    return new;
  end if;
  new.account_status := 'pending';

  if v_domain in ('example.com', 'example.org', 'example.net', 'test.com', 'localhost')
     or v_domain like '%.test' or v_domain like '%.example' or v_domain like '%.invalid' then
    v_flags := array_append(v_flags, 'domaine_reserve');
  end if;
  if v_domain in ('mailinator.com', 'yopmail.com', 'yopmail.fr', 'guerrillamail.com', '10minutemail.com',
                  'tempmail.com', 'temp-mail.org', 'trashmail.com', 'sharklasers.com', 'getnada.com',
                  'dispostable.com', 'maildrop.cc', 'fakeinbox.com', 'mohmal.com') then
    v_flags := array_append(v_flags, 'email_jetable');
  end if;
  select count(*) into v_recent from public.profiles
   where role = 'student' and created_at > now() - interval '10 minutes';
  if v_recent >= 15 then
    v_flags := array_append(v_flags, 'rafale');
  end if;
  if new.birth_date is not null and exists (
       select 1 from public.profiles p
        where lower(p.first_name) = lower(new.first_name) and lower(p.last_name) = lower(new.last_name)
          and p.birth_date = new.birth_date) then
    v_flags := array_append(v_flags, 'identite_double');
  end if;
  new.signup_flags := v_flags;

  -- Rafale : alerte immédiate aux admins (une par heure au plus)
  if 'rafale' = any(v_flags) and not exists (
       select 1 from public.notifications where type = 'data_alert' and created_at > now() - interval '1 hour') then
    insert into public.notifications (user_id, type, title, body, link)
    select id, 'data_alert', 'Alerte : rafale d''inscriptions ⚠️',
           format('%s comptes créés en 10 minutes. Vérifie-les avant de les valider.', v_recent + 1),
           '/admin/inscriptions?filtre=suspects'
      from public.profiles where role = 'admin';
  end if;
  return new;
end;
$$;
revoke execute on function public.flag_new_signup() from public, anon, authenticated;

create trigger profiles_flag_signup before insert on public.profiles
  for each row execute function public.flag_new_signup();

-- Un compte promu partenaire / université / admin n'a pas besoin de validation étudiante
create or replace function public.approve_non_students()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role <> 'student' then
    new.account_status := 'approved';
  end if;
  return new;
end;
$$;
create trigger profiles_role_approved before update of role on public.profiles
  for each row execute function public.approve_non_students();

-- Décision de l'admin (validation, refus ou remise en attente, en lot)
create or replace function public.review_signups(p_ids uuid[], p_decision text, p_note text default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if not public.is_admin() then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  if p_decision not in ('approved', 'rejected', 'pending') then
    raise exception 'Décision inconnue' using errcode = 'P0001';
  end if;
  if cardinality(p_ids) > 1000 then
    raise exception '1 000 comptes au maximum par décision' using errcode = 'P0001';
  end if;
  with changed as (
    update public.profiles
       set account_status = p_decision, reviewed_at = now(), reviewed_by = auth.uid(),
           review_note = nullif(trim(coalesce(p_note, '')), '')
     where id = any(p_ids) and role = 'student' and account_status is distinct from p_decision
    returning id
  ), notified as (
    insert into public.notifications (user_id, type, title, body, link)
    select id, 'account',
           case p_decision when 'approved' then 'Ton inscription est validée 🎉' else 'Inscription non validée' end,
           case p_decision when 'approved' then 'Bienvenue sur Uny ! Ta carte et tes avantages sont maintenant accessibles.'
                else coalesce(nullif(trim(coalesce(p_note, '')), ''),
                              'Ton inscription n''a pas pu être validée. Contacte-nous si c''est une erreur.') end,
           '/accueil'
      from changed where p_decision <> 'pending'
  )
  select count(*) into v_count from changed;
  return v_count;
end;
$$;
revoke all on function public.review_signups(uuid[], text, text) from public, anon;
grant execute on function public.review_signups(uuid[], text, text) to authenticated;

-- Seuls les comptes validés profitent des codes promo et publient sur la marketplace
create or replace function public.require_approved_account()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and not public.is_admin() and not public.is_approved() then
    raise exception 'Ton inscription est en cours de validation par l''équipe Uny.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke execute on function public.require_approved_account() from public, anon, authenticated;
create trigger promo_codes_require_approved before insert on public.promo_codes
  for each row execute function public.require_approved_account();
create trigger marketplace_require_approved before insert on public.marketplace_items
  for each row execute function public.require_approved_account();

-- Relances du questionnaire : uniquement les comptes validés
create or replace function public.send_survey_reminders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_students integer;
  v_partners integer;
begin
  insert into public.notifications (user_id, type, title, body, link)
  select p.id, 'survey', 'Ton avis compte 🙏',
         '5 questions rapides pour choisir les réductions qu''on négocie pour toi.', '/avis'
    from public.profiles p
   where p.role = 'student'
     and p.account_status = 'approved'
     and not p.is_test_account
     and p.created_at < now() - interval '2 days'
     and not exists (select 1 from public.survey_responses s where s.user_id = p.id and s.version >= 2)
     and (select count(*) from public.notifications n where n.user_id = p.id and n.type = 'survey') < 4
     and not exists (select 1 from public.notifications n
                      where n.user_id = p.id and n.type = 'survey' and n.created_at > now() - interval '4 days');
  get diagnostics v_students = row_count;

  insert into public.notifications (user_id, type, title, body, link)
  select distinct on (m.user_id) m.user_id, 'partner_survey', 'Quelles sont vos attentes ? 🤝',
         '1 minute pour nous dire l''avantage que vous pouvez offrir aux étudiants.', '/partenaire/avis'
    from public.partner_members m
    join public.partners pa on pa.id = m.partner_id
    join public.profiles pr on pr.id = m.user_id
   where pa.is_active and not pa.is_demo
     and pr.role <> 'admin' and not pr.is_test_account
     and not exists (select 1 from public.partner_survey_responses r where r.partner_id = m.partner_id)
     and (select count(*) from public.notifications n where n.user_id = m.user_id and n.type = 'partner_survey') < 3
     and not exists (select 1 from public.notifications n
                      where n.user_id = m.user_id and n.type = 'partner_survey' and n.created_at > now() - interval '4 days');
  get diagnostics v_partners = row_count;

  return v_students + v_partners;
end;
$$;

-- Bilan quotidien pour les admins : inscriptions à valider
create or replace function public.data_watch_digest()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pending integer;
  v_flagged integer;
begin
  select count(*), count(*) filter (where cardinality(signup_flags) > 0)
    into v_pending, v_flagged
    from public.profiles where role = 'student' and account_status = 'pending' and not is_test_account;
  if v_pending > 0 then
    insert into public.notifications (user_id, type, title, body, link)
    select id, 'data_digest', format('%s inscription%s à valider', v_pending, case when v_pending > 1 then 's' else '' end),
           case when v_flagged > 0 then format('Dont %s avec un signal suspect.', v_flagged)
                else 'Aucune ne présente de signal suspect.' end,
           '/admin/inscriptions'
      from public.profiles where role = 'admin';
  end if;
end;
$$;
revoke all on function public.data_watch_digest() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('uny-data-watch', '0 8 * * *', 'select public.data_watch_digest()');
  end if;
end;
$$;
