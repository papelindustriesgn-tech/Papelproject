-- =============================================================================
-- Papel ERP — Données de DÉMONSTRATION (local uniquement, JAMAIS en production)
-- Les comptes de démonstration ont un mot de passe connu : Papel2026!
-- =============================================================================

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

-- -----------------------------------------------------------------------------
-- Stocks de démonstration : fournisseurs, articles, 40 bobines reçues sur 60 jours,
-- consommation/production/ventes sur les 30 derniers jours.
-- -----------------------------------------------------------------------------
insert into public.fournisseurs (id, nom, pays, contact) values
  ('30000000-0000-0000-0000-000000000001', 'Fournisseur pâte A (démo)', 'Chine', 'Service export'),
  ('30000000-0000-0000-0000-000000000002', 'Emballages Conakry (démo)', 'Guinée', 'Service commercial');

insert into public.articles (id, code, libelle, famille, categorie_id, unite, suivi_par_lot, seuil_alerte)
select v.id::uuid, v.code, v.libelle, v.famille::public.famille_article,
       (select id from public.categories_articles c where c.libelle = v.categorie),
       v.unite::public.unite_stock, v.lot, v.seuil
from (values
  ('40000000-0000-0000-0000-000000000001', 'MP-BOB-13', 'Bobine jumbo 13 g/m² – 3 plis', 'matiere_premiere', 'Bobines jumbo', 'kg', true, 8000),
  ('40000000-0000-0000-0000-000000000002', 'EMB-FILM-P', 'Film flow-pack Petit 100', 'emballage', 'Films', 'kg', false, 150),
  ('40000000-0000-0000-0000-000000000003', 'EMB-FILM-G', 'Film flow-pack Grand 100', 'emballage', 'Films', 'kg', false, 100),
  ('40000000-0000-0000-0000-000000000004', 'EMB-SAC', 'Sac de colis', 'emballage', 'Sacs', 'unite', false, 1000),
  ('40000000-0000-0000-0000-000000000005', 'EMB-ENCRE', 'Encre d''impression', 'emballage', 'Encres', 'litre', false, 20)
) as v(id, code, libelle, famille, categorie, unite, lot, seuil);

insert into public.clients (nom, type_client_id, responsable, telephone, adresse, quartier_id, condition_paiement, delai_paiement_jours, plafond_credit_gnf, commercial_id)
select v.nom, (select id from public.types_clients where libelle = v.type), v.resp, v.tel, v.adresse,
       (select id from public.quartiers where nom = v.quartier), v.cond, v.delai, v.plafond,
       (select id from public.profils where identifiant = v.commercial)
from (values
  ('Ets Diallo & Frères (démo)', 'Grossiste', 'Alpha Diallo', '+224 621 10 10 01', 'Marché Madina', 'Madina', 'credit', 15, 400000000, 'commercial1'),
  ('Grossiste Bonfi (démo)', 'Grossiste', 'Mamadou Bah', '+224 621 10 10 02', 'Bonfi marché', 'Bonfi', 'credit', 15, 300000000, 'commercial1'),
  ('Kaloum Distribution (démo)', 'Grossiste', 'Fatou Camara', '+224 621 10 10 03', 'Avenue de la République', 'Almamya', 'credit', 30, 500000000, 'commercial2'),
  ('Semi-gros Hamdallaye (démo)', 'Semi-grossiste', 'Ibrahima Sow', '+224 621 10 10 04', 'Carrefour Hamdallaye', 'Hamdallaye', 'comptant', 0, 0, 'commercial2'),
  ('Supermarché Kipé (démo)', 'Supermarché', 'Service achats', '+224 621 10 10 05', 'Route Le Prince', 'Kipé', 'credit', 30, 200000000, 'commercial3'),
  ('Boutique Matoto (démo)', 'Détaillant', 'Aïcha Touré', '+224 621 10 10 06', 'Marché Matoto', 'Matoto-Centre', 'comptant', 0, 0, 'commercial3'),
  ('Hôtel Kaloum (démo)', 'B2B', 'Économat', '+224 621 10 10 07', 'Boulbinet', 'Boulbinet', 'credit', 30, 100000000, 'commercial2'),
  ('Grossiste Coyah (démo)', 'Grossiste', 'Sékou Sylla', '+224 621 10 10 08', 'Marché de Coyah', 'Coyah-Centre', 'credit', 15, 300000000, 'commercial1')
) as v(nom, type, resp, tel, adresse, quartier, cond, delai, plafond, commercial);
-- Clients existants depuis plusieurs mois (seuls les clients créés ensuite comptent comme « nouveaux »).
update public.clients set created_at = now() - interval '120 days';

do $$
declare
  j integer;
  v_date date;
  v_lot record;
  v_besoin numeric;
  v_pris numeric;
  v_kg_jour numeric;
  v_paq_petit integer;
  v_paq_grand integer;
  v_poste record;
  v_fiche uuid;
  v_grand boolean;
  v_facteur numeric;
  v_client uuid;
  v_piece uuid;
  v_livraison uuid;
  v_facture uuid;
  v_ttc bigint;
