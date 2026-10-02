-- Tests de la production : validation d'une fiche → stocks et coût de revient ; fiche figée ; droits.
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

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

-- Une bobine neuve de 1 000 kg à 14 000 GNF/kg, réservée au test.
select public.receptionner_bobine('40000000-0000-0000-0000-000000000001', 'TEST-PROD-1', 1000, 14000);
create temporary table t (cle text primary key, id uuid);
grant all on t to authenticated;
insert into t select 'lot', id from public.lots where numero_lot = 'TEST-PROD-1';
insert into t select 'cond_petit', id from public.conditionnements where produit_id = '10000000-0000-0000-0000-000000000001' and paquets_par_colis = 50;
insert into t select 'art_petit', id from public.articles where conditionnement_id = (select id from t where cle = 'cond_petit');

select pg_temp.connecter('production');

-- Fiche de nuit (poste qui passe minuit) d'hier.
insert into public.fiches_production (id, date_production, poste_id, ligne_id)
values ('60000000-0000-0000-0000-000000000001', public.aujourdhui_conakry() - 400,
        (select id from public.postes where libelle = 'Nuit'), (select id from public.lignes_production limit 1));
select is((select duree_poste_min from public.fiches_production where id = '60000000-0000-0000-0000-000000000001'), 480,
  'Poste de nuit 22:00 → 06:00 : 480 minutes');

select throws_ok($$ select public.valider_fiche_production('60000000-0000-0000-0000-000000000001') $$, '22023', null, 'Une fiche vide ne se valide pas');

insert into public.fiche_productions (fiche_id, conditionnement_id, paquets, rebuts_kg)
values ('60000000-0000-0000-0000-000000000001', (select id from t where cle = 'cond_petit'), 5000, 20);
select throws_ok($$ select public.valider_fiche_production('60000000-0000-0000-0000-000000000001') $$, '22023', null,
  'Production sans bobine consommée : refusée');

insert into public.fiche_consommations (fiche_id, article_id, lot_id, quantite)
values ('60000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', (select id from t where cle = 'lot'), 500);

select lives_ok($$ select public.valider_fiche_production('60000000-0000-0000-0000-000000000001') $$, 'Validation de la fiche');
select is((select statut::text from public.fiches_production where id = '60000000-0000-0000-0000-000000000001'), 'validee', 'Fiche validée');
select is((select poids_restant_kg from public.etat_lots where numero_lot = 'TEST-PROD-1'), 500.000::numeric, 'La bobine a perdu 500 kg');
select is(
  (select count(*) from public.mouvements_stock where document_id = '60000000-0000-0000-0000-000000000001' and type = 'production' and quantite = 5000),
  1::bigint, 'Entrée de 5 000 paquets en stock');
select is(
  (select cout_matiere_gnf from public.fiches_production where id = '60000000-0000-0000-0000-000000000001'),
  (select -valeur_gnf from public.mouvements_stock where document_id = '60000000-0000-0000-0000-000000000001' and type = 'consommation'),
  'Coût matière de la fiche = valeur des consommations');
select is(
  (select cout_unitaire_gnf * 5000 from public.fiche_productions where fiche_id = '60000000-0000-0000-0000-000000000001'),
  (select round(cout_matiere_gnf / 5000, 2) * 5000 from public.fiches_production where id = '60000000-0000-0000-0000-000000000001'),
  'Coût de revient du paquet = coût matière ÷ paquets (un seul produit)');

-- Fiche figée
select throws_ok($$ update public.fiche_productions set paquets = 1 where fiche_id = '60000000-0000-0000-0000-000000000001' $$, '22023', null,
  'Une fiche validée ne peut plus être modifiée');
select throws_ok($$ delete from public.fiches_production where id = '60000000-0000-0000-0000-000000000001' $$, '22023', null,
  'Une fiche validée ne peut pas être supprimée');
select pg_temp.deconnecter();

-- Droits
select pg_temp.connecter('qualite');
select ok((select count(*) from public.fiches_production) > 0, 'La qualité consulte les fiches');
select throws_ok($$ insert into public.fiches_production (date_production, poste_id, ligne_id)
  values (public.aujourdhui_conakry() - 401, (select id from public.postes where libelle = 'Nuit'), (select id from public.lignes_production limit 1)) $$,
  '42501', null, 'La qualité ne peut pas créer de fiche');
select pg_temp.deconnecter();

select pg_temp.connecter('commercial1');
select is((select count(*) from public.fiches_production), 0::bigint, 'Un commercial ne voit pas la production');
select pg_temp.deconnecter();

select * from finish();
rollback;
