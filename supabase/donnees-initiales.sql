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

-- -----------------------------------------------------------------------------
-- Production : postes, équipes, ligne, causes d'arrêt (modifiables dans Production → Listes de référence).
-- Cadences nominales : à saisir par l'équipe (nécessaires au calcul du TRS).
-- -----------------------------------------------------------------------------
insert into public.postes (libelle, heure_debut, heure_fin, ordre) values
  ('Matin', '06:00', '14:00', 1),
  ('Après-midi', '14:00', '22:00', 2),
  ('Nuit', '22:00', '06:00', 3);

insert into public.equipes (libelle) values ('Équipe A'), ('Équipe B'), ('Équipe C');

insert into public.lignes_production (libelle) values ('Ligne 1');

insert into public.causes_arret (libelle, type_arret) values
  ('Panne mécanique', 'non_planifie'),
  ('Panne électrique', 'non_planifie'),
  ('Coupure de courant / groupe électrogène', 'non_planifie'),
  ('Manque de bobine', 'non_planifie'),
  ('Manque d''emballage', 'non_planifie'),
  ('Bourrage', 'non_planifie'),
  ('Changement de format / réglage', 'non_planifie'),
  ('Problème qualité', 'non_planifie'),
  ('Absence de personnel', 'non_planifie'),
  ('Pause', 'planifie'),
  ('Nettoyage planifié', 'planifie'),
  ('Maintenance préventive', 'planifie');

-- -----------------------------------------------------------------------------
-- Ventes : types de clients (niveau de prix appliqué, dotation oui/non) et modes de paiement.
-- Modifiables dans Ventes → Listes de référence.
-- -----------------------------------------------------------------------------
insert into public.types_clients (libelle, niveau_prix, dotation, ordre) values
  ('Grossiste', 'papel', true, 1),
  ('Semi-grossiste', 'papel', false, 2),
  ('Détaillant', 'papel', false, 3),
  ('Supermarché', 'papel', false, 4),
  ('B2B', 'papel', false, 5);

insert into public.modes_paiement (libelle, ordre) values
  ('Espèces', 1), ('Orange Money', 2), ('MTN Mobile Money', 3), ('Virement bancaire', 4), ('Chèque', 5);

-- -----------------------------------------------------------------------------
-- Achats : types de frais d'approche et de documents (modifiables dans Achats → Listes de référence).
-- -----------------------------------------------------------------------------
insert into public.types_frais (libelle, ordre) values
  ('Fret maritime', 1), ('Assurance', 2), ('Transit', 3), ('Droits et taxes de douane', 4),
  ('Manutention portuaire', 5), ('Transport jusqu''à l''usine', 6), ('Autres frais', 7);

insert into public.types_documents (libelle, ordre) values
  ('Facture fournisseur', 1), ('Connaissement (BL)', 2), ('Packing list', 3), ('Certificat d''origine', 4),
  ('Déclaration en douane', 5), ('Bon de livraison', 6), ('Autre', 7);

-- Logistique : types de dépenses de tournée (modifiables dans Logistique → Listes de référence).
insert into public.types_depenses_tournee (libelle, ordre) values
  ('Carburant', 1), ('Péage et taxes de route', 2), ('Manutention', 3), ('Réparation en route', 4), ('Autre', 9)
on conflict (libelle) do nothing;

-- Qualité : critères de contrôle et types de non-conformité (modifiables dans Qualité → Listes de référence).
-- Tolérances de départ indicatives, à ajuster par le service qualité.
insert into public.criteres_qualite (etape, libelle, type_mesure, unite, valeur_min, valeur_max, ordre) values
  ('reception', 'Grammage', 'mesure', 'g/m²', 12.5, 13.5, 1),
  ('reception', 'Humidité', 'mesure', '%', null, 8, 2),
  ('reception', 'Largeur de la bobine', 'mesure', 'mm', null, null, 3),
  ('reception', 'Aspect (trous, taches, mandrin)', 'visuel', '', null, null, 4),
  ('production', 'Mouchoirs par paquet', 'mesure', 'mouchoirs', 100, 102, 1),
  ('production', 'Longueur du mouchoir', 'mesure', 'mm', 187, 193, 2),
  ('production', 'Soudure du sachet', 'visuel', '', null, null, 3),
  ('production', 'Impression et marquage du lot', 'visuel', '', null, null, 4),
  ('produit_fini', 'Paquets par colis', 'visuel', '', null, null, 1),
  ('produit_fini', 'État du colis (fermeture, étiquette)', 'visuel', '', null, null, 2)
on conflict (etape, libelle) do nothing;