begin
  -- Les fonctions de vente contrôlent les droits : on agit au nom du compte de démonstration « finance ».
  perform set_config('request.jwt.claims', json_build_object('sub', '20000000-0000-0000-0000-000000000013', 'role', 'authenticated')::text, true);

  -- 40 bobines reçues sur 60 jours (poids 950 à 1 290 kg, coût réel rendu usine ≈ 13 500 GNF/kg).
  for j in 1..40 loop
    perform public.receptionner_bobine(
      '40000000-0000-0000-0000-000000000001', 'JB-2026-' || lpad(j::text, 4, '0'),
      950 + (j * 37) % 340, 13200 + (j * 53) % 600,
      '30000000-0000-0000-0000-000000000001', public.aujourdhui_conakry() - 62 + (j * 3) / 2,
      13, 2700, 1500, 3::smallint, '');
  end loop;

  -- Emballages : réceptions
  insert into public.mouvements_stock (date_operation, type, article_id, quantite, unite, cout_unitaire_gnf, motif) values
    (public.aujourdhui_conakry() - 45, 'reception', '40000000-0000-0000-0000-000000000002', 900, 'kg', 32000, 'Stock initial'),
    (public.aujourdhui_conakry() - 45, 'reception', '40000000-0000-0000-0000-000000000003', 500, 'kg', 32000, 'Stock initial'),
    (public.aujourdhui_conakry() - 45, 'reception', '40000000-0000-0000-0000-000000000004', 9000, 'unite', 1500, 'Stock initial'),
    (public.aujourdhui_conakry() - 45, 'reception', '40000000-0000-0000-0000-000000000005', 60, 'litre', 85000, 'Stock initial');

  -- 30 jours de production : de vraies fiches de poste, validées (consommation des bobines les plus
  -- anciennes d'abord, production, rebuts, arrêts, opérateurs), puis ventes de 85 % de la production.
  insert into public.cadences_nominales (ligne_id, produit_id, paquets_minute)
  select l.id, p.id, case p.code when 'PETIT100' then 12 else 8 end
  from public.lignes_production l cross join public.produits p;

  insert into public.operateurs (nom, prenom, matricule, equipe_id)
  select v.nom, v.prenom, v.matricule, (select id from public.equipes where libelle = v.equipe)
  from (values
    ('Camara', 'Mohamed', 'OP-001', 'Équipe A'), ('Sylla', 'Aminata', 'OP-002', 'Équipe A'), ('Diallo', 'Thierno', 'OP-003', 'Équipe A'),
    ('Bah', 'Mamadou', 'OP-004', 'Équipe B'), ('Soumah', 'Fanta', 'OP-005', 'Équipe B'), ('Keïta', 'Lamine', 'OP-006', 'Équipe B')
  ) as v(nom, prenom, matricule, equipe);

  insert into public.campagnes (libelle, date_debut, date_fin, notes)
  values ('Campagne en cours (démo)', public.aujourdhui_conakry() - 30, public.aujourdhui_conakry() + 30, 'Objectif : assurer les commandes des grossistes');

  insert into public.ordres_fabrication (id, campagne_id, conditionnement_id, ligne_id, quantite_colis, date_debut_prevue, date_fin_prevue, statut)
  values
    ('50000000-0000-0000-0000-000000000001', (select id from public.campagnes limit 1),
     (select id from public.conditionnements where produit_id = '10000000-0000-0000-0000-000000000001' and paquets_par_colis = 50),
     (select id from public.lignes_production limit 1), 6000, public.aujourdhui_conakry() - 30, public.aujourdhui_conakry() + 30, 'planifie'),
    ('50000000-0000-0000-0000-000000000002', (select id from public.campagnes limit 1),
     (select id from public.conditionnements where produit_id = '10000000-0000-0000-0000-000000000002' and paquets_par_colis = 30),
     (select id from public.lignes_production limit 1), 2500, public.aujourdhui_conakry() - 30, public.aujourdhui_conakry() + 30, 'planifie');

  for j in reverse 30..0 loop
    v_date := public.aujourdhui_conakry() - j;
    for v_poste in select * from public.postes where libelle in ('Matin', 'Après-midi') order by ordre loop
      v_fiche := gen_random_uuid();
      -- Le matin : Petit 100 ; l'après-midi : Grand 100.
      v_grand := v_poste.libelle = 'Après-midi';
      insert into public.fiches_production (id, date_production, poste_id, ligne_id, equipe_id, of_id)
      values (v_fiche, v_date, v_poste.id, (select id from public.lignes_production limit 1),
              (select id from public.equipes where libelle = case when v_grand then 'Équipe B' else 'Équipe A' end),
              case when v_grand then '50000000-0000-0000-0000-000000000002'::uuid else '50000000-0000-0000-0000-000000000001'::uuid end);
      insert into public.fiche_operateurs (fiche_id, operateur_id)
      select v_fiche, o.id from public.operateurs o join public.equipes e on e.id = o.equipe_id
      where e.libelle = case when v_grand then 'Équipe B' else 'Équipe A' end;

      -- Papier consommé et variations réalistes (rendement 90 à 101 % du théorique, rebuts 2 à 7 %).
      v_kg_jour := 380 + ((j * 71 + v_poste.ordre * 37) % 140);
      v_facteur := 0.90 + ((j * 13 + v_poste.ordre * 7) % 12) / 100.0;
      v_besoin := v_kg_jour;
      for v_lot in
        select l.id, sl.quantite from public.lots l join public.stocks_lots sl on sl.lot_id = l.id
        where sl.quantite > 0 and l.date_reception <= v_date and l.statut = 'disponible'
        order by l.date_reception, l.numero_lot
      loop
        exit when v_besoin <= 0;
        v_pris := least(v_besoin, v_lot.quantite);
        insert into public.fiche_consommations (fiche_id, article_id, lot_id, quantite)
        values (v_fiche, '40000000-0000-0000-0000-000000000001', v_lot.id, v_pris);
        v_besoin := v_besoin - v_pris;
      end loop;
      v_kg_jour := v_kg_jour - v_besoin;

      if v_grand then
        v_paq_grand := floor(v_kg_jour / 1000 * 6508 * v_facteur / 30) * 30;
        insert into public.fiche_productions (fiche_id, conditionnement_id, paquets, rebuts_kg)
        values (v_fiche, (select id from public.conditionnements where produit_id = '10000000-0000-0000-0000-000000000002' and paquets_par_colis = 30),
                v_paq_grand, round(v_kg_jour * (0.02 + ((j * 3) % 6) / 100.0), 1));
        insert into public.fiche_consommations (fiche_id, article_id, quantite) values
          (v_fiche, '40000000-0000-0000-0000-000000000003', round(v_paq_grand * 0.0028, 1)),
          (v_fiche, '40000000-0000-0000-0000-000000000004', v_paq_grand / 30);
      else
        v_paq_petit := floor(v_kg_jour / 1000 * 10175 * v_facteur / 50) * 50;
        insert into public.fiche_productions (fiche_id, conditionnement_id, paquets, rebuts_kg)
        values (v_fiche, (select id from public.conditionnements where produit_id = '10000000-0000-0000-0000-000000000001' and paquets_par_colis = 50),
                v_paq_petit, round(v_kg_jour * (0.02 + ((j * 5) % 6) / 100.0), 1));
        insert into public.fiche_consommations (fiche_id, article_id, quantite) values
          (v_fiche, '40000000-0000-0000-0000-000000000002', round(v_paq_petit * 0.0021, 1)),
          (v_fiche, '40000000-0000-0000-0000-000000000004', v_paq_petit / 50);
      end if;

      -- Arrêts : pause de 30 min, et des pannes / coupures certains jours.
      insert into public.fiche_arrets (fiche_id, cause_id, duree_min) values (v_fiche, (select id from public.causes_arret where libelle = 'Pause'), 30);
      if (j + v_poste.ordre) % 3 = 0 then
        insert into public.fiche_arrets (fiche_id, cause_id, duree_min, commentaire)
        values (v_fiche, (select id from public.causes_arret where libelle = 'Coupure de courant / groupe électrogène'), 15 + (j * 7) % 40, 'Démarrage du groupe');
      end if;
      if (j * 2 + v_poste.ordre) % 5 = 0 then
        insert into public.fiche_arrets (fiche_id, cause_id, duree_min)
        values (v_fiche, (select id from public.causes_arret where libelle in ('Panne mécanique', 'Bourrage', 'Manque de bobine') order by libelle offset (j % 3) limit 1), 10 + (j * 11) % 50);
      end if;

      -- Toutes les fiches sont validées, sauf celle de l'après-midi d'aujourd'hui (brouillon en cours de saisie).
      if not (j = 0 and v_grand) then
        perform public.valider_fiche_production(v_fiche);
      end if;
    end loop;

    -- Ventes du jour : une commande d'un client (≈ 85 % de la production), livrée et facturée le jour même.
    if j > 0 then
      v_client := (select id from public.clients order by code offset (j % 8) limit 1);
      insert into public.pieces_vente (id, type_piece, client_id, date_piece, commercial_id)
      values (gen_random_uuid(), 'commande', v_client, v_date, (select commercial_id from public.clients where id = v_client))
      returning id into v_piece;
      insert into public.lignes_piece (piece_id, conditionnement_id, quantite_colis, paquets, montant_ht_gnf, prix_paquet_gnf)
      select v_piece, fp.conditionnement_id, floor(sum(fp.paquets) * 0.85 / c.paquets_par_colis)::int, 1, 0, null
      from public.fiche_productions fp
      join public.fiches_production f on f.id = fp.fiche_id and f.date_production = v_date and f.statut = 'validee'
      join public.conditionnements c on c.id = fp.conditionnement_id
      group by fp.conditionnement_id, c.paquets_par_colis
      having floor(sum(fp.paquets) * 0.85 / c.paquets_par_colis) > 0;
      perform public.valider_piece(v_piece);
      v_livraison := public.preparer_livraison(v_piece);
      update public.livraisons set date_livraison = v_date where id = v_livraison;
      perform public.valider_livraison(v_livraison);
      v_facture := public.transformer_piece(v_piece, 'facture');
      update public.pieces_vente set date_piece = v_date where id = v_facture;
      perform public.valider_piece(v_facture);
      -- Paiements : 60 % payées comptant, 25 % partiellement, 15 % impayées.
      v_ttc := (select total_ttc_gnf from public.pieces_vente where id = v_facture);
      if j % 7 not in (2, 5) and j % 4 <> 3 then
        perform public.enregistrer_paiement(v_facture, v_ttc, (select id from public.modes_paiement order by ordre offset (j % 3) limit 1), least(v_date + (j % 5), public.aujourdhui_conakry()), 'Démo');
      elsif j % 4 = 3 then
        perform public.enregistrer_paiement(v_facture, (v_ttc / 2)::bigint, (select id from public.modes_paiement order by ordre offset 1 limit 1), least(v_date + 3, public.aujourdhui_conakry()), 'Acompte démo');
      end if;
    end if;
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Terrain : séries de numérotation, marques concurrentes, points de vente, visites, tournée, objectifs.
-- -----------------------------------------------------------------------------
update public.profils set code_serie = 'C01' where identifiant = 'commercial1';
update public.profils set code_serie = 'C02' where identifiant = 'commercial2';
update public.profils set code_serie = 'C03' where identifiant = 'commercial3';

insert into public.marques_concurrentes (libelle) values ('Marque concurrente A (démo)'), ('Marque concurrente B (démo)'), ('Import Asie (démo)');

do $$
declare
  c1 uuid := '20000000-0000-0000-0000-000000000009';
  c2 uuid := '20000000-0000-0000-0000-000000000010';
  c3 uuid := '20000000-0000-0000-0000-000000000011';
  v_pva record;
  j integer;
  v_visite uuid;
  v_lat float8;
  v_lon float8;
  i integer := 0;
begin
  -- 24 PVA : coordonnées approximatives des quartiers (démo).
  insert into public.pva (id, nom, type_client_id, responsable, telephone, quartier_id, repere, position, precision_m, potentiel_colis_mois, commercial_id, client_id)
  select gen_random_uuid(), v.nom, (select id from public.types_clients where libelle = v.type), v.resp, v.tel,
         (select id from public.quartiers where nom = v.quartier), v.repere,
         extensions.st_setsrid(extensions.st_makepoint(v.lon, v.lat), 4326)::extensions.geography, 8, v.potentiel,
         (select id from public.profils where identifiant = v.commercial),
         (select id from public.clients where nom = v.client)
  from (values
    ('Ets Diallo & Frères', 'Grossiste', 'Alpha Diallo', '+224 621 10 10 01', 'Madina', 'Entrée principale du marché', 9.5372, -13.6771, 400, 'commercial1', 'Ets Diallo & Frères (démo)'),
    ('Grossiste Bonfi', 'Grossiste', 'Mamadou Bah', '+224 621 10 10 02', 'Bonfi', 'Face à la mosquée', 9.5301, -13.6858, 300, 'commercial1', 'Grossiste Bonfi (démo)'),
    ('Grossiste Coyah', 'Grossiste', 'Sékou Sylla', '+224 621 10 10 08', 'Coyah-Centre', 'Gare routière', 9.7071, -13.3845, 250, 'commercial1', 'Grossiste Coyah (démo)'),
    ('Boutique Fatou Madina', 'Détaillant', 'Fatou Keïta', '+224 622 20 20 01', 'Madina', 'Rue des tissus', 9.5385, -13.6760, 15, 'commercial1', null),
    ('Alimentation Bonfi Centre', 'Détaillant', 'Ibrahima Camara', '+224 622 20 20 02', 'Bonfi', 'Carrefour Bonfi', 9.5312, -13.6840, 20, 'commercial1', null),
    ('Semi-gros Coléah', 'Semi-grossiste', 'Oumar Sow', '+224 622 20 20 03', 'Coléah', 'Près du pont', 9.5225, -13.6905, 80, 'commercial1', null),
    ('Kiosque Matam', 'Détaillant', 'Aïssata Barry', '+224 622 20 20 04', 'Coléah', 'Station-service', 9.5240, -13.6880, 10, 'commercial1', null),
    ('Pharmacie Madina (B2B)', 'B2B', 'Dr Condé', '+224 622 20 20 05', 'Madina', 'Boulevard du Commerce', 9.5360, -13.6790, 30, 'commercial1', null),
    ('Kaloum Distribution', 'Grossiste', 'Fatou Camara', '+224 621 10 10 03', 'Almamya', 'Avenue de la République', 9.5095, -13.7118, 500, 'commercial2', 'Kaloum Distribution (démo)'),
    ('Semi-gros Hamdallaye', 'Semi-grossiste', 'Ibrahima Sow', '+224 621 10 10 04', 'Hamdallaye', 'Carrefour Hamdallaye', 9.5605, -13.6548, 120, 'commercial2', 'Semi-gros Hamdallaye (démo)'),
    ('Hôtel Kaloum', 'B2B', 'Économat', '+224 621 10 10 07', 'Boulbinet', 'Corniche', 9.5048, -13.7175, 40, 'commercial2', 'Hôtel Kaloum (démo)'),
    ('Boutique Almamya', 'Détaillant', 'Mariama Sylla', '+224 622 30 30 01', 'Almamya', 'Marché Niger', 9.5110, -13.7100, 12, 'commercial2', null),
    ('Alimentation Sandervalia', 'Détaillant', 'Kémoko Touré', '+224 622 30 30 02', 'Sandervalia', 'Rond-point', 9.5150, -13.7060, 18, 'commercial2', null),
    ('Superette Dixinn', 'Supermarché', 'Gérant', '+224 622 30 30 03', 'Dixinn-Centre', 'Près de l''université', 9.5450, -13.6700, 60, 'commercial2', null),
    ('Boutique Landréah', 'Détaillant', 'Hawa Diallo', '+224 622 30 30 04', 'Landréah', 'Marché Landréah', 9.5510, -13.6650, 10, 'commercial2', null),
    ('Kiosque Belle-Vue', 'Détaillant', 'Saliou Bah', '+224 622 30 30 05', 'Belle-Vue', 'Stade', 9.5480, -13.6620, 8, 'commercial2', null),
    ('Supermarché Kipé', 'Supermarché', 'Service achats', '+224 621 10 10 05', 'Kipé', 'Route Le Prince', 9.6152, -13.6270, 150, 'commercial3', 'Supermarché Kipé (démo)'),
    ('Boutique Matoto', 'Détaillant', 'Aïcha Touré', '+224 621 10 10 06', 'Matoto-Centre', 'Marché Matoto', 9.5795, -13.6005, 25, 'commercial3', 'Boutique Matoto (démo)'),
    ('Semi-gros Enta', 'Semi-grossiste', 'Lansana Camara', '+224 622 40 40 01', 'Enta', 'Carrefour Enta', 9.5900, -13.6150, 90, 'commercial3', null),
    ('Alimentation Gbessia', 'Détaillant', 'Néné Bah', '+224 622 40 40 02', 'Gbessia', 'Aéroport', 9.5770, -13.6120, 15, 'commercial3', null),
    ('Boutique Yimbaya', 'Détaillant', 'Moussa Keïta', '+224 622 40 40 03', 'Yimbaya', 'École', 9.5850, -13.5950, 10, 'commercial3', null),
    ('Kiosque Taouyah', 'Détaillant', 'Djénabou Sow', '+224 622 40 40 04', 'Taouyah', 'Rond-point Taouyah', 9.5700, -13.6450, 9, 'commercial3', null),
    ('Alimentation Nongo', 'Détaillant', 'Abdoulaye Diallo', '+224 622 40 40 05', 'Nongo', 'Marché Nongo', 9.6300, -13.6250, 14, 'commercial3', null),
    ('Superette Cosa', 'Supermarché', 'Gérant', '+224 622 40 40 06', 'Cosa', 'Carrefour Cosa', 9.6050, -13.6350, 50, 'commercial3', null)
  ) as v(nom, type, resp, tel, quartier, repere, lat, lon, potentiel, commercial, client);

  -- Les PVA de démonstration existent depuis deux mois (seuls ceux créés ensuite comptent comme « nouveaux »).
  update public.pva set created_at = now() - interval '60 days';
  -- Deux PVA récemment ouverts par commercial.
  update public.pva set created_at = now() - interval '3 days'
  where id in (select id from public.pva where client_id is null order by nom limit 6);

  -- Visites : chaque PVA visité tous les 3 à 5 jours sur 30 jours ; quelques check-ins hors zone ; ruptures ponctuelles.
  for v_pva in select p.id, p.commercial_id, extensions.st_y(p.position::extensions.geometry) as lat, extensions.st_x(p.position::extensions.geometry) as lon from public.pva p order by p.nom loop
    i := i + 1;
    for j in reverse 30..1 loop
      if (j + i) % (3 + i % 3) = 0 then
        v_visite := gen_random_uuid();
        -- 1 visite sur 12 : check-in à environ 400 m du PVA (hors zone).
        v_lat := v_pva.lat + case when (j * 7 + i * 3) % 13 = 0 then 0.0036 else ((j * 7 + i) % 9 - 4) * 0.00004 end;
        v_lon := v_pva.lon + ((j * 5 + i) % 9 - 4) * 0.00004;
        insert into public.visites (id, pva_id, commercial_id, checkin_at, position, precision_m, stock_papel_colis, rupture, notes)
        values (v_visite, v_pva.id, v_pva.commercial_id,
                (public.aujourdhui_conakry() - j)::timestamp + make_interval(hours => 9 + (i % 7), mins => (j * 7) % 60),
                extensions.st_setsrid(extensions.st_makepoint(v_lon, v_lat), 4326)::extensions.geography, 6 + (j % 10),
                case when (j + i) % 7 = 0 then 0 else 2 + (j * i) % 15 end, (j + i) % 7 = 0,
                case when (j + i) % 7 = 0 then 'Rupture : demande une livraison rapide' else '' end);
        insert into public.visite_prix (visite_id, produit_id, prix_gnf)
        values (v_visite, '10000000-0000-0000-0000-000000000001', case when i % 4 = 0 then 5500 else 5000 end);
        if (j + i) % 5 = 0 then
          insert into public.visite_concurrence (visite_id, marque_id, produit, prix_gnf)
          values (v_visite, (select id from public.marques_concurrentes order by libelle offset (i % 3) limit 1), 'Mouchoirs 100', 4500 + (i % 3) * 250);
        end if;
      end if;
    end loop;
  end loop;

  -- Tournée du jour du commercial 1 : ses 6 premiers PVA.
  insert into public.tournees (id, commercial_id, date_tournee) values ('80000000-0000-0000-0000-000000000001', c1, public.aujourdhui_conakry());
  insert into public.tournee_etapes (tournee_id, pva_id, ordre)
  select '80000000-0000-0000-0000-000000000001', id, row_number() over (order by nom) from public.pva where commercial_id = c1 order by nom limit 6;

  -- Objectifs du mois.
  insert into public.objectifs_commerciaux (commercial_id, mois, visites, nouveaux_pva, ca_ht_gnf, colis)
  select c, date_trunc('month', public.aujourdhui_conakry())::date, 120, 10, 300000000, 1500 from unnest(array[c1, c2, c3]) c;
end $$;

-- -----------------------------------------------------------------------------
-- Achats de démonstration : un conteneur livré (bobines déjà en stock), un en mer, un au port, un bon en brouillon.
-- -----------------------------------------------------------------------------
do $$
declare
  v_bc uuid;
  v_ct uuid;
  f uuid := '30000000-0000-0000-0000-000000000001';
  bob uuid := '40000000-0000-0000-0000-000000000001';
  j date := public.aujourdhui_conakry();
begin
  -- BC 1 : 44 t livrées en deux conteneurs (les 40 bobines de démonstration en proviennent).
  insert into public.bons_commande (id, numero, fournisseur_id, date_commande, devise, taux_change, incoterm, date_livraison_prevue, frais_estimes_gnf, statut)
  values (gen_random_uuid(), public.prochain_numero('BC-' || to_char(j, 'YYYY') || '-'), f, j - 110, 'USD', 9400, 'CFR Conakry', j - 60, 95000000, 'recu')
  returning id into v_bc;
  insert into public.lignes_bc (bc_id, article_id, quantite, prix_unitaire) values (v_bc, bob, 44000, 1.13);
  insert into public.conteneurs (id, bc_id, reference, navire, poids_net_prevu_kg, date_embarquement_prevue, date_embarquement_reelle,
    date_arrivee_port_prevue, date_arrivee_port_reelle, date_dedouanement_prevue, date_dedouanement_reelle, date_livraison_prevue, date_livraison_reelle)
  values (gen_random_uuid(), v_bc, 'MSCU4410227', 'MSC Abidjan', 22000, j - 100, j - 98, j - 72, j - 70, j - 66, j - 64, j - 63, j - 62)
  returning id into v_ct;
  update public.lots set conteneur_id = v_ct where numero_lot <= 'JB-2026-0020';
  insert into public.frais_approche (conteneur_id, type_frais_id, date_frais, devise, montant, prestataire)
  select v_ct, t.id, j - 64, v.devise, v.montant, v.prest from (values
    ('Fret maritime', 'USD', 210000::bigint, 'Armateur (démo)'), ('Transit', 'GNF', 4500000::bigint, 'Transitaire (démo)'),
    ('Droits et taxes de douane', 'GNF', 21000000::bigint, 'Douanes'), ('Transport jusqu''à l''usine', 'GNF', 3500000::bigint, 'Transporteur (démo)')
  ) as v(type, devise, montant, prest) join public.types_frais t on t.libelle = v.type;
  insert into public.conteneurs (id, bc_id, reference, navire, poids_net_prevu_kg, date_embarquement_prevue, date_embarquement_reelle,
    date_arrivee_port_prevue, date_arrivee_port_reelle, date_dedouanement_prevue, date_dedouanement_reelle, date_livraison_prevue, date_livraison_reelle)
  values (gen_random_uuid(), v_bc, 'MSCU4410228', 'MSC Abidjan', 22000, j - 100, j - 98, j - 72, j - 70, j - 66, j - 65, j - 63, j - 61)
  returning id into v_ct;
  update public.lots set conteneur_id = v_ct where numero_lot > 'JB-2026-0020' and conteneur_id is null and numero_lot like 'JB-2026-%';

  -- BC 2 : 40 t, un conteneur en mer et un au port de Conakry.
  insert into public.bons_commande (id, numero, fournisseur_id, date_commande, devise, taux_change, incoterm, date_livraison_prevue, frais_estimes_gnf, statut)
  values (gen_random_uuid(), public.prochain_numero('BC-' || to_char(j, 'YYYY') || '-'), f, j - 40, 'USD', 9450, 'CFR Conakry', j + 12, 90000000, 'envoye')
  returning id into v_bc;
  insert into public.lignes_bc (bc_id, article_id, quantite, prix_unitaire) values (v_bc, bob, 40000, 1.15);
  insert into public.conteneurs (bc_id, reference, navire, poids_net_prevu_kg, date_embarquement_prevue, date_embarquement_reelle, date_arrivee_port_prevue, date_dedouanement_prevue, date_livraison_prevue)
  values (v_bc, 'MSCU5520119', 'Maersk Dakar', 20000, j - 25, j - 24, j + 4, j + 8, j + 10);
  insert into public.conteneurs (id, bc_id, reference, navire, poids_net_prevu_kg, date_embarquement_prevue, date_embarquement_reelle, date_arrivee_port_prevue, date_arrivee_port_reelle, date_dedouanement_prevue, date_livraison_prevue)
  values (gen_random_uuid(), v_bc, 'MSCU5520120', 'Maersk Dakar', 20000, j - 28, j - 27, j - 3, j - 2, j + 2, j + 4)
  returning id into v_ct;
  insert into public.frais_approche (conteneur_id, type_frais_id, date_frais, devise, montant, prestataire)
  select v_ct, t.id, j - 2, 'USD', 190000, 'Armateur (démo)' from public.types_frais t where t.libelle = 'Fret maritime';

  -- BC 3 : emballages en GNF, brouillon ; deux demandes d'achat.
  insert into public.bons_commande (fournisseur_id, date_commande, devise, statut, notes)
  values ('30000000-0000-0000-0000-000000000002', j, 'GNF', 'brouillon', 'Films et sacs pour le mois prochain')
  returning id into v_bc;
  insert into public.lignes_bc (bc_id, article_id, quantite, prix_unitaire) values
    (v_bc, '40000000-0000-0000-0000-000000000002', 500, 32000), (v_bc, '40000000-0000-0000-0000-000000000004', 10000, 1500);
  insert into public.demandes_achat (article_id, quantite, date_besoin, motif, statut, demandeur_id, bc_id) values
    ('40000000-0000-0000-0000-000000000002', 500, j + 20, 'Stock de film bas', 'approuvee', '20000000-0000-0000-0000-000000000004', v_bc),
    ('40000000-0000-0000-0000-000000000005', 40, j + 30, 'Encre pour impression des sachets', 'soumise', '20000000-0000-0000-0000-000000000004', null);
end $$;

-- -----------------------------------------------------------------------------
-- Logistique : véhicules, chauffeurs (dont le compte « logistique »), tournées passées livrées.
-- Les bons de livraison d'hier restent à planifier.
-- -----------------------------------------------------------------------------
insert into public.vehicules (id, immatriculation, libelle, type_vehicule, capacite_colis) values
  ('70000000-0000-0000-0000-000000000001', 'RC-1234-A', 'Camion 10 t', 'Camion', 1500),
  ('70000000-0000-0000-0000-000000000002', 'RC-5678-B', 'Fourgonnette', 'Fourgon', 250);
insert into public.chauffeurs (id, nom, telephone, permis, profil_id) values
  ('71000000-0000-0000-0000-000000000001', 'Mamadou Cissé', '+224 620 00 00 12', 'C', '20000000-0000-0000-0000-000000000012'),
  ('71000000-0000-0000-0000-000000000002', 'Ibrahima Sow', '+224 622 33 44 55', 'C', null);

do $$
declare
  v_jour date;
  v_tournee uuid;
  v_km integer := 48200;
begin
  for v_jour in select distinct date_livraison from public.livraisons where statut = 'validee' and date_livraison < public.aujourdhui_conakry() - 1 order by 1 loop
    insert into public.tournees_livraison (date_tournee, vehicule_id, chauffeur_id, created_by)
    values (v_jour, '70000000-0000-0000-0000-000000000001', ('71000000-0000-0000-0000-00000000000' || (1 + extract(day from v_jour)::int % 2))::uuid, '20000000-0000-0000-0000-000000000012')
    returning id into v_tournee;
    update public.livraisons set tournee_id = v_tournee, ordre = 1, statut_remise = 'livree', receptionnaire = 'Gérant',
           remise_le = (v_jour + time '11:30') at time zone 'Africa/Conakry', remis_par = '20000000-0000-0000-0000-000000000012'
     where date_livraison = v_jour and statut = 'validee';
    update public.tournees_livraison set statut = 'terminee', depart_le = (v_jour + time '08:00') at time zone 'Africa/Conakry',
           retour_le = (v_jour + time '15:00') at time zone 'Africa/Conakry', km_depart = v_km, km_retour = v_km + 60 + extract(day from v_jour)::int
     where id = v_tournee;
    v_km := v_km + 60 + extract(day from v_jour)::int;
    insert into public.depenses_tournee (tournee_id, type_id, montant_gnf)
    values (v_tournee, (select id from public.types_depenses_tournee where libelle = 'Carburant'), 350000 + extract(day from v_jour)::int * 5000);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Qualité : contrôles à réception (une bobine hors tolérance → NC et blocage), contrôles en production,
-- une réclamation client traitée.
-- -----------------------------------------------------------------------------
do $$
declare
  v_lot record;
  v_fiche record;
  v_controle uuid;
  v_nc uuid;
  i integer := 0;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '20000000-0000-0000-0000-000000000007', 'role', 'authenticated')::text, true);
  for v_lot in select id, date_reception from public.lots where numero_lot like 'JB-%' order by date_reception desc limit 6 loop
    i := i + 1;
    insert into public.controles_qualite (etape, date_controle, lot_id, controleur_id) values ('reception', v_lot.date_reception, v_lot.id, '20000000-0000-0000-0000-000000000007') returning id into v_controle;
    insert into public.mesures_controle (controle_id, critere_id, valeur, conforme)
    select v_controle, id, case libelle when 'Grammage' then case when i = 2 then 14.1 else 12.9 + i * 0.05 end when 'Humidité' then 6.5 end, true
    from public.criteres_qualite where etape = 'reception' and libelle in ('Grammage', 'Humidité', 'Aspect (trous, taches, mandrin)');
    perform public.valider_controle(v_controle);
  end loop;

  i := 0;
  for v_fiche in select id, date_production from public.fiches_production where statut = 'validee' order by date_production desc limit 8 loop
    i := i + 1;
    insert into public.controles_qualite (etape, date_controle, fiche_id, controleur_id) values ('production', v_fiche.date_production, v_fiche.id, '20000000-0000-0000-0000-000000000007') returning id into v_controle;
    insert into public.mesures_controle (controle_id, critere_id, valeur, conforme)
    select v_controle, id, case libelle when 'Mouchoirs par paquet' then case when i = 5 then 97 else 100 end when 'Longueur du mouchoir' then 190 end, true
    from public.criteres_qualite where etape = 'production' and libelle in ('Mouchoirs par paquet', 'Longueur du mouchoir', 'Soudure du sachet');
    perform public.valider_controle(v_controle);
  end loop;

  -- Réclamation d'un grossiste, analysée et clôturée.
  insert into public.non_conformites (date_constat, origine, type_id, gravite, description, client_id, cause_racine, created_by)
  values (public.aujourdhui_conakry() - 12, 'client', (select id from public.types_non_conformite where libelle = 'Réclamation client'), 'mineure',
          'Sachets mal soudés sur 2 colis (paquets qui s''ouvrent)', (select id from public.clients order by code limit 1),
          'Température de la barre de soudure trop basse après changement de film', '20000000-0000-0000-0000-000000000007')
  returning id into v_nc;
  insert into public.actions_correctives (nc_id, description, responsable, echeance, realisee_le, efficace)
  values (v_nc, 'Remplacer les 2 colis chez le client', 'Responsable commercial', public.aujourdhui_conakry() - 10, public.aujourdhui_conakry() - 10, true),
         (v_nc, 'Ajouter le réglage de température à la fiche de changement de film', 'Chef de production', public.aujourdhui_conakry() - 5, public.aujourdhui_conakry() - 6, true);
  perform public.cloturer_nc(v_nc);
