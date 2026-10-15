-- =============================================================================
-- UNY — sécurité : les fonctions internes ne sont plus appelables via l'API
--   • fonctions de déclencheurs (exécutées automatiquement par la base)
--   • expire_enrollments (lancée uniquement par la tâche planifiée pg_cron)
-- Les déclencheurs et la tâche planifiée continuent de fonctionner : le droit EXECUTE
-- n'est pas vérifié quand un déclencheur s'exécute, et pg_cron tourne en « postgres ».
-- =============================================================================

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_app_metadata_change() from public, anon, authenticated;
revoke execute on function public.handle_user_email_change() from public, anon, authenticated;
revoke execute on function public.on_marketplace_moderated() from public, anon, authenticated;
revoke execute on function public.on_verification_submitted() from public, anon, authenticated;
revoke execute on function public.expire_enrollments() from public, anon, authenticated;
