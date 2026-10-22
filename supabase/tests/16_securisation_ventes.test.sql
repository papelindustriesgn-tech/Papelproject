-- Régression de l'audit ventes / encaissements / retours :
-- 1. facture validée verrouillée (accès directs et RPC) ; 2. pas de double retour en stock ;
-- 3. encaissements contrôlés quel que soit le chemin (idempotence) ; 4. avoir sur facture payée → crédit client ;
-- 5. un seul circuit de validation des avoirs.
begin;
create extension if not exists pgtap with schema extensions;
select plan(70);

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
insert into t values ('art', (select id from public.articles where conditionnement_id = (select id from t where cle = 'cond')));
create or replace function pg_temp.id(p text) returns uuid language sql as $$ select id from t where cle = p $$;
create or replace function pg_temp.stock() returns numeric language sql as $$
  select quantite from public.stocks_articles where article_id = (select id from t where cle = 'art') $$;
grant execute on function pg_temp.id(text) to authenticated;
grant execute on function pg_temp.stock() to authenticated;

-- Clients de test : un client du commercial 1 (terrain), un client « bureau ».
insert into public.clients (id, nom, type_client_id, condition_paiement, commercial_id) values
  ('7a000000-0000-0000-0000-000000000001', 'Client audit terrain', (select id from public.types_clients where libelle = 'Détaillant'), 'comptant',
   (select id from public.profils where identifiant = 'commercial1')),
  ('7a000000-0000-0000-0000-000000000002', 'Client audit bureau', (select id from public.types_clients where libelle = 'Détaillant'), 'comptant', null);

-- =============================================================================
-- 1. Facture validée verrouillée
-- =============================================================================
select pg_temp.connecter('commercial1');
insert into public.pieces_vente (id, type_piece, client_id, commercial_id)
values ('7b000000-0000-0000-0000-000000000001', 'facture', '7a000000-0000-0000-0000-000000000001', auth.uid());
insert into public.lignes_piece (piece_id, conditionnement_id, quantite_colis, paquets_vrac, paquets, prix_paquet_gnf, montant_ht_gnf)
values ('7b000000-0000-0000-0000-000000000001', pg_temp.id('cond'), 0, 4, 1, null, 0);
select matches(public.valider_piece('7b000000-0000-0000-0000-000000000001'), '^FA-', 'Commercial : facture terrain validée');
select throws_ok($$ update public.pieces_vente set statut = 'brouillon' where id = '7b000000-0000-0000-0000-000000000001' $$,
  '42501', null, 'Commercial : remise en brouillon d''une facture validée refusée');
select throws_ok($$ update public.pieces_vente set total_ttc_gnf = 118, total_ht_gnf = 100 where id = '7b000000-0000-0000-0000-000000000001' $$,
  '42501', null, 'Commercial : totaux d''une facture validée non modifiables');
select throws_ok($$ update public.lignes_piece set paquets_vrac = 1 where piece_id = '7b000000-0000-0000-0000-000000000001' $$,
  '22023', null, 'Commercial : lignes d''une facture validée figées');
select throws_ok($$ insert into public.pieces_vente (type_piece, client_id, commercial_id, statut) values ('facture', '7a000000-0000-0000-0000-000000000001', auth.uid(), 'valide') $$,
  '42501', null, 'Insertion directe d''une pièce déjà validée refusée');
insert into public.pieces_vente (id, type_piece, client_id, commercial_id, total_ht_gnf, total_ttc_gnf)
values ('7b000000-0000-0000-0000-000000000002', 'facture', '7a000000-0000-0000-0000-000000000001', auth.uid(), 5000, 5900);
select is((select total_ttc_gnf from public.pieces_vente where id = '7b000000-0000-0000-0000-000000000002'), 0::bigint,
  'Insertion directe : les totaux fournis sont ignorés (calculés à la validation)');
select throws_ok($$ update public.pieces_vente set statut = 'valide' where id = '7b000000-0000-0000-0000-000000000002' $$,
  '42501', null, 'Brouillon : la validation ne se fait pas par mise à jour directe');
select pg_temp.deconnecter();
select is((select total_ttc_gnf from public.pieces_vente where id = '7b000000-0000-0000-0000-000000000001'), 13400::bigint,
  'Facture terrain : montant intact (4 × 2 839 HT + TVA 18 % = 13 400 GNF)');

select pg_temp.connecter('finance');
select throws_ok($$ update public.pieces_vente set notes = 'modif' where id = '7b000000-0000-0000-0000-000000000001' $$,
  '42501', null, 'Finance : même une note ne change pas sur une pièce validée');