end $$;

-- -----------------------------------------------------------------------------
-- Maintenance : parc de la ligne 1, pièces de rechange en stock, plans préventifs, 60 jours d'interventions.
-- -----------------------------------------------------------------------------
insert into public.equipements (id, code, libelle, ligne_id, categorie, criticite, marque_modele, date_mise_service) values
  ('80000000-0000-0000-0000-000000000001', 'L1-DER', 'Dérouleur de bobines', (select id from public.lignes_production where libelle = 'Ligne 1'), 'Ligne', 'A', 'Démo', '2026-01-15'),
  ('80000000-0000-0000-0000-000000000002', 'L1-PLI', 'Plieuse – interfolieuse', (select id from public.lignes_production where libelle = 'Ligne 1'), 'Ligne', 'A', 'Démo', '2026-01-15'),
  ('80000000-0000-0000-0000-000000000003', 'L1-SCI', 'Scie de coupe', (select id from public.lignes_production where libelle = 'Ligne 1'), 'Ligne', 'A', 'Démo', '2026-01-15'),
  ('80000000-0000-0000-0000-000000000004', 'L1-ENS', 'Ensacheuse flow-pack', (select id from public.lignes_production where libelle = 'Ligne 1'), 'Ligne', 'A', 'Démo', '2026-01-15'),
  ('80000000-0000-0000-0000-000000000005', 'UT-GE', 'Groupe électrogène 250 kVA', null, 'Utilités', 'A', 'Démo', '2025-12-01'),
  ('80000000-0000-0000-0000-000000000006', 'UT-CMP', 'Compresseur d''air', null, 'Utilités', 'B', 'Démo', '2025-12-01');

