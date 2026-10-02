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
  art_petit uuid := (select id from public.articles where conditionnement_id = (select id from public.conditionnements where produit_id = '10000000-0000-0000-0000-000000000001' and paquets_par_colis = 50));
  art_grand uuid := (select id from public.articles where conditionnement_id = (select id from public.conditionnements where produit_id = '10000000-0000-0000-0000-000000000002' and paquets_par_colis = 30));
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

  -- 30 jours de production : consommation des bobines (plus anciennes d'abord), entrée produits finis, ventes.
  for j in reverse 30..1 loop
    v_date := public.aujourdhui_conakry() - j;
    v_kg_jour := 820 + (j * 71) % 260;
    v_besoin := v_kg_jour;
    for v_lot in
      select l.id, sl.quantite from public.lots l join public.stocks_lots sl on sl.lot_id = l.id
      where sl.quantite > 0 and l.date_reception <= v_date order by l.date_reception, l.numero_lot
    loop
      exit when v_besoin <= 0;
      v_pris := least(v_besoin, v_lot.quantite);
      insert into public.mouvements_stock (date_operation, type, article_id, lot_id, quantite, unite, motif)
      values (v_date, 'consommation', '40000000-0000-0000-0000-000000000001', v_lot.id, -v_pris, 'kg', 'Production du jour');
      v_besoin := v_besoin - v_pris;
    end loop;
    -- 70 % du papier en Petit, 30 % en Grand ; rendement réel ≈ 96 % du théorique ; colis complets.
    v_paq_petit := floor((v_kg_jour - v_besoin) * 0.7 / 1000 * 10175 * 0.96 / 50) * 50;
    v_paq_grand := floor((v_kg_jour - v_besoin) * 0.3 / 1000 * 6508 * 0.96 / 30) * 30;
    insert into public.mouvements_stock (date_operation, type, article_id, quantite, unite, motif) values
      (v_date, 'production', art_petit, v_paq_petit, 'paquet', 'Production du jour'),
      (v_date, 'production', art_grand, v_paq_grand, 'paquet', 'Production du jour'),
      (v_date, 'consommation', '40000000-0000-0000-0000-000000000002', -round(v_paq_petit * 0.0021, 1), 'kg', 'Production du jour'),
      (v_date, 'consommation', '40000000-0000-0000-0000-000000000003', -round(v_paq_grand * 0.0028, 1), 'kg', 'Production du jour'),
      (v_date, 'consommation', '40000000-0000-0000-0000-000000000004', -(v_paq_petit / 50 + v_paq_grand / 30), 'unite', 'Production du jour');
    -- Ventes : environ 85 % de la production, en colis complets.
    insert into public.mouvements_stock (date_operation, type, article_id, quantite, unite, motif) values
      (v_date, 'vente', art_petit, -(floor(v_paq_petit * 0.85 / 50) * 50), 'paquet', 'Livraisons clients (démo)'),
      (v_date, 'vente', art_grand, -(floor(v_paq_grand * 0.85 / 30) * 30), 'paquet', 'Livraisons clients (démo)');
  end loop;
end $$;
