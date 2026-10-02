-- =============================================================================
-- Papel ERP — Configuration initiale (À CHARGER AUSSI EN PRODUCTION, une seule fois)
-- Valeurs de départ communiquées par la direction. Tout est ensuite MODIFIABLE
-- dans l'interface (Administration) : rien n'est figé dans le code.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Paramètres métier
-- -----------------------------------------------------------------------------
insert into public.parametres (cle, valeur, libelle, description, categorie, type_valeur, unite) values
  ('entreprise_nom', '"Papel Industries"', 'Raison sociale', 'Apparaît sur les devis et factures', 'entreprise', 'texte', null),
  ('entreprise_adresse', '"Usine de Coyah, Guinée"', 'Adresse', 'Apparaît sur les devis et factures', 'entreprise', 'texte', null),
  ('entreprise_telephone', '""', 'Téléphone', '', 'entreprise', 'texte', null),
  ('entreprise_nif', '""', 'NIF', 'Numéro d''identification fiscale', 'entreprise', 'texte', null),
  ('entreprise_rccm', '""', 'RCCM', 'Registre du commerce', 'entreprise', 'texte', null),
  ('tva_applicable', 'true', 'TVA ajoutée sur les factures', 'Les prix de la grille sont hors taxes ; la TVA est ajoutée sur la facture', 'ventes', 'booleen', null),
  ('tva_taux', '0.18', 'Taux de TVA', 'Taux légal en Guinée : 18 %', 'ventes', 'pourcentage', null),
  ('taux_usd_gnf_defaut', '9450', 'Taux USD par défaut', 'Utilisé si aucun taux n''est saisi pour la date', 'devises', 'nombre', 'GNF / USD'),
  ('grammage_reference', '13', 'Grammage de référence', 'Par pli', 'production', 'nombre', 'g/m²'),
  ('taux_perte_reference', '0.05', 'Pertes de production de référence', '', 'production', 'pourcentage', null),
  ('seuil_rendement_min', '0.95', 'Alerte rendement faible', 'Alerte si rendement réel < ce % du théorique', 'production', 'pourcentage', null),
  ('seuil_perte_max', '0.05', 'Alerte perte élevée', 'Alerte si taux de perte > ce seuil', 'production', 'pourcentage', null),
  ('seuil_arret_minutes', '30', 'Alerte arrêt long', 'Alerte si un arrêt dépasse cette durée', 'production', 'entier', 'min'),
  ('taux_dotation', '0.04', 'Taux de dotation', 'Paquets offerts pour 100 achetés, sur montants encaissés', 'ventes', 'pourcentage', null),
  ('dotation_types_eligibles', '["grossiste"]', 'Clients éligibles à la dotation', 'Types de clients : grossiste, b2b…', 'ventes', 'liste', null),
  ('stock_jours_couverture_alerte', '15', 'Alerte couverture de stock', 'Alerte si jours de couverture < ce seuil', 'stock', 'entier', 'jours'),
  ('stock_periode_consommation_jours', '30', 'Période de consommation moyenne', 'Pour le calcul des jours de couverture', 'stock', 'entier', 'jours'),
  ('gps_rayon_checkin_m', '100', 'Rayon de check-in', 'Distance maximale entre le commercial et le PVA', 'terrain', 'entier', 'm'),
  ('gps_precision_max_m', '50', 'Précision GPS exigée', 'Au-delà, la position est jugée imprécise', 'terrain', 'entier', 'm');

-- -----------------------------------------------------------------------------
-- Taux de change (historique de démonstration)
-- -----------------------------------------------------------------------------
insert into public.taux_change (devise, date_effet, taux_gnf, note) values
  ('USD', '2026-01-01', 9450, 'Taux de référence initial');