select throws_ok($$ delete from public.pieces_vente where id = '7b000000-0000-0000-0000-000000000001' $$,
  '22023', null, 'Pièce validée non supprimable');
select pg_temp.deconnecter();
select throws_ok($$ update public.pieces_vente set total_ttc_gnf = 1 where id = '7b000000-0000-0000-0000-000000000001' $$,
  '22023', null, 'Même hors API (fonction, script), le contenu financier d''une pièce validée est figé');

-- Transitions légitimes préservées : devis validé → annulé ; commande → facture.
select pg_temp.connecter('finance');
insert into public.pieces_vente (id, type_piece, client_id) values ('7b000000-0000-0000-0000-000000000003', 'devis', '7a000000-0000-0000-0000-000000000002');
insert into public.lignes_piece (piece_id, conditionnement_id, quantite_colis, paquets_vrac, paquets, prix_paquet_gnf, montant_ht_gnf)
values ('7b000000-0000-0000-0000-000000000003', pg_temp.id('cond'), 1, 0, 1, null, 0);
select matches(public.valider_piece('7b000000-0000-0000-0000-000000000003'), '^DEV-', 'Devis validé');
select lives_ok($$ select public.annuler_piece('7b000000-0000-0000-0000-000000000003') $$, 'Devis validé → annulé (circuit prévu)');
select is((select statut::text from public.pieces_vente where id = '7b000000-0000-0000-0000-000000000003'), 'annule', 'Devis annulé');
select pg_temp.deconnecter();
select pg_temp.connecter('magasin');
select throws_ok($$ select public.annuler_piece('7b000000-0000-0000-0000-000000000002') $$, '42501', null, 'Magasin : pas d''annulation de pièce de vente');
select pg_temp.deconnecter();

-- =============================================================================
-- 2. Retours : livraison 100, retour à la livraison 20, avoir → pas de double entrée
-- =============================================================================
select pg_temp.connecter('finance');
insert into public.pieces_vente (id, type_piece, client_id) values ('7c000000-0000-0000-0000-000000000001', 'commande', '7a000000-0000-0000-0000-000000000002');
insert into public.lignes_piece (piece_id, conditionnement_id, quantite_colis, paquets_vrac, paquets, prix_paquet_gnf, montant_ht_gnf)
values ('7c000000-0000-0000-0000-000000000001', pg_temp.id('cond'), 1, 0, 1, null, 0);
select matches(public.valider_piece('7c000000-0000-0000-0000-000000000001'), '^CMD-', 'Commande de 100 paquets');
create temporary table s (etape text primary key, q numeric);
grant all on s to authenticated;
insert into s values ('initial', pg_temp.stock());
insert into t values ('bl', public.preparer_livraison('7c000000-0000-0000-0000-000000000001'));
select matches(public.valider_livraison(pg_temp.id('bl')), '^BL-', 'BL validé');
select is(pg_temp.stock(), (select q from s where etape = 'initial') - 100, 'Livraison : −100 paquets');
select pg_temp.deconnecter();

select pg_temp.connecter('logistique');
insert into public.tournees_livraison (id, vehicule_id, chauffeur_id)
values ('7d000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001');
select public.affecter_livraison('7d000000-0000-0000-0000-000000000001', pg_temp.id('bl'));
select public.demarrer_tournee('7d000000-0000-0000-0000-000000000001', 1000);
select lives_ok(format('select public.enregistrer_remise(%L, %L, %L, %L, null, null, null, null, %L, %L::jsonb)', pg_temp.id('bl'), 'partielle', 'Gérant', 'x/s.png', 'Abîmés',
  json_build_array(json_build_object('ligne_id', (select id from public.lignes_livraison where livraison_id = pg_temp.id('bl')), 'paquets', 20))), 'Remise partielle : 20 rapportés');
select is(pg_temp.stock(), (select q from s where etape = 'initial') - 80, 'Retour physique : stock = initial − 80');
select throws_ok(format('select public.enregistrer_remise(%L, %L, %L, %L)', pg_temp.id('bl'), 'livree', 'Gérant', 'x/s.png'),
  '22023', null, 'Remise ressaisie (double clic) refusée : pas de 2e retour');
select pg_temp.deconnecter();

