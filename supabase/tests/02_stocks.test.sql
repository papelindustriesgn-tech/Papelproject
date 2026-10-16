-- Tests des stocks : stock temps réel, coût moyen pondéré, interdictions, droits, inventaire.
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

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

-- Article de test sans lot, stock vide.
insert into public.articles (id, code, libelle, famille, unite) values
  ('99999999-0000-0000-0000-000000000001', 'TEST-CARTON', 'Carton test', 'emballage', 'unite');

select pg_temp.connecter('magasin');

-- --- Coût moyen pondéré ----------------------------------------------------
insert into public.mouvements_stock (type, article_id, quantite, cout_unitaire_gnf) values ('reception', '99999999-0000-0000-0000-000000000001', 100, 1000);
insert into public.mouvements_stock (type, article_id, quantite, cout_unitaire_gnf) values ('reception', '99999999-0000-0000-0000-000000000001', 300, 2000);
select is((select cmp_gnf from public.stocks_articles where article_id = '99999999-0000-0000-0000-000000000001'), 1750.00::numeric(14,2),
  'CMP = (100 × 1 000 + 300 × 2 000) ÷ 400 = 1 750');

insert into public.mouvements_stock (type, article_id, quantite, motif) values ('sortie', '99999999-0000-0000-0000-000000000001', -40, 'Échantillons');
select is((select quantite from public.stocks_articles where article_id = '99999999-0000-0000-0000-000000000001'), 360.000::numeric(14,3), 'Stock après sortie : 360');
select is((select valeur_gnf from public.mouvements_stock where article_id = '99999999-0000-0000-0000-000000000001' and type = 'sortie'), -70000.00::numeric(16,2),
  'La sortie est valorisée au CMP (40 × 1 750)');
select is((select unite::text from public.mouvements_stock where article_id = '99999999-0000-0000-0000-000000000001' limit 1), 'unite',
  'L''unité du mouvement est imposée par l''article');

-- --- Interdictions ----------------------------------------------------------
select throws_ok($$ insert into public.mouvements_stock (type, article_id, quantite, motif) values ('sortie', '99999999-0000-0000-0000-000000000001', -1000, 'Test') $$,
  '22023', null, 'Stock négatif refusé');
select throws_ok($$ insert into public.mouvements_stock (type, article_id, quantite) values ('reception', '99999999-0000-0000-0000-000000000001', -5) $$,
  '23514', null, 'Une réception ne peut pas être négative');
select throws_ok($$ insert into public.mouvements_stock (type, article_id, quantite) values ('ajustement', '99999999-0000-0000-0000-000000000001', 5) $$,
  '23514', null, 'Un ajustement exige un motif');
select throws_ok($$ insert into public.mouvements_stock (type, article_id, quantite) values ('consommation', '40000000-0000-0000-0000-000000000001', -10) $$,
  '22023', null, 'Une bobine (article suivi par lot) exige un n° de lot');
select throws_ok($$ update public.mouvements_stock set quantite = 1 where article_id = '99999999-0000-0000-0000-000000000001' $$,
  '42501', null, 'Un mouvement ne peut pas être modifié');

-- --- Bobines ----------------------------------------------------------------
select lives_ok($$ select public.receptionner_bobine('40000000-0000-0000-0000-000000000001', 'TEST-0001', 1000, 14000) $$, 'Réception d''une bobine');
select is((select poids_restant_kg from public.etat_lots where numero_lot = 'TEST-0001'), 1000.000::numeric, 'Poids restant de la bobine = poids reçu');
insert into public.mouvements_stock (type, article_id, lot_id, quantite)
select 'consommation', article_id, id, -1000 from public.lots where numero_lot = 'TEST-0001';
select is((select statut::text from public.lots where numero_lot = 'TEST-0001'), 'epuise', 'Bobine entièrement consommée : statut épuisé');

-- --- Inventaire -------------------------------------------------------------
select lives_ok($$ select public.ouvrir_inventaire('Inventaire test', 'emballage') $$, 'Ouverture d''un inventaire');
update public.inventaire_lignes set quantite_comptee = quantite_theorique
  where inventaire_id = (select id from public.inventaires where libelle = 'Inventaire test');
update public.inventaire_lignes set quantite_comptee = 355
  where inventaire_id = (select id from public.inventaires where libelle = 'Inventaire test') and article_id = '99999999-0000-0000-0000-000000000001';
select is((select public.valider_inventaire(id) from public.inventaires where libelle = 'Inventaire test'), 1, 'Validation : un seul écart → un mouvement');
select is((select quantite from public.stocks_articles where article_id = '99999999-0000-0000-0000-000000000001'), 355.000::numeric(14,3), 'Stock aligné sur le comptage');
select pg_temp.deconnecter();

-- --- Droits -----------------------------------------------------------------
select pg_temp.connecter('production');
select throws_ok($$ insert into public.mouvements_stock (type, article_id, quantite, cout_unitaire_gnf) values ('reception', '99999999-0000-0000-0000-000000000001', 10, 1) $$,
  '42501', null, 'La production ne peut pas enregistrer de réception');
select pg_temp.deconnecter();

select pg_temp.connecter('commercial1');
select is((select count(*) from public.mouvements_stock), 0::bigint, 'Un commercial ne voit pas les mouvements de stock');
select pg_temp.deconnecter();

select * from finish();
rollback;