insert into public.articles (id, code, libelle, famille, categorie_id, unite, suivi_par_lot, seuil_alerte)
select v.id::uuid, v.code, v.libelle, 'piece_detachee', (select id from public.categories_articles c where c.libelle = v.categorie), 'unite', false, v.seuil
from (values
  ('41000000-0000-0000-0000-000000000001', 'PDR-COUR-PLI', 'Courroie de plieuse', 'Pièces mécaniques', 2),
  ('41000000-0000-0000-0000-000000000002', 'PDR-LAME-SCI', 'Lame de scie circulaire', 'Pièces mécaniques', 2),
  ('41000000-0000-0000-0000-000000000003', 'PDR-RES-SOUD', 'Résistance de soudure ensacheuse', 'Pièces électriques', 3),
  ('41000000-0000-0000-0000-000000000004', 'PDR-ROUL-6205', 'Roulement 6205', 'Pièces mécaniques', 4),
  ('41000000-0000-0000-0000-000000000005', 'PDR-FILT-GE', 'Filtre à huile groupe électrogène', 'Pièces mécaniques', 2)
) as v(id, code, libelle, categorie, seuil);

insert into public.mouvements_stock (date_operation, type, article_id, quantite, unite, cout_unitaire_gnf, motif)
select public.aujourdhui_conakry() - 70, 'reception', v.id::uuid, v.qte, 'unite', v.cout, 'Stock initial démo'
from (values
  ('41000000-0000-0000-0000-000000000001', 4, 450000), ('41000000-0000-0000-0000-000000000002', 3, 1200000),
  ('41000000-0000-0000-0000-000000000003', 6, 350000), ('41000000-0000-0000-0000-000000000004', 10, 85000),
  ('41000000-0000-0000-0000-000000000005', 6, 120000)
) as v(id, qte, cout);

