-- =============================================================================
-- Décision de la direction : les réglages (entrée des applications et paramètres de calcul)
-- sont réservés à l'administrateur. Les services ne font que les consulter.
-- La fonction garde son nom et sa signature : les règles RLS qui l'utilisent suivent.
-- =============================================================================
create or replace function public.peut_regler_espace(p_espace text)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.est_actif() and public.est_admin();
$$;
