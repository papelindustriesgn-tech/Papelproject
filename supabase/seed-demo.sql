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
begin
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

    -- Ventes du jour : environ 85 % de la production validée, en colis complets.
    insert into public.mouvements_stock (date_operation, type, article_id, quantite, unite, motif)
    select v_date, 'vente', a.id, -(floor(sum(fp.paquets) * 0.85 / c.paquets_par_colis) * c.paquets_par_colis), 'paquet', 'Livraisons clients (démo)'
    from public.fiche_productions fp
    join public.fiches_production f on f.id = fp.fiche_id and f.date_production = v_date and f.statut = 'validee'
    join public.conditionnements c on c.id = fp.conditionnement_id
    join public.articles a on a.conditionnement_id = c.id
    group by a.id, c.paquets_par_colis
    having floor(sum(fp.paquets) * 0.85 / c.paquets_par_colis) > 0;
  end loop;
end $$;
