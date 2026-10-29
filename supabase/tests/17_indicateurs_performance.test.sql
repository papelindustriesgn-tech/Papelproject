-- Indicateurs de performance : coût de l'énergie, coûts de l'usine, données de l'OTIF ; droits d'accès.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

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

select is((select energie from public.categories_charges where libelle = 'Énergie : électricité, carburant du groupe'), true,
  'La catégorie « Énergie » est repérée');
select is((select energie from public.categories_charges where libelle = 'Salaires'), false, 'Les salaires ne sont pas de l''énergie');

-- Énergie : une facture d'électricité de 32 M GNF en janvier 2030 (période sans autre donnée).
select pg_temp.connecter('finance');
insert into public.factures_fournisseurs (tiers, libelle, categorie_id, date_facture, date_echeance, devise, montant_ht)
values ('EDG', 'Électricité janvier', (select id from public.categories_charges where libelle = 'Énergie : électricité, carburant du groupe'),
        '2030-01-15', '2030-01-31', 'GNF', 32000000);
select is((public.indicateurs_couts('2030-01-01', '2030-01-31') ->> 'energie_gnf')::bigint, 32000000::bigint, 'Énergie de la période : 32 M GNF');
select is((public.indicateurs_couts('2030-01-01', '2030-01-31') ->> 'charges_gnf')::bigint, 32000000::bigint, 'L''énergie compte aussi dans les charges');
select is((public.indicateurs_couts('2030-01-01', '2030-01-31') ->> 'papier_kg')::numeric, 0::numeric, 'Pas de papier consommé : le coût par tonne sera « — »');
select pg_temp.deconnecter();

-- Droits : production lit les coûts ; un commercial non ; un visiteur non connecté non plus.
select pg_temp.connecter('production');
select lives_ok($$ select public.indicateurs_couts('2030-01-01', '2030-01-31') $$, 'La production lit les coûts de l''usine');
select throws_ok($$ select public.indicateurs_livraison('2030-01-01', '2030-01-31') $$, '42501', null, 'La production ne lit pas les livraisons clients');
select pg_temp.deconnecter();
select pg_temp.connecter('commercial1');
select throws_ok($$ select public.indicateurs_couts('2030-01-01', '2030-01-31') $$, '42501', null, 'Un commercial ne lit pas les coûts');
select pg_temp.deconnecter();
set local role anon;
select throws_ok($$ select public.indicateurs_couts('2030-01-01', '2030-01-31') $$, '42501', null, 'Un visiteur non connecté ne lit rien');
reset role;

-- OTIF : commande du 10/01/2025 (promise le 13/01 avec 3 jours), livrée et remise aujourd'hui → en retard.
insert into public.clients (id, nom, type_client_id, condition_paiement)
values ('7a100000-0000-0000-0000-000000000001', 'Client OTIF', (select id from public.types_clients where libelle = 'Détaillant'), 'comptant');
select pg_temp.connecter('finance');
insert into public.pieces_vente (id, type_piece, client_id, date_piece) values ('7a200000-0000-0000-0000-000000000001', 'commande', '7a100000-0000-0000-0000-000000000001', '2025-01-10');
insert into public.lignes_piece (piece_id, conditionnement_id, quantite_colis, paquets_vrac, paquets, prix_paquet_gnf, montant_ht_gnf)
values ('7a200000-0000-0000-0000-000000000001', (select id from public.conditionnements where produit_id = '10000000-0000-0000-0000-000000000001' and paquets_par_colis = 100), 1, 0, 1, 2839, 0); -- prix fourni : la grille ne remonte pas à 2025
select public.valider_piece('7a200000-0000-0000-0000-000000000001');
create temporary table t (id uuid);
grant all on t to authenticated;
insert into t select public.preparer_livraison('7a200000-0000-0000-0000-000000000001');
select public.valider_livraison((select id from t));
select pg_temp.deconnecter();
select pg_temp.connecter('logistique');
insert into public.tournees_livraison (id, vehicule_id, chauffeur_id) values ('7a300000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001');
select public.affecter_livraison('7a300000-0000-0000-0000-000000000001', (select id from t));
select public.demarrer_tournee('7a300000-0000-0000-0000-000000000001', 1000);
select public.enregistrer_remise((select id from t), 'livree', 'Gérant', 'x/s.png');
create temporary table r as select public.indicateurs_livraison('2025-01-01', '2025-01-31') as j;
select is(jsonb_array_length((select j -> 'commandes' from r)), 1, 'Une commande arrivée à échéance en janvier 2025');
select results_eq($$ select (c ->> 'date_promise')::date, (c ->> 'paquets_commandes')::int, (c -> 'remises' -> 0 ->> 'paquets')::int, (c -> 'remises' -> 0 ->> 'date')::date
                     from r, jsonb_array_elements(r.j -> 'commandes') c $$,
  $$ values ('2025-01-13'::date, 100, 100, public.aujourdhui_conakry()) $$, 'Promise le 13/01, 100 paquets remis aujourd''hui (donc en retard)');
select is(jsonb_array_length((public.indicateurs_livraison(public.aujourdhui_conakry() + 1, public.aujourdhui_conakry() + 30) -> 'commandes')), 0,
  'Période à venir : aucune commande comptée avant son échéance');
select pg_temp.deconnecter();

select * from finish();
rollback;