insert into public.types_non_conformite (libelle, ordre) values
  ('Matière première non conforme', 1), ('Défaut de fabrication', 2), ('Emballage / conditionnement', 3),
  ('Réclamation client', 4), ('Hygiène et sécurité', 5), ('Autre', 9)
on conflict (libelle) do nothing;

insert into public.parametres (cle, valeur, libelle, description, categorie, type_valeur, unite) values
  ('tracabilite_fenetre_jours', '30', 'Fenêtre de traçabilité', 'Un lot de produits finis est supposé livré dans les N jours suivant sa production (recherche des clients concernés)', 'qualite', 'entier', 'jours')
on conflict (cle) do nothing;

-- Maintenance : temps d'ouverture servant au calcul du MTBF et de la disponibilité.
insert into public.parametres (cle, valeur, libelle, description, categorie, type_valeur, unite) values
  ('maintenance_heures_ouverture_jour', '16', 'Heures d''ouverture par jour', 'Temps requis des équipements (2 postes de 8 h) pour le MTBF et la disponibilité', 'maintenance', 'nombre', 'h')
on conflict (cle) do nothing;

-- -----------------------------------------------------------------------------
-- Finance : comptes de trésorerie, catégories de charges (comptes SYSCOHADA indicatifs, à valider par le comptable),
-- comptes comptables des journaux exportés.
-- Avant la mise en service : saisir le solde d'ouverture et sa date sur chaque compte (Finance → Listes).
-- -----------------------------------------------------------------------------
insert into public.comptes_tresorerie (libelle, type_compte, devise, compte_comptable, ordre) values
  ('Caisse principale', 'caisse', 'GNF', '5711', 1),
  ('Banque (GNF)', 'banque', 'GNF', '5211', 2),
  ('Banque (USD)', 'banque', 'USD', '5212', 3),
  ('Orange Money', 'mobile', 'GNF', '5851', 4),
  ('MTN Mobile Money', 'mobile', 'GNF', '5852', 5)
on conflict (libelle) do nothing;

update public.modes_paiement m set compte_id = c.id
from public.comptes_tresorerie c
where (m.libelle, c.libelle) in (('Espèces', 'Caisse principale'), ('Orange Money', 'Orange Money'), ('MTN Mobile Money', 'MTN Mobile Money'),
                                 ('Virement bancaire', 'Banque (GNF)'), ('Chèque', 'Banque (GNF)'));

insert into public.categories_charges (libelle, nature, compte_comptable, ordre) values
  ('Matières premières et frais d''approche (stockés)', 'stock', '6021', 1),
  ('Emballages (stockés)', 'stock', '6081', 2),
  ('Pièces détachées (stockées)', 'stock', '6041', 3),
  ('Énergie : électricité, carburant du groupe', 'variable', '6052', 10),
  ('Transport et livraison', 'variable', '6181', 11),
  ('Entretien et réparations', 'variable', '6241', 12),
  ('Commissions et frais commerciaux', 'variable', '6324', 13),
  ('Salaires', 'fixe', '6611', 20),
  ('Charges sociales', 'fixe', '6641', 21),
  ('Loyer', 'fixe', '6222', 22),
  ('Assurances', 'fixe', '6251', 23),
  ('Télécommunications et internet', 'fixe', '6281', 24),
  ('Honoraires (comptable, juriste)', 'fixe', '6324', 25),
  ('Impôts et taxes', 'fixe', '6411', 26),
  ('Frais bancaires', 'fixe', '6311', 27),
  ('Autres charges', 'variable', '6588', 30)
on conflict (libelle) do nothing;

insert into public.parametres (cle, valeur, libelle, description, categorie, type_valeur, unite) values
  ('compta_compte_clients', '"4111"', 'Compte clients', 'Compte collectif des clients (journal des ventes)', 'comptabilite', 'texte', null),
  ('compta_compte_ventes', '"7021"', 'Compte de ventes', 'Ventes de produits finis', 'comptabilite', 'texte', null),
  ('compta_compte_tva_collectee', '"4431"', 'TVA collectée', 'TVA facturée aux clients', 'comptabilite', 'texte', null),
  ('compta_compte_fournisseurs', '"4011"', 'Compte fournisseurs', 'Compte collectif des fournisseurs (journal des achats)', 'comptabilite', 'texte', null),
  ('compta_compte_tva_deductible', '"4452"', 'TVA déductible', 'TVA récupérable sur achats', 'comptabilite', 'texte', null),
  ('compta_compte_virements', '"585"', 'Virements internes', 'Compte de liaison des virements de fonds', 'comptabilite', 'texte', null),
  ('compta_compte_divers', '"4711"', 'Compte d''attente', 'Contrepartie des mouvements de trésorerie divers non classés', 'comptabilite', 'texte', null)
on conflict (cle) do nothing;
