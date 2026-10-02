-- Tests du terrain : synchronisation idempotente, check-in GPS, numérotation hors ligne, prix imposé, isolement des commerciaux.
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

create or replace function pg_temp.connecter(p_identifiant text) returns void language plpgsql as $$
declare v_id uuid;
begin
  select id into v_id from public.profils where identifiant = p_identifiant;
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_id, 'role', 'authenticated')::text, true);
end $$;
create or replace function pg_temp.deconnecter() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end $$;

create temporary table r (cle text primary key, res jsonb);
grant all on r to authenticated;

select pg_temp.connecter('commercial1');

-- Nouveau PVA créé hors ligne (position GPS du téléphone), puis visite sur place, puis visite à 400 m.
insert into r values ('lot1', public.synchroniser_terrain(jsonb_build_array(
  jsonb_build_object('id', 'op1', 'type', 'pva', 'donnees', jsonb_build_object(
    'id', '90000000-0000-0000-0000-000000000001', 'nom', 'PVA test', 'type_client_id', (select id from public.types_clients where libelle = 'Détaillant'),
    'latitude', 9.5400, 'longitude', -13.6800, 'precision_m', 8)),
  jsonb_build_object('id', 'op2', 'type', 'visite', 'donnees', jsonb_build_object(
    'id', '91000000-0000-0000-0000-000000000001', 'pva_id', '90000000-0000-0000-0000-000000000001', 'checkin_at', now(),
    'latitude', 9.5401, 'longitude', -13.6801, 'precision_m', 10, 'rupture', true, 'stock_papel_colis', 0,
    'prix', jsonb_build_array(jsonb_build_object('produit_id', '10000000-0000-0000-0000-000000000001', 'prix_gnf', 5000)))),
  jsonb_build_object('id', 'op3', 'type', 'visite', 'donnees', jsonb_build_object(
    'id', '91000000-0000-0000-0000-000000000002', 'pva_id', '90000000-0000-0000-0000-000000000001', 'checkin_at', now(),
    'latitude', 9.5436, 'longitude', -13.6800, 'precision_m', 10))
)));
select is((select jsonb_agg(e ->> 'statut') from jsonb_array_elements((select res from r where cle = 'lot1')) e), '["ok", "ok", "ok"]'::jsonb, 'Lot synchronisé');
select ok((select dans_zone from public.visites where id = '91000000-0000-0000-0000-000000000001'), 'Check-in à ~15 m : dans la zone');
select ok(not (select dans_zone from public.visites where id = '91000000-0000-0000-0000-000000000002'), 'Check-in à ~400 m : hors zone');
select ok((select distance_m between 350 and 450 from public.visites where id = '91000000-0000-0000-0000-000000000002'), 'Distance calculée par PostGIS');

-- Renvoi du même lot (réseau coupé pendant la réponse) : aucun doublon.
insert into r values ('lot2', public.synchroniser_terrain(jsonb_build_array(
  jsonb_build_object('id', 'op2', 'type', 'visite', 'donnees', jsonb_build_object(
    'id', '91000000-0000-0000-0000-000000000001', 'pva_id', '90000000-0000-0000-0000-000000000001', 'checkin_at', now())))));
select is((select res -> 0 ->> 'statut' from r where cle = 'lot2'), 'deja', 'Visite déjà reçue : ignorée');
select is((select count(*) from public.visites where pva_id = '90000000-0000-0000-0000-000000000001'), 2::bigint, 'Pas de doublon');

