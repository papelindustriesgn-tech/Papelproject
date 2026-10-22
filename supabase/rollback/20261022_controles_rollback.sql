-- =============================================================================
-- Retour arrière des migrations 20261022100001 (prix étudiant), 20261022100002 (vérification stricte)
-- et 20261022100003 (contrôle des établissements). Aucune donnée supprimée : colonnes et table conservées.
-- Exécuter dans le SQL Editor de Supabase, en une seule fois, APRÈS avoir redéployé le code précédent.
-- =============================================================================

-- Prix étudiant : plus de calcul imposé (les prix déjà calculés restent en place)
drop trigger if exists deals_student_price on public.deals;
drop function if exists public.deals_compute_student_price();

-- Justificatifs : retour à la validation d'origine
drop function if exists public.review_verification(uuid, boolean, text, jsonb, text, text);
alter function public.review_verification_impl(uuid, boolean, text) rename to review_verification;
grant execute on function public.review_verification(uuid, boolean, text) to authenticated;
drop function if exists public.admin_set_verification(uuid, public.verification_status);
alter function public.admin_set_verification_impl(uuid, public.verification_status) rename to admin_set_verification;
grant execute on function public.admin_set_verification(uuid, public.verification_status) to authenticated;
-- Confirmation par l'établissement : ré-exécuter ensuite le fichier
-- supabase/migrations/20261021000004_enrollment_incomplete_decision.sql (version précédente de set_enrollment_status).
alter table public.deals drop constraint if exists deals_verified_only;

-- Établissements : plus de garde-fou ni d'approbation dédiée (le dossier déposé est conservé)
drop trigger if exists universities_partner_guard on public.universities;
drop function if exists public.universities_partner_guard();
drop function if exists public.approve_university(integer, text, text, text, text, boolean, text);
drop function if exists public.university_submit_vetting(integer, text, text, date, text, text, text, text, text);