select pg_temp.connecter('finance');
insert into t values ('fa', public.transformer_piece('7c000000-0000-0000-0000-000000000001', 'facture'));
select matches(public.valider_piece(pg_temp.id('fa')), '^FA-', 'Facture de 100 paquets');
insert into t values ('av1', public.transformer_piece(pg_temp.id('fa'), 'avoir'));
select is((select origine_ligne_id is not null from public.lignes_piece where piece_id = pg_temp.id('av1')), true, 'Ligne d''avoir rattachée à la ligne de facture');
update public.lignes_piece set quantite_colis = 0, paquets_vrac = 20 where piece_id = pg_temp.id('av1');
select is((public.analyser_avoir(pg_temp.id('av1')) -> 'lignes' -> 0 ->> 'retour_livraison')::int, 20, 'Aperçu : 20 paquets déjà revenus à la livraison');
-- L'utilisateur coche aussi un retour en stock : refusé, ces paquets sont déjà revenus.
update public.lignes_piece set retour_stock_paquets = 20 where piece_id = pg_temp.id('av1');
select throws_ok(format('select public.valider_piece(%L)', pg_temp.id('av1')), '22023', null, 'Retour en stock en double refusé (déjà revenus à la livraison)');
select throws_ok(format('select public.valider_avoir(%L, true)', pg_temp.id('av1')), '22023', null, 'Ancien appel valider_avoir(…, true) : même refus');
update public.lignes_piece set retour_stock_paquets = 0 where piece_id = pg_temp.id('av1');
select matches(public.valider_piece(pg_temp.id('av1')), '^AV-', 'Avoir des 20 paquets rapportés validé');
select is(pg_temp.stock(), (select q from s where etape = 'initial') - 80, 'Après l''avoir : stock inchangé (pas de 2e entrée)');
select is((select retour_livraison_paquets from public.lignes_piece where piece_id = pg_temp.id('av1')), 20, 'Avoir : 20 paquets rattachés au retour de livraison');
select is((select paquets_restants::bigint from public.reste_a_livrer where commande_id = '7c000000-0000-0000-0000-000000000001'), 0::bigint,
  'Paquets rapportés crédités : plus rien à relivrer');
select throws_ok(format('select public.valider_piece(%L)', pg_temp.id('av1')), '22023', null, 'Double validation de l''avoir refusée');

-- Nouveau retour à l'usine (30 des 80 détenus par le client), puis tentative au-delà de ce qu'il détient.
insert into t values ('av2', public.transformer_piece(pg_temp.id('fa'), 'avoir'));
select is((select paquets from public.lignes_piece where piece_id = pg_temp.id('av2')), 80, 'Nouvel avoir proposé pour les 80 paquets restant à créditer');
update public.lignes_piece set quantite_colis = 0, paquets_vrac = 30, retour_stock_paquets = 30 where piece_id = pg_temp.id('av2');
select matches(public.valider_piece(pg_temp.id('av2')), '^AV-', 'Avoir avec retour physique de 30 paquets');
select is(pg_temp.stock(), (select q from s where etape = 'initial') - 50, 'Retour physique de l''avoir : +30, une seule fois');
select is((select count(*) from public.mouvements_stock where document_type = 'avoir' and document_id = pg_temp.id('av2')), 1::bigint, 'Une seule entrée de stock pour cet avoir');
select pg_temp.deconnecter();
select throws_ok(format($$ insert into public.mouvements_stock (type, article_id, quantite, unite, document_type, document_id) values ('retour', %L, 30, 'paquet', 'avoir', %L) $$,
  pg_temp.id('art'), pg_temp.id('av2')), '23505', null, 'Base : un 2e retour pour le même avoir et le même article est impossible');
select pg_temp.connecter('finance');
insert into t values ('av3', public.transformer_piece(pg_temp.id('fa'), 'avoir'));
select is((public.analyser_avoir(pg_temp.id('av3')) -> 'lignes' -> 0 ->> 'retour_stock_max')::int, 50, 'Le client détient encore 50 paquets');
update public.lignes_piece set retour_stock_paquets = 50 where piece_id = pg_temp.id('av3');
select matches(public.valider_piece(pg_temp.id('av3')), '^AV-', 'Avoir final : 50 paquets repris');
select is(pg_temp.stock(), (select q from s where etape = 'initial'), 'Tout est revenu : stock = stock initial');
select is((select sum(total_ttc_gnf)::bigint from public.pieces_vente where origine_id = pg_temp.id('fa') and type_piece = 'avoir' and statut = 'valide'),
  (select total_ttc_gnf from public.pieces_vente where id = pg_temp.id('fa')), 'Avoirs successifs = exactement le TTC de la facture (pas d''écart d''arrondi)');
select throws_ok(format('select public.transformer_piece(%L, %L)', pg_temp.id('fa'), 'avoir'), '22023', null, 'Facture entièrement créditée : plus d''avoir');
select pg_temp.deconnecter();