insert into public.equipement_pieces (equipement_id, article_id, critique) values
  ('80000000-0000-0000-0000-000000000002', '41000000-0000-0000-0000-000000000001', true),
  ('80000000-0000-0000-0000-000000000002', '41000000-0000-0000-0000-000000000004', false),
  ('80000000-0000-0000-0000-000000000003', '41000000-0000-0000-0000-000000000002', true),
  ('80000000-0000-0000-0000-000000000004', '41000000-0000-0000-0000-000000000003', true),
  ('80000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000004', false),
  ('80000000-0000-0000-0000-000000000005', '41000000-0000-0000-0000-000000000005', true);

insert into public.plans_preventifs (id, equipement_id, libelle, frequence_jours, duree_estimee_min, consignes, derniere_realisation) values
  ('81000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000002', 'Graissage et contrôle des courroies', 7, 45, 'Graisse au lithium ; tension des courroies', public.aujourdhui_conakry() - 9),
  ('81000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000003', 'Affûtage / changement de lame', 30, 60, '', public.aujourdhui_conakry() - 20),
  ('81000000-0000-0000-0000-000000000003', '80000000-0000-0000-0000-000000000005', 'Vidange et filtre à huile', 15, 90, 'Huile 15W40, 18 L', public.aujourdhui_conakry() - 14),
  ('81000000-0000-0000-0000-000000000004', '80000000-0000-0000-0000-000000000004', 'Nettoyage des mâchoires de soudure', 7, 30, '', public.aujourdhui_conakry() - 3);

