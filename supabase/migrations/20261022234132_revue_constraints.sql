-- Trace de l'étape appliquée séparément en production le 22/10/2026 (contenu déjà inclus dans
-- 20261022200002_support_handoff.sql et 20261022200003_ai_cost_control.sql). Idempotent.
alter table public.ai_conversations drop constraint if exists ai_conversations_status_check;
alter table public.ai_conversations add constraint ai_conversations_status_check
  check (status in ('open', 'handed_off', 'answered', 'closed'));
alter table public.ai_messages drop constraint if exists ai_messages_role_check;
alter table public.ai_messages add constraint ai_messages_role_check
  check (role in ('user', 'assistant', 'notice', 'staff'));
alter table public.ai_runs drop constraint if exists ai_runs_status_check;
alter table public.ai_runs add constraint ai_runs_status_check
  check (status in ('running', 'succeeded', 'failed', 'refused', 'to_reconcile'));
