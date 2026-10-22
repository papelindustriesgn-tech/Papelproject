-- =============================================================================
-- Retour arrière des migrations 20261022200001 → 20261022200004 (correctifs après revue). Aucune donnée supprimée.
-- ⚠ Ne PAS revenir sur 20261022200001 (publish_card_template) : c'est un correctif de sécurité.
-- Exécuter dans le SQL Editor de Supabase APRÈS avoir redéployé le code précédent.
-- =============================================================================

-- 200004 : file de traitement
drop function if exists public.ops_queues();

-- 200003 : coûts IA (les colonnes et l'état « to_reconcile » restent ; ré-exécuter ensuite
-- supabase/migrations/20261022000002_ops_monitoring.sql pour retrouver ops_run_checks / ops_metrics d'origine)
drop function if exists public.ai_reconcile(uuid, numeric, text);
drop function if exists public.ai_mark_stale(integer);
drop function if exists public.ai_close(uuid, text, text, integer, integer, numeric, text);
grant execute on function public.ai_finish(uuid, boolean, text, integer, integer, numeric, text) to service_role;
alter table public.ai_agents drop constraint if exists ai_agents_model_allowed;

-- 200002 : support (états, colonnes et messages conservés)
drop function if exists public.support_retry_notification(uuid);
drop function if exists public.support_answer(uuid, text, uuid);
drop function if exists public.support_notify(uuid);