-- Le PVA devient client, puis facture hors ligne numérotée dans la série C01.
insert into r values ('lot3', public.synchroniser_terrain(jsonb_build_array(
  jsonb_build_object('id', 'op4', 'type', 'client', 'donnees', jsonb_build_object(
    'id', '92000000-0000-0000-0000-000000000001', 'pva_id', '90000000-0000-0000-0000-000000000001', 'nom', 'PVA test',
    'type_client_id', (select id from public.types_clients where libelle = 'Détaillant'))),
  jsonb_build_object('id', 'op5', 'type', 'piece', 'donnees', jsonb_build_object(
    'id', '93000000-0000-0000-0000-000000000001', 'type_piece', 'facture', 'numero', 'FA-2026-C01-00001',
    'client_id', '92000000-0000-0000-0000-000000000001', 'date_piece', public.aujourdhui_conakry(),
    'lignes', jsonb_build_array(jsonb_build_object('conditionnement_id',
      (select id from public.conditionnements where produit_id = '10000000-0000-0000-0000-000000000001' and paquets_par_colis = 50),
      'quantite_colis', 2, 'prix_paquet_gnf', 3400))))
)));
select is((select jsonb_agg(e ->> 'statut') from jsonb_array_elements((select res from r where cle = 'lot3')) e), '["ok", "ok"]'::jsonb, 'Client et facture synchronisés');
select is((select numero || ' ' || statut from public.pieces_vente where id = '93000000-0000-0000-0000-000000000001'), 'FA-2026-C01-00001 valide', 'Facture validée avec le numéro du téléphone');
select is((select total_ttc_gnf from public.pieces_vente where id = '93000000-0000-0000-0000-000000000001'), 401200::bigint, 'Total : 100 paquets × 3 400 + TVA');

-- Numéro hors série et prix modifié : refusés, sans bloquer le reste du lot.
insert into r values ('lot4', public.synchroniser_terrain(jsonb_build_array(
  jsonb_build_object('id', 'op6', 'type', 'piece', 'donnees', jsonb_build_object(
    'id', '93000000-0000-0000-0000-000000000002', 'type_piece', 'facture', 'numero', 'FA-2026-C02-00001',
    'client_id', '92000000-0000-0000-0000-000000000001', 'date_piece', public.aujourdhui_conakry(),
    'lignes', jsonb_build_array(jsonb_build_object('conditionnement_id',
      (select id from public.conditionnements where produit_id = '10000000-0000-0000-0000-000000000001' and paquets_par_colis = 50), 'quantite_colis', 1, 'prix_paquet_gnf', 3400)))),
  jsonb_build_object('id', 'op7', 'type', 'piece', 'donnees', jsonb_build_object(
    'id', '93000000-0000-0000-0000-000000000003', 'type_piece', 'devis', 'numero', 'DEV-2026-C01-00001',
    'client_id', '92000000-0000-0000-0000-000000000001', 'date_piece', public.aujourdhui_conakry(),
    'lignes', jsonb_build_array(jsonb_build_object('conditionnement_id',
      (select id from public.conditionnements where produit_id = '10000000-0000-0000-0000-000000000001' and paquets_par_colis = 50), 'quantite_colis', 1, 'prix_paquet_gnf', 3000)))),
  jsonb_build_object('id', 'op8', 'type', 'visite', 'donnees', jsonb_build_object(
    'id', '91000000-0000-0000-0000-000000000003', 'pva_id', '90000000-0000-0000-0000-000000000001', 'checkin_at', now()))
)));
select is((select res -> 0 ->> 'statut' from r where cle = 'lot4'), 'erreur', 'Numéro d''une autre série refusé');
select matches((select res -> 1 ->> 'message' from r where cle = 'lot4'), 'Prix différent de la grille', 'Prix modifié refusé');
select is((select res -> 2 ->> 'statut' from r where cle = 'lot4'), 'ok', 'Les autres opérations du lot passent');
select is((select count(*) from public.pieces_vente where id in ('93000000-0000-0000-0000-000000000002', '93000000-0000-0000-0000-000000000003')), 0::bigint, 'Rien n''est enregistré pour les opérations refusées');
update public.visites set rupture = false where id = '91000000-0000-0000-0000-000000000001';
select ok((select rupture from public.visites where id = '91000000-0000-0000-0000-000000000001'), 'Une visite ne peut pas être modifiée (aucune règle ne l''autorise, et le trigger le refuse)');
select pg_temp.deconnecter();

-- Isolement
select pg_temp.connecter('commercial2');
select is((select count(*) from public.pva where id = '90000000-0000-0000-0000-000000000001'), 0::bigint, 'Un commercial ne voit pas les PVA d''un autre');
select pg_temp.deconnecter();
select pg_temp.connecter('resp.commercial');
select is((select count(*) from public.visites where pva_id = '90000000-0000-0000-0000-000000000001'), 3::bigint, 'Le responsable commercial voit toutes les visites');
select pg_temp.deconnecter();

select * from finish();
rollback;
