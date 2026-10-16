-- =============================================================================
-- Papel ERP — Historique RÉEL du projet (business plan « Projet_Papel_Business_Plan.xlsx », onglet
-- Investissements, situation au 10/10/2026). À CHARGER AUSSI EN PRODUCTION, une seule fois, après
-- donnees-initiales.sql. Montants en GNF tels que payés ; l'équivalent USD et le taux sont rappelés.
--   - investissements (terrain, machines, groupe, transport et douane des machines, hangar) : factures
--     fournisseurs de nature « investissement », réglées à leur date ;
--   - financement reçu (7 000 000 000 GNF) : entrées sur le compte « Banque – financement du projet » ;
--   - commande de matières premières et emballages Lu260113-08 : bon de commande, facture réglée,
--     expédition de 14 conteneurs en cours (transport 104 340 USD à 9 550, non encore payé).
-- Le solde du compte de financement est négatif (−2 779 045 516 GNF) : le fichier ne liste que 7 Md GNF
-- de financement pour 9,78 Md GNF payés. Saisir les apports manquants dans Finance → Trésorerie.
-- =============================================================================

insert into public.comptes_tresorerie (libelle, type_compte, devise, compte_comptable, solde_initial, date_solde_initial, ordre)
values ('Banque – financement du projet', 'banque', 'GNF', '5213', 0, '2025-05-01', 6)
on conflict (libelle) do nothing;

do $$
declare
  v_compte uuid := (select id from public.comptes_tresorerie where libelle = 'Banque – financement du projet');
  v_lu uuid := '30000000-0000-0000-0000-000000000011';
  v_bc uuid;
  v_ct uuid;
  v_ff uuid;
  v_reg uuid;
  r record;
