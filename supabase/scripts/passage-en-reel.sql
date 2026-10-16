-- =============================================================================
-- Papel ERP — Passage en réel : suppression des données de DÉMONSTRATION (à lancer UNE fois).
--
-- Où : supabase.com → projet de l'ERP → « SQL Editor » → « New query » → coller tout ce fichier → « Run ».
--
-- Supprimé : ventes, factures clients, paiements, production, stocks, clients, points de vente, visites,
--            livraisons, contrôles qualité, maintenance, employés, présences, paie et charges fictifs.
-- Gardé    : configuration (prix, produits, articles réels, fournisseurs réels, listes, paramètres),
--            investissements et financement du business plan, commande Lu260113-08 et ses 14 conteneurs,
--            objectifs à partir de novembre 2026, journal d'audit (la suppression y est enregistrée).
-- Comptes  : les comptes de démonstration sont désactivés (mot de passe connu) ; seul « pdg » reste actif.
-- Une seule transaction : en cas d'erreur, rien n'est modifié.
-- =============================================================================
do $$
declare
  v_projet uuid := (select id from public.comptes_tresorerie where libelle = 'Banque – financement du projet');
  v_bc uuid := (select id from public.bons_commande where notes like 'Proforma Lu260113-08%');
  v_ct uuid := (select id from public.conteneurs where reference like 'Lu260113-08%');
  v_pdg uuid := '20000000-0000-0000-0000-000000000001';
  t text;
  n bigint;
  progres boolean;
  passe int;
  r record;
  a_vider text[] := array[
    'visite_concurrence', 'visite_prix', 'pva_photos', 'visites', 'tournee_etapes', 'tournees', 'objectifs_commerciaux',
    'relances', 'dotations', 'paiements', 'depenses_tournee', 'lignes_livraison', 'livraisons', 'tournees_livraison',
    'lignes_piece', 'pieces_vente', 'mesures_controle', 'actions_correctives', 'non_conformites', 'controles_qualite',
    'fiche_operateurs', 'fiche_arrets', 'fiche_consommations', 'fiche_productions', 'fiches_production', 'ordres_fabrication',
    'campagnes', 'operateurs', 'cadences_nominales', 'intervention_pieces', 'interventions', 'plans_preventifs',
    'equipement_pieces', 'equipements', 'mouvements_stock', 'stocks_lots', 'stocks_articles', 'inventaire_lignes', 'inventaires',
    'lots', 'demandes_achat', 'clients', 'pva', 'presences', 'absences', 'bulletins', 'periodes_paie', 'employes', 'fonctions',
    'jours_feries', 'vehicules', 'chauffeurs', 'marques_concurrentes', 'cles_export', 'documents', 'compteurs'];
