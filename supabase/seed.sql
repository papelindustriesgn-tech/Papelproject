-- =============================================================================
-- Papel ERP — Données de démonstration
-- Rejouées par `npx supabase db reset`. NE PAS exécuter en production
-- (les comptes de démonstration ont un mot de passe connu).
-- Mot de passe de tous les comptes de démo : Papel2026!
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
  ('tva_applicable', 'false', 'TVA appliquée sur les factures', 'À confirmer avec le comptable', 'ventes', 'booleen', null),
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
  ('USD', '2026-01-01', 9400, 'Démo'),
  ('USD', '2026-07-01', 9450, 'Démo');

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

-- Prix Papel au paquet (communiqués par la direction). Prix conseillés : valeurs de DÉMONSTRATION à confirmer.
insert into public.grille_prix (produit_id, niveau, prix_paquet_gnf, date_debut, note) values
  ('10000000-0000-0000-0000-000000000001', 'papel', 3400, '2026-01-01', 'Prix distributeur'),
  ('10000000-0000-0000-0000-000000000002', 'papel', 7666, '2026-01-01', 'Prix distributeur'),
  ('10000000-0000-0000-0000-000000000001', 'grossiste', 3600, '2026-01-01', 'Démo – à confirmer'),
  ('10000000-0000-0000-0000-000000000001', 'semi_grossiste', 4000, '2026-01-01', 'Démo – à confirmer'),
  ('10000000-0000-0000-0000-000000000001', 'detaillant', 5000, '2026-01-01', 'Démo – à confirmer'),
  ('10000000-0000-0000-0000-000000000002', 'grossiste', 8000, '2026-01-01', 'Démo – à confirmer'),
  ('10000000-0000-0000-0000-000000000002', 'semi_grossiste', 8500, '2026-01-01', 'Démo – à confirmer'),
  ('10000000-0000-0000-0000-000000000002', 'detaillant', 10000, '2026-01-01', 'Démo – à confirmer');

-- -----------------------------------------------------------------------------
-- Comptes de démonstration (un par rôle). Connexion : identifiant + mot de passe Papel2026!
-- -----------------------------------------------------------------------------
create temporary table demo_comptes (id uuid, identifiant text, nom text, prenom text, telephone text, roles public.role_code[]);
insert into demo_comptes values
  ('20000000-0000-0000-0000-000000000001', 'pdg', 'Camara', 'Aïssatou', '+224 620 00 00 01', '{direction}'),
  ('20000000-0000-0000-0000-000000000002', 'admin', 'Sylla', 'Ibrahima', '+224 620 00 00 02', '{admin}'),
  ('20000000-0000-0000-0000-000000000003', 'achats', 'Barry', 'Mariama', '+224 620 00 00 03', '{achats}'),
  ('20000000-0000-0000-0000-000000000004', 'magasin', 'Soumah', 'Lansana', '+224 620 00 00 04', '{magasin}'),
  ('20000000-0000-0000-0000-000000000005', 'production', 'Keïta', 'Sékou', '+224 620 00 00 05', '{production}'),
  ('20000000-0000-0000-0000-000000000006', 'maintenance', 'Condé', 'Moussa', '+224 620 00 00 06', '{maintenance}'),
  ('20000000-0000-0000-0000-000000000007', 'qualite', 'Bah', 'Fatoumata', '+224 620 00 00 07', '{qualite}'),
  ('20000000-0000-0000-0000-000000000008', 'resp.commercial', 'Touré', 'Alpha', '+224 620 00 00 08', '{responsable_commercial}'),
  ('20000000-0000-0000-0000-000000000009', 'commercial1', 'Diallo', 'Ousmane', '+224 620 00 00 09', '{commercial_terrain}'),
  ('20000000-0000-0000-0000-000000000010', 'commercial2', 'Bangoura', 'Kadiatou', '+224 620 00 00 10', '{commercial_terrain}'),
  ('20000000-0000-0000-0000-000000000011', 'commercial3', 'Kourouma', 'Facinet', '+224 620 00 00 11', '{commercial_terrain}'),
  ('20000000-0000-0000-0000-000000000012', 'logistique', 'Cissé', 'Mamadou', '+224 620 00 00 12', '{logistique}'),
  ('20000000-0000-0000-0000-000000000013', 'finance', 'Sow', 'Hawa', '+224 620 00 00 13', '{finance}');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
select
  '00000000-0000-0000-0000-000000000000', d.id, 'authenticated', 'authenticated',
  d.identifiant || '@papel.local', extensions.crypt('Papel2026!', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}',
  jsonb_build_object('identifiant', d.identifiant, 'nom', d.nom, 'prenom', d.prenom, 'telephone', d.telephone),
  now(), now(), '', '', '', ''
from demo_comptes d;

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), d.id, d.id::text, 'email',
  jsonb_build_object('sub', d.id::text, 'email', d.identifiant || '@papel.local', 'email_verified', true),
  now(), now(), now()
from demo_comptes d;

-- Le profil est créé par le trigger ; on attribue les rôles.
insert into public.utilisateur_roles (utilisateur_id, role)
select d.id, unnest(d.roles) from demo_comptes d;

drop table demo_comptes;