-- -----------------------------------------------------------------------------
-- Géographie (extrait, complétable dans l'interface)
-- -----------------------------------------------------------------------------
insert into public.villes (nom, prefecture, region) values
  ('Conakry', 'Conakry', 'Conakry'),
  ('Coyah', 'Coyah', 'Kindia'),
  ('Dubréka', 'Dubréka', 'Kindia'),
  ('Kindia', 'Kindia', 'Kindia');

insert into public.communes (ville_id, nom)
select v.id, c.nom from public.villes v
join (values
  ('Conakry', 'Kaloum'), ('Conakry', 'Dixinn'), ('Conakry', 'Matam'), ('Conakry', 'Ratoma'), ('Conakry', 'Matoto'),
  ('Coyah', 'Coyah-Centre'), ('Coyah', 'Manéah'), ('Coyah', 'Wonkifong'),
  ('Dubréka', 'Dubréka-Centre'), ('Kindia', 'Kindia-Centre')
) as c(ville, nom) on c.ville = v.nom;

insert into public.quartiers (commune_id, nom)
select c.id, q.nom from public.communes c
join (values
  ('Kaloum', 'Almamya'), ('Kaloum', 'Boulbinet'), ('Kaloum', 'Sandervalia'),
  ('Dixinn', 'Dixinn-Centre'), ('Dixinn', 'Landréah'), ('Dixinn', 'Belle-Vue'),
  ('Matam', 'Madina'), ('Matam', 'Bonfi'), ('Matam', 'Coléah'),
  ('Ratoma', 'Hamdallaye'), ('Ratoma', 'Kipé'), ('Ratoma', 'Taouyah'), ('Ratoma', 'Nongo'), ('Ratoma', 'Cosa'),
  ('Matoto', 'Matoto-Centre'), ('Matoto', 'Enta'), ('Matoto', 'Gbessia'), ('Matoto', 'Yimbaya'),
  ('Coyah-Centre', 'Coyah-Centre'), ('Manéah', 'Manéah-Centre'),
  ('Dubréka-Centre', 'Dubréka-Centre'), ('Kindia-Centre', 'Kindia-Centre')
) as q(commune, nom) on q.commune = c.nom;

-- -----------------------------------------------------------------------------
-- Produits, conditionnements et prix
-- -----------------------------------------------------------------------------
insert into public.produits (id, code, libelle, nb_mouchoirs, plis, longueur_mm, largeur_mm, grammage_g_m2_pli, taux_perte_ref, ordre) values
  ('10000000-0000-0000-0000-000000000001', 'PETIT100', 'Petit 100', 100, 3, 190, 126, 13, 0.05, 1),
  ('10000000-0000-0000-0000-000000000002', 'GRAND100', 'Grand 100', 100, 3, 190, 197, 13, 0.05, 2);

insert into public.conditionnements (produit_id, libelle, paquets_par_colis, par_defaut) values
  ('10000000-0000-0000-0000-000000000001', 'Colis de 50', 50, true),
  ('10000000-0000-0000-0000-000000000001', 'Colis de 80', 80, false),
  ('10000000-0000-0000-0000-000000000001', 'Colis de 100', 100, false),
  ('10000000-0000-0000-0000-000000000002', 'Colis de 30', 30, true);

-- Niveaux de prix (le niveau « papel » est créé par la migration).
insert into public.niveaux_prix (code, libelle, description, ordre) values
  ('grossiste', 'Prix max. grossiste', 'Prix maximum de revente du grossiste au semi-grossiste', 1),
  ('semi_grossiste', 'Prix semi-grossiste', 'Prix de revente du semi-grossiste au détaillant', 2),
  ('detaillant', 'Prix public (détaillant)', 'Prix de vente du détaillant au consommateur', 3);

-- Prix au paquet HORS TAXES, identiques quel que soit le colis (communiqués par la direction).
-- Prix conseillés du Grand 100 : non communiqués, à saisir dans Administration → Produits et prix.
insert into public.grille_prix (produit_id, niveau, prix_paquet_gnf, date_debut, note) values
  ('10000000-0000-0000-0000-000000000001', 'papel', 3400, '2026-01-01', null),
  ('10000000-0000-0000-0000-000000000002', 'papel', 7666, '2026-01-01', null),
  ('10000000-0000-0000-0000-000000000001', 'grossiste', 3600, '2026-01-01', null),
  ('10000000-0000-0000-0000-000000000001', 'semi_grossiste', 4000, '2026-01-01', null),
  ('10000000-0000-0000-0000-000000000001', 'detaillant', 5000, '2026-01-01', null);


-- -----------------------------------------------------------------------------
-- Stocks : catégories d'articles (modifiables dans Magasin → Listes de référence).
-- Les articles produits finis sont créés automatiquement pour chaque conditionnement.
-- -----------------------------------------------------------------------------
insert into public.categories_articles (famille, libelle) values
  ('matiere_premiere', 'Bobines jumbo'),
  ('emballage', 'Films'),
  ('emballage', 'Sacs'),
  ('emballage', 'Boîtes'),
  ('emballage', 'Cartons'),
  ('emballage', 'Encres'),
  ('piece_detachee', 'Pièces mécaniques'),
  ('piece_detachee', 'Pièces électriques');
