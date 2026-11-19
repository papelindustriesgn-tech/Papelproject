-- Parcours commande → préparation → livraison → facture → paiement :
-- 1. suivi des dates (souhaitée, confirmée) sans toucher la commande figée, droits par rôle ;
-- 2. facturation du livré : livraison partielle, plusieurs factures, jamais plus que commandé ;
-- 3. paiement partiel puis solde.
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

create temporary table t (cle text primary key, id uuid);
grant all on t to authenticated;
insert into t values
  ('cond', (select id from public.conditionnements where produit_id = '10000000-0000-0000-0000-000000000001' and paquets_par_colis = 100)),
  ('especes', (select id from public.modes_paiement where libelle = 'Espèces'));
create or replace function pg_temp.id(p text) returns uuid language sql as $$ select id from t where cle = p $$;
grant execute on function pg_temp.id(text) to authenticated;

insert into public.clients (id, nom, type_client_id, condition_paiement) values
  ('7c000000-0000-0000-0000-000000000001', 'Client parcours', (select id from public.types_clients where libelle = 'Détaillant'), 'comptant');

-- Commande de 10 colis (1 000 paquets), validée par les ventes.
select pg_temp.deconnecter();
select pg_temp.connecter('resp.commercial');
insert into public.pieces_vente (id, type_piece, client_id) values ('7d000000-0000-0000-0000-000000000001', 'commande', '7c000000-0000-0000-0000-000000000001');
insert into public.lignes_piece (piece_id, conditionnement_id, quantite_colis, paquets_vrac, paquets, prix_paquet_gnf, montant_ht_gnf)
values ('7d000000-0000-0000-0000-000000000001', pg_temp.id('cond'), 10, 0, 1, null, 0);
select matches(public.valider_piece('7d000000-0000-0000-0000-000000000001'), '^CMD-', 'Commande validée');

-- 1. Suivi des dates
select lives_ok($$ select public.enregistrer_date_souhaitee('7d000000-0000-0000-0000-000000000001', public.aujourdhui_conakry() + 2) $$, 'Ventes : date souhaitée enregistrée');
select pg_temp.deconnecter();
select pg_temp.connecter('magasin');
select lives_ok($$ select public.confirmer_date_livraison('7d000000-0000-0000-0000-000000000001', public.aujourdhui_conakry() + 3, 'Camion du jeudi') $$, 'Magasin : date de livraison confirmée');
select is((select date_confirmee - public.aujourdhui_conakry() from public.suivi_commandes where commande_id = '7d000000-0000-0000-0000-000000000001'), 3, 'Date confirmée lisible par le magasin');
select is((select date_souhaitee - public.aujourdhui_conakry() from public.suivi_commandes where commande_id = '7d000000-0000-0000-0000-000000000001'), 2, 'Date souhaitée conservée');
select throws_ok($$ select public.confirmer_date_livraison('7d000000-0000-0000-0000-000000000001', public.aujourdhui_conakry() - 30) $$, '22023', null, 'Date avant la commande refusée');
select is_empty($$ update public.suivi_commandes set date_confirmee = null returning 1 $$, 'Écriture directe du suivi sans effet (fonctions seulement)');
select pg_temp.deconnecter();
select pg_temp.connecter('production');
select throws_ok($$ select public.confirmer_date_livraison('7d000000-0000-0000-0000-000000000001', public.aujourdhui_conakry() + 1) $$, '42501', null, 'Production : ne confirme pas une date de livraison');
select pg_temp.deconnecter();
select is((select statut::text from public.pieces_vente where id = '7d000000-0000-0000-0000-000000000001'), 'valide', 'La commande reste figée (le suivi est à part)');

-- 2. Livraison partielle : 3 colis, puis facture du livré.
select pg_temp.deconnecter();
select pg_temp.connecter('magasin');
insert into t values ('bl1', public.preparer_livraison('7d000000-0000-0000-0000-000000000001'));
update public.lignes_livraison set paquets = 300 where livraison_id = pg_temp.id('bl1');
select matches(public.valider_livraison(pg_temp.id('bl1')), '^BL-', 'Magasin : livraison partielle de 3 colis validée');
select throws_ok($$ select public.facturer_livre('7d000000-0000-0000-0000-000000000001') $$, '42501', null, 'Magasin : ne facture pas');
select pg_temp.deconnecter();
select pg_temp.connecter('finance');
insert into t values ('fa1', public.facturer_livre('7d000000-0000-0000-0000-000000000001'));
select is((select sum(paquets)::integer from public.lignes_piece where piece_id = pg_temp.id('fa1')), 300, 'Facture préparée = 300 paquets livrés (pas les 1 000 commandés)');
select is(public.facturer_livre('7d000000-0000-0000-0000-000000000001'), pg_temp.id('fa1'), 'Deuxième appui : la facture en préparation est reprise, pas dupliquée');
select matches(public.valider_piece(pg_temp.id('fa1')), '^FA-', 'Facture du livré validée');
select throws_ok($$ select public.facturer_livre('7d000000-0000-0000-0000-000000000001') $$, '22023', null, 'Rien de livré à facturer : refus clair');

-- Reste livré, puis 2e facture ; une 3e facture au-delà de la commande est refusée.
select pg_temp.deconnecter();
select pg_temp.connecter('magasin');
insert into t values ('bl2', public.preparer_livraison('7d000000-0000-0000-0000-000000000001'));
select matches(public.valider_livraison(pg_temp.id('bl2')), '^BL-', 'Livraison du reste (7 colis)');
select pg_temp.deconnecter();
select pg_temp.connecter('finance');
insert into t values ('fa2', public.facturer_livre('7d000000-0000-0000-0000-000000000001'));
select matches(public.valider_piece(pg_temp.id('fa2')), '^FA-', '2e facture (700 paquets) validée');
insert into public.pieces_vente (id, type_piece, client_id, origine_id) values ('7d000000-0000-0000-0000-000000000009', 'facture', '7c000000-0000-0000-0000-000000000001', '7d000000-0000-0000-0000-000000000001');
insert into public.lignes_piece (piece_id, conditionnement_id, quantite_colis, paquets_vrac, paquets, prix_paquet_gnf, montant_ht_gnf)
values ('7d000000-0000-0000-0000-000000000009', pg_temp.id('cond'), 1, 0, 1, null, 0);
select throws_ok($$ select public.valider_piece('7d000000-0000-0000-0000-000000000009') $$, '22023', 'Cette facture dépasse ce qui reste à facturer sur la commande.', 'Facture au-delà des quantités commandées refusée');

-- 3. Paiement partiel puis solde de la 1re facture.
select lives_ok(format($$ select public.enregistrer_paiement(%L, 500000, %L, p_reference => 'P1', p_cle => gen_random_uuid()) $$, pg_temp.id('fa1'), pg_temp.id('especes')), 'Paiement partiel enregistré');
select is((select solde_gnf from public.factures_etat where id = pg_temp.id('fa1')),
          (select total_ttc_gnf - 500000 from public.pieces_vente where id = pg_temp.id('fa1')), 'Reste à payer = TTC − paiement partiel');

select * from finish();
rollback;