begin
  -- Financement reçu (colonne « Encaissement ») ; deux dates manquent dans le fichier : date du paiement lié.
  insert into public.mouvements_tresorerie (compte_id, date_operation, sens, montant, montant_gnf, origine, libelle, reference)
  values
    (v_compte, '2025-05-08', 'entree', 2000000000, 2000000000, 'autre', 'Financement du projet (apport)', 'Business plan'),
    (v_compte, '2025-11-07', 'entree', 2000000000, 2000000000, 'autre', 'Financement du projet (apport)', 'Business plan'),
    (v_compte, '2026-04-16', 'entree', 2000000000, 2000000000, 'autre', 'Financement du projet (apport) – date à confirmer', 'Business plan'),
    (v_compte, '2026-07-21', 'entree', 1000000000, 1000000000, 'autre', 'Financement du projet (apport) – date à confirmer', 'Business plan');

  -- Commande de matières premières et emballages : lignes = quantités et prix unitaires du business plan
  -- (coûts variables pour 100 t) ; montant réellement payé : 117 578 USD (1 107 586 644 GNF au taux de 9 420).
  insert into public.bons_commande (numero, fournisseur_id, date_commande, devise, taux_change, frais_estimes_gnf, statut, notes)
  values (public.prochain_numero('BC-2026-'), v_lu, '2026-01-13', 'USD', 9420,
          -- Frais d'approche prévus (HT) : transport 104 340 USD à 9 550 + droits de douane 23 677 USD à 9 450
          -- (la TVA d'import de 46 323 USD est récupérable : ce n'est pas un coût).
          996447000 + 223746007, 'envoye',
          'Proforma Lu260113-08. Payé 117 578 USD (1 107 586 644 GNF) le 16/04/2026. Lignes : quantités et prix du business plan.')
  returning id into v_bc;
  insert into public.lignes_bc (bc_id, article_id, quantite, prix_unitaire) values
    (v_bc, '40000000-0000-0000-0000-000000000001', 100000, 0.96),    -- pâte vierge : 960 USD/t
    (v_bc, '40000000-0000-0000-0000-000000000002', 5200, 1.617),     -- film : 1 617 USD/t
    (v_bc, '40000000-0000-0000-0000-000000000011', 3075, 2.643),     -- sacs par 10 : 2 643 USD/t
    (v_bc, '40000000-0000-0000-0000-000000000012', 1606, 2.643),     -- sacs colis de 100 : 2 643 USD/t
    (v_bc, '40000000-0000-0000-0000-000000000013', 73000, 0.083),    -- boîtes
    (v_bc, '40000000-0000-0000-0000-000000000014', 2400, 0.59),      -- cartons de 30 boîtes
    (v_bc, '40000000-0000-0000-0000-000000000015', 343.2, 4.028),    -- encre blanche : 4 028 USD/t
    (v_bc, '40000000-0000-0000-0000-000000000016', 686.4, 5.387);    -- encres de couleur : 5 387 USD/t
  insert into public.conteneurs (bc_id, reference, poids_net_prevu_kg, notes)
  values (v_bc, 'Lu260113-08 – 14 conteneurs', 100000,
          '14 conteneurs : machines d''emballage et accessoires + matière première. Dates d''embarquement et d''arrivée à saisir.')
  returning id into v_ct;
  insert into public.frais_approche (conteneur_id, type_frais_id, date_frais, devise, montant, taux_change, prestataire, reference)
  select v_ct, t.id, '2026-10-16', 'USD', 10434000, 9550, 'Transport maritime', 'Business plan (en cours)'
  from public.types_frais t where t.libelle = 'Fret maritime';

  -- Factures : investissements et matières. Montants GNF du fichier (l'USD en est déduit au taux indiqué).
  for r in
    select * from (values
      (null::uuid, 'Vendeur du terrain', '', 'Achat du terrain de Coyah (≈ 91 005 USD à 9 450)', 'Investissements : terrains', '2025-09-01'::date, 860000000::bigint, true, null::uuid),
      (v_lu, '', 'Lu250714-21', 'Machines à mouchoirs – acompte 30 % (≈ 60 317 USD à 9 100)', 'Investissements : machines et matériel (transport et douane compris)', '2025-08-05', 548893800, true, null),
      (v_lu, '', 'Lu250714-21', 'Machines à mouchoirs – solde 70 % (≈ 209 978 USD à 9 450)', 'Investissements : machines et matériel (transport et douane compris)', '2026-01-26', 1984289265, true, null),
      (v_lu, '', 'Lu260113-08', 'Matières premières et emballages (≈ 117 578 USD à 9 420)', 'Matières premières et frais d''approche (stockés)', '2026-04-16', 1107586644, true, v_bc),
      (null, 'Fournisseur du groupe électrogène', '', 'Groupe électrogène (≈ 20 200 USD à 9 300)', 'Investissements : machines et matériel (transport et douane compris)', '2026-07-21', 191749798, true, null),
      (null, 'Transport maritime', 'Lu250714-21', 'Transport de 2 conteneurs 40 pieds (machines à mouchoirs)', 'Investissements : machines et matériel (transport et douane compris)', '2026-06-17', 220000000, true, null),
      ('30000000-0000-0000-0000-000000000013', '', 'RIFA260604', 'Dédouanement de 2 conteneurs (machines à mouchoirs)', 'Investissements : machines et matériel (transport et douane compris)', '2026-07-20', 379500000, true, null),
      ('30000000-0000-0000-0000-000000000012', '', '', 'Construction du hangar – situation au 10/10/2026 (en cours)', 'Investissements : constructions (hangar)', '2026-10-10', 4487026009, true, null)
    ) as x(fournisseur, tiers, reference, libelle, categorie, date_facture, montant, paye, bc)
  loop
    insert into public.factures_fournisseurs (fournisseur_id, tiers, reference_fournisseur, libelle, categorie_id, date_facture, date_echeance, montant_ht, bc_id)
    values (r.fournisseur, r.tiers, r.reference, r.libelle, (select id from public.categories_charges where libelle = r.categorie),
            r.date_facture, r.date_facture, r.montant, r.bc)
    returning id into v_ff;
    if r.paye then
      -- Même écriture que regler_facture_fournisseur (le fichier est chargé sans session utilisateur).
      insert into public.reglements_fournisseurs (facture_id, date_reglement, compte_id, montant_gnf, reference)
      values (v_ff, r.date_facture, v_compte, r.montant, 'Business plan')
      returning id into v_reg;
      insert into public.mouvements_tresorerie (compte_id, date_operation, sens, montant, montant_gnf, origine, reglement_id, categorie_id, libelle, reference)
      select v_compte, r.date_facture, 'sortie', r.montant, r.montant, 'fournisseur', v_reg, f.categorie_id,
             'Règlement ' || f.numero || ' – ' || f.beneficiaire, 'Business plan'
      from public.factures_fournisseurs_etat f where f.id = v_ff;
    end if;
  end loop;

  -- Transport des 14 conteneurs : en cours, pas encore payé (date de facture à confirmer).
  insert into public.factures_fournisseurs (tiers, reference_fournisseur, libelle, categorie_id, date_facture, date_echeance, devise, montant_ht, taux_change, bc_id, conteneur_id)
  values ('Transport maritime', 'Lu260113-08', 'Transport de 14 conteneurs (machines d''emballage, accessoires, matière première) – 104 340 USD à 9 550',
          (select id from public.categories_charges where libelle = 'Matières premières et frais d''approche (stockés)'),
          '2026-10-16', '2026-11-15', 'USD', 10434000, 9550, v_bc, v_ct);
end $$;