begin
  if v_projet is null or v_bc is null or v_ct is null then raise exception 'Données réelles introuvables : arrêt, rien n''est modifié.'; end if;
  if exists (select 1 from public.pieces_vente where numero is not null and numero not like '%-2026-%') then
    raise exception 'Des pièces d''une autre année existent : vérifier avant de lancer ce script.';
  end if;

  -- Verrous métier suspendus le temps du nettoyage (journaux inaltérables, pièces figées). Le journal d'audit reste
  -- actif : chaque suppression y est enregistrée. Les clés étrangères restent actives.
  for r in select c.relname tab, tg.tgname nom from pg_trigger tg join pg_class c on c.oid = tg.tgrelid
           join pg_namespace ns on ns.oid = c.relnamespace join pg_proc pr on pr.oid = tg.tgfoid
           where ns.nspname = 'public' and not tg.tgisinternal and pr.proname <> 'journaliser' loop
    execute format('alter table public.%I disable trigger %I', r.tab, r.nom);
  end loop;

  -- Trésorerie et achats : on ne garde que le réel (compte de financement du projet, commande Lu260113-08).
  delete from public.mouvements_tresorerie where compte_id <> v_projet;
  delete from public.reglements_fournisseurs where compte_id <> v_projet;
  delete from public.factures_fournisseurs f
   where not exists (select 1 from public.reglements_fournisseurs rf where rf.facture_id = f.id)
     and f.conteneur_id is distinct from v_ct;
  delete from public.frais_approche where conteneur_id <> v_ct;

  -- Tables entièrement de démonstration : plusieurs passes, l'ordre des clés étrangères se règle tout seul.
  for passe in 1..12 loop
    progres := false;
    foreach t in array a_vider loop
      begin
        execute format('delete from public.%I', t);
        get diagnostics n = row_count;
        if n > 0 then progres := true; end if;
      exception when foreign_key_violation then null;
      end;
    end loop;
    exit when not progres;
  end loop;

  delete from public.conteneurs where id <> v_ct;
  delete from public.lignes_bc where bc_id <> v_bc;
  delete from public.bons_commande where id <> v_bc;
  delete from public.charges_recurrentes where date_fin = '2026-10-31';
  delete from public.objectifs_mensuels where libelle like 'Démonstration%';
  delete from public.articles where id in ('40000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000005')
     or famille = 'piece_detachee';
  delete from public.fournisseurs where id in ('30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002');
  -- Soldes d'ouverture fictifs remis à zéro (à saisir dans Finance → Comptes de trésorerie).
  update public.comptes_tresorerie set solde_initial = 0, date_solde_initial = public.aujourdhui_conakry() where id <> v_projet;

  -- Numérotation : tout repart à 1 ; les factures fournisseurs réelles sont renumérotées dans l'ordre des dates.
  for r in select f.id, f.numero from public.factures_fournisseurs f loop
    update public.factures_fournisseurs set numero = 'TMP-' || r.numero where id = r.id;
  end loop;
  for r in select f.id, f.numero, to_char(f.date_facture, 'YYYY') an, row_number() over (partition by to_char(f.date_facture, 'YYYY') order by f.date_facture, f.numero) rang
           from public.factures_fournisseurs f loop
    update public.mouvements_tresorerie set libelle = replace(libelle, substr(r.numero, 5), 'FF-' || r.an || '-' || lpad(r.rang::text, 5, '0'))
     where reglement_id in (select id from public.reglements_fournisseurs where facture_id = r.id);
    update public.factures_fournisseurs set numero = 'FF-' || r.an || '-' || lpad(r.rang::text, 5, '0') where id = r.id;
  end loop;
  update public.bons_commande set numero = 'BC-2026-00001' where id = v_bc;
  insert into public.compteurs (prefixe, valeur)
  select 'FF-' || to_char(date_facture, 'YYYY') || '-', count(*) from public.factures_fournisseurs group by 1
  union all select 'BC-2026-', 1;

  -- Verrous remis en place.
  for r in select c.relname tab, tg.tgname nom from pg_trigger tg join pg_class c on c.oid = tg.tgrelid
           join pg_namespace ns on ns.oid = c.relnamespace
           where ns.nspname = 'public' and not tg.tgisinternal and tg.tgenabled = 'D' loop
    execute format('alter table public.%I enable trigger %I', r.tab, r.nom);
  end loop;

  -- Comptes de démonstration désactivés (mot de passe connu) : seul le compte « pdg » reste actif.
  update public.profils set actif = false where id <> v_pdg;
  update auth.users set banned_until = now() + interval '100 years' where id <> v_pdg and id in (select id from public.profils);

  raise notice 'Données de démonstration supprimées. Changez maintenant le mot de passe du compte pdg.';
end $$;

-- Vérification : tout doit être à 0 sauf les factures fournisseurs réelles (9) et 1 compte actif.
select (select count(*) from public.pieces_vente) as ventes, (select count(*) from public.mouvements_stock) as mouvements_stock,
       (select count(*) from public.clients) as clients, (select count(*) from public.employes) as employes,
       (select count(*) from public.factures_fournisseurs) as factures_fournisseurs_reelles,
       (select count(*) from public.profils where actif) as comptes_actifs;
