-- =============================================================================
-- Phase 3 – étape 2 : rapport hebdomadaire automatique
-- Une seule fonction agrège les chiffres de la semaine. Elle est exécutée par la tâche planifiée
-- (rôle service_role, clé secrète côté serveur uniquement) : aucun utilisateur ne peut l'appeler,
-- et la tâche n'a pas besoin de lire les tables métier elles-mêmes.
-- =============================================================================

insert into public.parametres (cle, valeur, libelle, description, categorie, type_valeur, unite) values
  ('rapport_destinataires', '""', 'Destinataires du rapport hebdomadaire', 'Adresses e-mail séparées par des virgules (envoi chaque lundi matin)', 'direction', 'texte', null)
on conflict (cle) do nothing;

create or replace function public.rapport_hebdomadaire(p_du date, p_au date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_jours integer := p_au - p_du + 1;
  v_prec_du date := p_du - (p_au - p_du + 1);
  v_prec_au date := p_du - 1;
  r jsonb;
begin
  with ca as (
    select coalesce(sum(case when type_piece = 'facture' then total_ht_gnf else -total_ht_gnf end) filter (where date_piece between p_du and p_au), 0) as ca,
           coalesce(sum(case when type_piece = 'facture' then total_ht_gnf else -total_ht_gnf end) filter (where date_piece between v_prec_du and v_prec_au), 0) as ca_prec
    from public.pieces_vente where type_piece in ('facture', 'avoir') and statut = 'valide' and date_piece between v_prec_du and p_au
  ),
  prod as (
    select coalesce(sum(fp.paquets), 0) as paquets,
           count(distinct f.id) as fiches
    from public.fiches_production f join public.fiche_productions fp on fp.fiche_id = f.id
    where f.statut = 'validee' and f.date_production between p_du and p_au
  ),
  papier as (
    select coalesce(sum(fc.quantite), 0) as kg
    from public.fiches_production f join public.fiche_consommations fc on fc.fiche_id = f.id
    join public.articles a on a.id = fc.article_id and a.suivi_par_lot
    where f.statut = 'validee' and f.date_production between p_du and p_au
  )
  select jsonb_build_object(
    'du', p_du, 'au', p_au, 'jours', v_jours,
    'ca_ht_gnf', (select ca from ca),
    'ca_ht_prec_gnf', (select ca_prec from ca),
    'encaisse_gnf', (select coalesce(sum(montant_gnf), 0) from public.paiements where date_paiement between p_du and p_au),
    'paquets_vendus', (select coalesce(-sum(quantite), 0) from public.mouvements_stock where type = 'vente' and date_operation between p_du and p_au),
    'creances_echues_gnf', (select coalesce(sum(solde_gnf), 0) from public.factures_etat where solde_gnf > 0 and jours_retard > 0),
    'paquets_produits', (select paquets from prod),
    'fiches', (select fiches from prod),
    'kg_papier', (select kg from papier),
    'kg_mp', (select coalesce(sum(quantite), 0) from public.etat_stock where famille = 'matiere_premiere' and unite = 'kg' and actif),
    'kg_transit', (select coalesce(kg_en_transit, 0) from public.transit),
    'tresorerie_gnf', (select coalesce(sum(case when devise = 'USD' then round(solde * taux_actuel / 100) else solde end), 0) from public.soldes_tresorerie where actif),
    'dettes_echues_gnf', (select coalesce(sum(solde_gnf), 0) from public.factures_fournisseurs_etat where solde_gnf > 0 and jours_retard > 0),
    'alertes_stock', (select coalesce(jsonb_agg(libelle || ' : ' || case niveau_alerte when 'rupture' then 'rupture' when 'sous_seuil' then 'sous le seuil' else 'couverture faible' end), '[]'::jsonb) from public.alertes_stock),
    'nc_ouvertes', (select count(*) from public.non_conformites where statut <> 'cloturee'),
    'nc_critiques', (select count(*) from public.non_conformites where statut <> 'cloturee' and gravite = 'critique'),
    'pannes', (select count(*) from public.interventions where type_intervention = 'curative' and arret_machine and (signale_le at time zone 'Africa/Conakry')::date between p_du and p_au),
    'ot_ouverts', (select count(*) from public.interventions where statut in ('demandee', 'en_cours')),
    'bl_non_remis', (select count(*) from public.livraisons where statut = 'validee' and statut_remise = 'a_livrer' and date_livraison < public.aujourdhui_conakry() - 2),
    'destinataires', (select valeur #>> '{}' from public.parametres where cle = 'rapport_destinataires'),
    'entreprise', (select valeur #>> '{}' from public.parametres where cle = 'entreprise_nom')
  ) into r;
  return r;
end $$;

revoke execute on function public.rapport_hebdomadaire(date, date) from public, anon, authenticated;
grant execute on function public.rapport_hebdomadaire(date, date) to service_role;
