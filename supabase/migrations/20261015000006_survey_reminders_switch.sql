-- =============================================================================
-- UNY — interrupteur des relances du questionnaire
--   platform_settings « survey_reminders » = {"enabled": false} : aucune relance (pg_cron ou Vercel Cron).
-- =============================================================================

alter table public.platform_settings drop constraint platform_settings_key_check;
alter table public.platform_settings add constraint platform_settings_key_check
  check (key in ('student_email', 'deal_alerts', 'survey_reminders'));

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
  -- Relances en pause (période de démo et de tests)
  if not coalesce((select (value ->> 'enabled')::boolean from public.platform_settings where key = 'survey_reminders'), true) then
    return 0;
  end if;
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