do $$
declare
  v_i uuid;
  j integer;
  v_debut timestamptz;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '20000000-0000-0000-0000-000000000006', 'role', 'authenticated')::text, true);
  -- Pannes (curatives, machine arrêtée) réparties sur 60 jours.
  for j in 1..9 loop
    v_debut := ((public.aujourdhui_conakry() - j * 6) + time '09:00' + (j % 4) * interval '2 hours') at time zone 'Africa/Conakry';
    insert into public.interventions (equipement_id, type_intervention, priorite, description, signale_le, signale_par, arret_machine, debut, fin, intervenant, cause, travaux, cout_main_oeuvre_gnf)
    values ((array['80000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000004', '80000000-0000-0000-0000-000000000003', '80000000-0000-0000-0000-000000000005'])[1 + j % 4]::uuid,
            'curative', 'urgente', (array['Courroie cassée', 'Soudure des sachets défaillante', 'Coupe irrégulière', 'Groupe ne démarre pas'])[1 + j % 4],
            v_debut - interval '10 minutes', '20000000-0000-0000-0000-000000000005', true, v_debut, v_debut + (25 + (j * 17) % 90) * interval '1 minute',
            'Moussa Condé', (array['Usure', 'Résistance grillée', 'Lame émoussée', 'Batterie déchargée'])[1 + j % 4], 'Remplacement et essais', 50000)
    returning id into v_i;
    if j % 4 = 0 then insert into public.intervention_pieces (intervention_id, article_id, quantite) values (v_i, '41000000-0000-0000-0000-000000000001', 1); end if;
    if j % 4 = 1 then insert into public.intervention_pieces (intervention_id, article_id, quantite) values (v_i, '41000000-0000-0000-0000-000000000003', 1); end if;
    perform public.terminer_intervention(v_i);
  end loop;
  -- Une panne signalée par la production, pas encore prise en charge.
  insert into public.interventions (equipement_id, type_intervention, priorite, description, signale_par, arret_machine)
  values ('80000000-0000-0000-0000-000000000006', 'curative', 'normale', 'Fuite d''air au niveau du raccord principal', '20000000-0000-0000-0000-000000000005', false);