-- Facture terrain sans livraison : aucun retour en stock possible (rien n'est sorti).
select pg_temp.connecter('finance');
insert into t values ('av_terrain', public.transformer_piece('7b000000-0000-0000-0000-000000000001', 'avoir'));
update public.lignes_piece set retour_stock_paquets = 4 where piece_id = pg_temp.id('av_terrain');
select throws_ok(format('select public.valider_piece(%L)', pg_temp.id('av_terrain')), '22023', null, 'Facture sans livraison : retour en stock refusé');

-- =============================================================================
-- 5. Un seul circuit de validation des avoirs
-- =============================================================================
select throws_ok(format($$ insert into public.lignes_piece (piece_id, conditionnement_id, quantite_colis, paquets_vrac, paquets, prix_paquet_gnf, montant_ht_gnf)
  values (%L, %L, 10, 0, 1, null, 0) $$, pg_temp.id('av_terrain'), pg_temp.id('cond')), '42501', null, 'Pas de ligne libre dans un avoir');
select throws_ok(format('update public.lignes_piece set prix_paquet_gnf = 999999 where piece_id = %L', pg_temp.id('av_terrain')),
  '42501', null, 'Prix d''une ligne d''avoir non modifiable');
update public.lignes_piece set retour_stock_paquets = 0, quantite_colis = 1 where piece_id = pg_temp.id('av_terrain');
select throws_ok(format('select public.valider_piece(%L)', pg_temp.id('av_terrain')), '22023', null,
  'valider_piece sur un avoir : quantité au-delà de la facture refusée (mêmes contrôles que valider_avoir)');
insert into public.pieces_vente (id, type_piece, client_id) values ('7e000000-0000-0000-0000-000000000001', 'avoir', '7a000000-0000-0000-0000-000000000002');
select throws_ok($$ select public.valider_piece('7e000000-0000-0000-0000-000000000001') $$, '22023', null, 'Avoir sans facture d''origine refusé');
select pg_temp.deconnecter();
select pg_temp.connecter('commercial1');
select throws_ok(format('select public.transformer_piece(%L, %L)', '7b000000-0000-0000-0000-000000000001', 'avoir'), '42501', null, 'Commercial : pas d''avoir');
select pg_temp.deconnecter();

-- =============================================================================
-- 3. Encaissements
-- =============================================================================
select pg_temp.connecter('finance');
insert into public.pieces_vente (id, type_piece, client_id) values ('7f000000-0000-0000-0000-000000000001', 'facture', '7a000000-0000-0000-0000-000000000002');
insert into public.lignes_piece (piece_id, conditionnement_id, quantite_colis, paquets_vrac, paquets, prix_paquet_gnf, montant_ht_gnf)
values ('7f000000-0000-0000-0000-000000000001', pg_temp.id('cond'), 0, 10, 1, null, 0);
select throws_ok(format('select public.enregistrer_paiement(%L, 100, %L)', '7f000000-0000-0000-0000-000000000001', pg_temp.id('especes')),
  '22023', null, 'Paiement sur une facture en brouillon refusé');
select public.valider_piece('7f000000-0000-0000-0000-000000000001');
-- 10 × 2 839 = 28 390 HT + 5 110 TVA = 33 500 TTC
select throws_ok(format($$ insert into public.paiements (facture_id, montant_gnf, mode_id) values (%L, 999999, %L) $$, '7f000000-0000-0000-0000-000000000001', pg_temp.id('especes')),
  '42501', null, 'Finance : insertion directe d''un paiement refusée');
select throws_ok(format('select public.enregistrer_paiement(%L, 999999, %L)', '7f000000-0000-0000-0000-000000000001', pg_temp.id('especes')),
  '22023', null, 'RPC : montant au-delà du reste dû refusé');
select throws_ok(format('select public.enregistrer_paiement(%L, 0, %L)', '7f000000-0000-0000-0000-000000000001', pg_temp.id('especes')),
  '22023', null, 'Montant nul refusé');
select throws_ok(format('select public.enregistrer_paiement(%L, -5, %L)', '7f000000-0000-0000-0000-000000000001', pg_temp.id('especes')),
  '22023', null, 'Montant négatif refusé');
select throws_ok(format('select public.enregistrer_paiement(%L, 10, %L)', '7b000000-0000-0000-0000-000000000003', pg_temp.id('especes')),
  '22023', null, 'Paiement sur un devis refusé');
-- Double soumission : même clé → un seul paiement ; deux règlements égaux avec deux clés → deux paiements.
select is(public.enregistrer_paiement('7f000000-0000-0000-0000-000000000001', 10000, pg_temp.id('especes'), public.aujourdhui_conakry(), '', '', '7f100000-0000-0000-0000-000000000001'),
          public.enregistrer_paiement('7f000000-0000-0000-0000-000000000001', 10000, pg_temp.id('especes'), public.aujourdhui_conakry(), '', '', '7f100000-0000-0000-0000-000000000001'),
  'Double clic (même clé) : même paiement renvoyé');
select lives_ok(format('select public.enregistrer_paiement(%L, 10000, %L, public.aujourdhui_conakry(), %L, %L, %L)', '7f000000-0000-0000-0000-000000000001', pg_temp.id('especes'), '', '', '7f100000-0000-0000-0000-000000000002'),
  'Deuxième règlement légitime du même montant');
select is((select count(*) from public.paiements where facture_id = '7f000000-0000-0000-0000-000000000001'), 2::bigint, 'Deux paiements, pas trois');
select is((select count(*) from public.mouvements_tresorerie where paiement_id in (select id from public.paiements where facture_id = '7f000000-0000-0000-0000-000000000001')),
  2::bigint, 'Un mouvement de trésorerie par paiement');
select throws_ok(format('delete from public.paiements where facture_id = %L', '7f000000-0000-0000-0000-000000000001'), '42501', null, 'Paiement inaltérable');
select pg_temp.deconnecter();
select pg_temp.connecter('commercial1');
select throws_ok(format('select public.enregistrer_paiement(%L, 10, %L)', '7b000000-0000-0000-0000-000000000001', pg_temp.id('especes')), '42501', null, 'Commercial : pas d''encaissement (RPC)');
select throws_ok(format($$ insert into public.paiements (facture_id, montant_gnf, mode_id) values (%L, 10, %L) $$, '7b000000-0000-0000-0000-000000000001', pg_temp.id('especes')),
  '42501', null, 'Commercial : pas d''encaissement (accès direct)');
select pg_temp.deconnecter();
select pg_temp.connecter('magasin');
select throws_ok(format('select public.enregistrer_paiement(%L, 10, %L)', '7f000000-0000-0000-0000-000000000001', pg_temp.id('especes')), '42501', null, 'Magasin : pas d''encaissement');
select pg_temp.deconnecter();

-- =============================================================================
-- 4. Avoirs sur factures payées → crédit client explicite, remboursement saisi à part
-- =============================================================================
select pg_temp.connecter('finance');
-- Facture partiellement payée : 20 000 / 33 500. Avoir de 5 paquets (16 750 TTC) : 13 500 réduisent la créance, 3 250 de crédit.
insert into t values ('av_part', public.transformer_piece('7f000000-0000-0000-0000-000000000001', 'avoir'));
update public.lignes_piece set quantite_colis = 0, paquets_vrac = 5 where piece_id = pg_temp.id('av_part');
select matches(public.valider_piece(pg_temp.id('av_part')), '^AV-', 'Avoir sur facture partiellement payée accepté');
select results_eq(format('select avoir_reduction_creance_gnf, avoir_credit_client_gnf from public.pieces_vente where id = %L', pg_temp.id('av_part')),
  $$ values (13500::bigint, 3250::bigint) $$, 'Avoir : 13 500 de réduction de créance, 3 250 de crédit client');
select results_eq($$ select solde_gnf, credit_client_gnf from public.factures_etat where id = '7f000000-0000-0000-0000-000000000001' $$,
  $$ values (0::bigint, 3250::bigint) $$, 'Facture : plus rien à payer et 3 250 GNF de crédit client visibles');
select is((select count(*) from public.remboursements_clients), 0::bigint, 'Aucun remboursement automatique');
select throws_ok(format('select public.enregistrer_paiement(%L, 1, %L)', '7f000000-0000-0000-0000-000000000001', pg_temp.id('especes')), '22023', null,
  'Plus d''encaissement possible quand le client a un crédit');
select throws_ok(format('select public.enregistrer_remboursement(%L, 5000, %L)', '7f000000-0000-0000-0000-000000000001', pg_temp.id('especes')), '22023', null,
  'Remboursement au-delà du crédit refusé');
select lives_ok(format('select public.enregistrer_remboursement(%L, 3250, %L, public.aujourdhui_conakry(), %L)', '7f000000-0000-0000-0000-000000000001', pg_temp.id('especes'), 'Remise espèces'),
  'Remboursement du crédit enregistré');
select is((select credit_client_gnf from public.factures_etat where id = '7f000000-0000-0000-0000-000000000001'), 0::bigint, 'Crédit soldé après remboursement');
select is((select count(*) from public.mouvements_tresorerie where remboursement_id is not null and sens = 'sortie'), 1::bigint, 'Remboursement : sortie de trésorerie');
select pg_temp.deconnecter();

select * from finish();
rollback;
