-- =============================================================================
-- UNY — envoi automatique des questionnaires
--   • étudiants : invitation à l'inscription (existante) + relances tous les 4 jours,
--     3 au maximum, tant qu'ils n'ont pas répondu au questionnaire actuel (v2+)
--   • partenaires : invitation dès l'ouverture de l'accès + 2 relances
--   • tâche quotidienne à 10 h (heure de Conakry) ; les emails correspondants partent
--     ensuite via /api/cron/questionnaires (si le SMTP est configuré)
-- =============================================================================

alter table public.notifications add column emailed_at timestamptz;
create index notifications_survey_email_idx on public.notifications(created_at)
  where emailed_at is null and type in ('survey', 'partner_survey');

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
revoke all on function public.send_survey_reminders() from public, anon, authenticated;

-- Invitation immédiate quand un partenaire reçoit son accès
create or replace function public.invite_partner_to_survey()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.profiles p where p.id = new.user_id and p.role <> 'admin' and not p.is_test_account)
     and not exists (select 1 from public.partner_survey_responses r where r.partner_id = new.partner_id) then
    insert into public.notifications (user_id, type, title, body, link)
    values (new.user_id, 'partner_survey', 'Quelles sont vos attentes ? 🤝',
            '1 minute pour nous dire l''avantage que vous pouvez offrir aux étudiants.', '/partenaire/avis');
  end if;
  return new;
end;
$$;
revoke execute on function public.invite_partner_to_survey() from public, anon, authenticated;

create trigger on_partner_member_invite_survey
  after insert on public.partner_members
  for each row execute function public.invite_partner_to_survey();

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('uny-survey-reminders', '0 10 * * *', 'select public.send_survey_reminders()');
  end if;
end;
$$;
