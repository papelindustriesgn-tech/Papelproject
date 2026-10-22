-- Trace de l'étape appliquée séparément en production le 22/10/2026 (contenu déjà inclus dans
-- 20261022000001_ai_agents.sql). Idempotent : sans effet si la migration principale est déjà passée.
alter table public.platform_settings drop constraint if exists platform_settings_key_check;
alter table public.platform_settings add constraint platform_settings_key_check
  check (key in ('student_email', 'deal_alerts', 'survey_reminders', 'ai'));
insert into public.platform_settings (key, value)
values ('ai', '{"enabled": false, "monthly_budget_usd": 0}'::jsonb)
on conflict (key) do nothing;
