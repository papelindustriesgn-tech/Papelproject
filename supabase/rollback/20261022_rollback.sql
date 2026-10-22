-- =============================================================================
-- Retour arrière des migrations 20261022000001 (agents IA) et 20261022000002 (surveillance).
-- En général inutile : désactiver l'IA dans /admin/ia suffit, et l'ancien code ignore ces tables.
-- Ne supprime aucune donnée : les tables ai_* et ops_* sont conservées (lecture réservée aux administrateurs).
-- Exécuter dans le SQL Editor de Supabase, en une seule fois, APRÈS avoir redéployé le code précédent.
-- =============================================================================
drop function if exists public.ops_run_checks();
drop function if exists public.ops_metrics(integer);
drop function if exists public.ops_alert_update(uuid, text, text);
drop function if exists public.ops_raise(text, text, text, text, jsonb);
drop function if exists public.ops_job_begin(text, text, integer);
drop function if exists public.ops_job_finish(uuid, boolean, text, jsonb);
drop function if exists public.ai_reserve(text, uuid, numeric);
drop function if exists public.ai_finish(uuid, boolean, text, integer, integer, numeric, text);
drop function if exists public.ai_configure(text, boolean, numeric, integer, integer);
drop function if exists public.ai_approval_request(text, text, jsonb, uuid);
drop function if exists public.ai_approval_decide(uuid, boolean);
drop function if exists public.ai_approval_consume(uuid, text, jsonb);
drop function if exists public.ai_action_hash(text, jsonb);
-- Interrupteur IA : mis à « désactivé » plutôt que supprimé
update public.platform_settings set value = '{"enabled": false, "monthly_budget_usd": 0}'::jsonb where key = 'ai';
