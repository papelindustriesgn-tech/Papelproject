-- Tests des ventes : prix figé, TVA, numérotation, livraison/stock, paiement, dotation sur encaissé, avoir, droits.
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

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

-- Client grossiste de test (dotation), payé comptant.
insert into public.clients (id, nom, type_client_id, condition_paiement, commercial_id)
values ('70000000-0000-0000-0000-000000000001', 'Client test', (select id from public.types_clients where libelle = 'Grossiste'), 'comptant',
        (select id from public.profils where identifiant = 'commercial1'));

select pg_temp.connecter('finance');
insert into public.pieces_vente (id, type_piece, client_id) values ('71000000-0000-0000-0000-000000000001', 'commande', '70000000-0000-0000-0000-000000000001');
-- 100 colis de 50 Petit 100 = 5 000 paquets au prix de la grille (3 400 GNF HT)
insert into public.lignes_piece (piece_id, conditionnement_id, quantite_colis, paquets, prix_paquet_gnf, montant_ht_gnf)
values ('71000000-0000-0000-0000-000000000001',
        (select id from public.conditionnements where produit_id = '10000000-0000-0000-0000-000000000001' and paquets_par_colis = 50), 100, 1, null, 0);
select is((select paquets from public.lignes_piece where piece_id = '71000000-0000-0000-0000-000000000001'), 5000, 'Colis convertis en paquets');
select is((select prix_paquet_gnf from public.lignes_piece where piece_id = '71000000-0000-0000-0000-000000000001'), 3400::bigint, 'Prix figé depuis la grille');
select matches(public.valider_piece('71000000-0000-0000-0000-000000000001'), '^CMD-\d{4}-\d{5}$', 'Numéro de commande attribué à la validation');
select is((select total_tva_gnf from public.pieces_vente where id = '71000000-0000-0000-0000-000000000001'), 3060000::bigint, 'TVA 18 % sur 17 000 000 GNF HT');
select throws_ok($$ update public.lignes_piece set quantite_colis = 1 where piece_id = '71000000-0000-0000-0000-000000000001' $$, '22023', null, 'Pièce validée : lignes figées');

-- Livraison : sortie de stock
create temporary table t (cle text primary key, id uuid, n bigint);
grant all on t to authenticated;
insert into t select 'stock_avant', null, quantite from public.stocks_articles s join public.articles a on a.id = s.article_id
  where a.conditionnement_id = (select id from public.conditionnements where produit_id = '10000000-0000-0000-0000-000000000001' and paquets_par_colis = 50);
insert into t select 'liv', public.preparer_livraison('71000000-0000-0000-0000-000000000001'), null;
select matches(public.valider_livraison((select id from t where cle = 'liv')), '^BL-', 'Bon de livraison validé');
select is((select quantite from public.stocks_articles s join public.articles a on a.id = s.article_id
           where a.conditionnement_id = (select id from public.conditionnements where produit_id = '10000000-0000-0000-0000-000000000001' and paquets_par_colis = 50)),
          ((select n from t where cle = 'stock_avant') - 5000)::numeric, 'Stock de produits finis diminué de 5 000 paquets');
select throws_ok($$ select public.preparer_livraison('71000000-0000-0000-0000-000000000001') $$, '22023', null, 'Commande entièrement livrée : pas de nouvelle livraison');

-- Facture
insert into t select 'fa', public.transformer_piece('71000000-0000-0000-0000-000000000001', 'facture'), null;
select matches(public.valider_piece((select id from t where cle = 'fa')), '^FA-\d{4}-\d{5}$', 'Facture numérotée');
select throws_ok($$ select public.transformer_piece('71000000-0000-0000-0000-000000000001', 'facture') $$, '22023', null, 'Pas de double facturation');
select is((select total_ttc_gnf from public.pieces_vente where id = (select id from t where cle = 'fa')), 20060000::bigint, 'Facture TTC = 20 060 000 GNF');

-- Paiement partiel → dotation au prorata de l'encaissé (30 % payé → 5 000 × 30 % × 4 % = 60 paquets)
select lives_ok($$ select public.enregistrer_paiement((select id from t where cle = 'fa'), 6018000, (select id from public.modes_paiement where libelle = 'Espèces')) $$, 'Paiement partiel');
select is((select paquets_dus from public.dotations where facture_id = (select id from t where cle = 'fa')), 60, 'Dotation sur l''encaissé uniquement : 60 paquets');
select throws_ok($$ select public.enregistrer_paiement((select id from t where cle = 'fa'), 99999999, (select id from public.modes_paiement where libelle = 'Espèces')) $$,
  '22023', null, 'Paiement supérieur au reste dû refusé');
select lives_ok($$ select public.enregistrer_paiement((select id from t where cle = 'fa'), 14042000, (select id from public.modes_paiement where libelle = 'Espèces')) $$, 'Solde payé');
select is((select paquets_dus from public.dotations where facture_id = (select id from t where cle = 'fa')), 200, 'Facture payée : 4 % de 5 000 = 200 paquets');
select is((select solde_gnf from public.factures_etat where id = (select id from t where cle = 'fa')), 0::bigint, 'Solde nul');
select pg_temp.deconnecter();

-- Droits
select pg_temp.connecter('commercial2');
select is((select count(*) from public.clients where id = '70000000-0000-0000-0000-000000000001'), 0::bigint, 'Un commercial ne voit pas les clients d''un autre');
select throws_ok($$ select public.enregistrer_paiement((select id from public.pieces_vente where type_piece = 'facture' limit 1), 1, (select id from public.modes_paiement limit 1)) $$,
  '42501', null, 'Un commercial ne peut pas enregistrer de paiement');
select pg_temp.deconnecter();
select pg_temp.connecter('magasin');
select throws_ok($$ select public.valider_piece((select id from public.pieces_vente limit 1)) $$, '42501', null, 'Le magasin ne valide pas de pièce de vente');
select pg_temp.deconnecter();

select * from finish();
rollback;
