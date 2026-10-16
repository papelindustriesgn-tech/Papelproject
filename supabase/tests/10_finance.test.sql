-- Tests de la finance : encaissement client → trésorerie, facture fournisseur en USD, règlement (refus au-delà
-- du dû, caisse jamais négative), journal inaltérable, charges récurrentes idempotentes, virements, droits.
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

create temporary table t_c as select
  (select id from public.comptes_tresorerie where libelle = 'Caisse principale') as caisse,
  (select id from public.comptes_tresorerie where libelle = 'Banque (GNF)') as banque,
  (select id from public.categories_charges where libelle = 'Loyer') as loyer,
  (select id from public.factures_etat where solde_gnf > 0 order by date_piece limit 1) as facture_client,
  (select id from public.modes_paiement where libelle = 'Espèces') as especes;
grant select on t_c to authenticated;

select pg_temp.connecter('commercial1');
select is((select count(*)::int from public.mouvements_tresorerie), 0, 'Un commercial ne voit pas la trésorerie');
select pg_temp.deconnecter();

select pg_temp.connecter('finance');
-- Encaissement client en espèces → entrée en caisse
create temporary table t_avant as select solde from public.soldes_tresorerie where id = (select caisse from t_c);
select lives_ok(format('select public.enregistrer_paiement(%L, 100000, %L)', (select facture_client from t_c), (select especes from t_c)), 'Paiement client');
select is((select solde from public.soldes_tresorerie where id = (select caisse from t_c)) - (select solde from t_avant), 100000::numeric, 'Encaissement porté en caisse automatiquement');

-- Facture fournisseur en USD : 1 000,00 USD HT au taux fixé 9 500
insert into public.factures_fournisseurs (id, tiers, libelle, categorie_id, devise, montant_ht, taux_change, date_echeance)
select 'e0000000-0000-0000-0000-000000000001', 'Fournisseur test', 'Pièces', loyer, 'USD', 100000, 9500, public.aujourdhui_conakry() + 30 from t_c;
select is((select total_gnf from public.factures_fournisseurs where id = 'e0000000-0000-0000-0000-000000000001'), 9500000::bigint, '1 000 USD × 9 500 = 9 500 000 GNF');
select matches((select numero from public.factures_fournisseurs where id = 'e0000000-0000-0000-0000-000000000001'), '^FF-\d{4}-\d{5}$', 'Facture fournisseur numérotée');
select throws_ok(format('select public.regler_facture_fournisseur(%L, %L, 9500001)', 'e0000000-0000-0000-0000-000000000001', (select banque from t_c)),
  '22023', null, 'Règlement supérieur au dû refusé');
select throws_ok(format('select public.regler_facture_fournisseur(%L, %L, 9000000)', 'e0000000-0000-0000-0000-000000000001', (select caisse from t_c)),
  '22023', null, 'La caisse ne devient jamais négative');
select lives_ok(format('select public.regler_facture_fournisseur(%L, %L, 4000000)', 'e0000000-0000-0000-0000-000000000001', (select banque from t_c)), 'Règlement partiel par la banque');
select is((select solde_gnf from public.factures_fournisseurs_etat where id = 'e0000000-0000-0000-0000-000000000001'), 5500000::bigint, 'Reste dû : 5 500 000');
select throws_ok($$ update public.factures_fournisseurs set montant_ht = 1 where id = 'e0000000-0000-0000-0000-000000000001' $$, '42501', null, 'Facture réglée figée');
update public.mouvements_tresorerie set montant = 1 where origine = 'fournisseur';
select is((select count(*)::int from public.mouvements_tresorerie where montant = 1), 0, 'Journal de trésorerie inaltérable (aucune ligne modifiée)');

-- Charges récurrentes : pas de doublon pour un mois déjà généré
select is(public.generer_charges_mois(public.aujourdhui_conakry()), 0, 'Charges du mois déjà générées : rien de nouveau');
select lives_ok(format('select public.virement_interne(%L, %L, 1000)', (select banque from t_c), (select caisse from t_c)), 'Virement banque → caisse');
select pg_temp.deconnecter();

select pg_temp.connecter('achats');
select throws_ok(format('select public.regler_facture_fournisseur(%L, %L, 1)', 'e0000000-0000-0000-0000-000000000001', (select banque from t_c)), '42501', null, 'Les achats ne règlent pas');
select pg_temp.deconnecter();

select * from finish();
rollback;