end $$;

-- -----------------------------------------------------------------------------
-- Finance : soldes d'ouverture, charges récurrentes générées sur 3 mois, factures fournisseurs (conteneurs,
-- énergie, transport) en partie réglées, frais bancaires. Les encaissements clients sont déjà au journal (trigger).
-- -----------------------------------------------------------------------------
update public.comptes_tresorerie set date_solde_initial = public.aujourdhui_conakry() - 90,
       solde_initial = case libelle when 'Caisse principale' then 25000000 when 'Banque (GNF)' then 450000000 when 'Banque (USD)' then 4000000 else 0 end;

do $$
declare
  v_mois date;
  v_f record;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '20000000-0000-0000-0000-000000000013', 'role', 'authenticated')::text, true);
  insert into public.charges_recurrentes (libelle, categorie_id, tiers, montant_gnf, jour_echeance, date_debut) values
    ('Salaires du personnel', (select id from public.categories_charges where libelle = 'Salaires'), 'Personnel', 68000000, 28, date_trunc('month', public.aujourdhui_conakry() - 90)::date),
    ('Charges sociales (CNSS)', (select id from public.categories_charges where libelle = 'Charges sociales'), 'CNSS', 12000000, 15, date_trunc('month', public.aujourdhui_conakry() - 90)::date),
    ('Loyer du terrain de Coyah', (select id from public.categories_charges where libelle = 'Loyer'), 'Propriétaire', 15000000, 5, date_trunc('month', public.aujourdhui_conakry() - 90)::date),
    ('Internet et téléphones', (select id from public.categories_charges where libelle = 'Télécommunications et internet'), 'Opérateur télécom', 2500000, 10, date_trunc('month', public.aujourdhui_conakry() - 90)::date);
  for v_mois in select generate_series(date_trunc('month', public.aujourdhui_conakry() - 60), date_trunc('month', public.aujourdhui_conakry()), interval '1 month')::date loop
    perform public.generer_charges_mois(v_mois);
  end loop;

  -- Variables : énergie (gasoil du groupe) et transport, chaque semaine.
  for v_mois in select generate_series(public.aujourdhui_conakry() - 56, public.aujourdhui_conakry() - 7, interval '7 days')::date loop
    insert into public.factures_fournisseurs (tiers, libelle, categorie_id, date_facture, date_echeance, montant_ht)
    values ('Station Total Coyah', 'Gasoil groupe électrogène', (select id from public.categories_charges where libelle = 'Énergie : électricité, carburant du groupe'), v_mois, v_mois + 7, 9500000),
           ('Transporteur local', 'Livraisons clients', (select id from public.categories_charges where libelle = 'Transport et livraison'), v_mois, v_mois + 15, 4200000);
  end loop;

  -- Bobines : factures des conteneurs livrés (en USD, stockées).
  insert into public.factures_fournisseurs (fournisseur_id, reference_fournisseur, libelle, categorie_id, date_facture, date_echeance, devise, montant_ht, bc_id)
  select b.fournisseur_id, 'INV-' || b.numero, 'Bobines – ' || b.numero, (select id from public.categories_charges where libelle like 'Matières premières%'),
         b.date_commande, b.date_commande + 60, 'USD', (select sum(l.montant_devise) from public.lignes_bc l where l.bc_id = b.id), b.id
  from public.bons_commande b where b.statut <> 'brouillon' and b.devise = 'USD';

  -- Règlements : tout ce qui est échu depuis plus de 10 jours est payé (banque), sauf les bobines (moitié payée).
  for v_f in select * from public.factures_fournisseurs_etat where date_echeance < public.aujourdhui_conakry() - 10 and solde_gnf > 0 order by date_echeance loop
    perform public.regler_facture_fournisseur(v_f.id, (select id from public.comptes_tresorerie where libelle = 'Banque (GNF)'),
      case when v_f.nature = 'stock' then v_f.solde_gnf / 2 else v_f.solde_gnf end, v_f.date_echeance, 'VIR-' || v_f.numero);
  end loop;

  -- Dépôt hebdomadaire des espèces à la banque, frais bancaires mensuels.
  for v_mois in select generate_series(public.aujourdhui_conakry() - 84, public.aujourdhui_conakry() - 7, interval '7 days')::date loop
    continue when (select solde from public.soldes_tresorerie where libelle = 'Caisse principale') <= 5000000;
    perform public.virement_interne((select id from public.comptes_tresorerie where libelle = 'Caisse principale'), (select id from public.comptes_tresorerie where libelle = 'Banque (GNF)'),
      least(60000000, (select solde from public.soldes_tresorerie where libelle = 'Caisse principale') - 5000000)::bigint, v_mois, 'Dépôt des espèces à la banque');
  end loop;
  insert into public.mouvements_tresorerie (compte_id, date_operation, sens, montant, montant_gnf, origine, categorie_id, libelle)
  select (select id from public.comptes_tresorerie where libelle = 'Banque (GNF)'), d, 'sortie', 350000, 350000, 'autre',
         (select id from public.categories_charges where libelle = 'Frais bancaires'), 'Frais de tenue de compte'
  from generate_series(date_trunc('month', public.aujourdhui_conakry() - 60), date_trunc('month', public.aujourdhui_conakry()), interval '1 month') d;
end $$;
