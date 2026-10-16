-- Tests des achats : numérotation et taux du bon de commande, statut des conteneurs, frais en USD,
-- coût de revient, réception de bobines au coût complet, droits.
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

-- Demande d'achat par le magasin
select pg_temp.connecter('magasin');
select lives_ok($$ insert into public.demandes_achat (id, article_id, quantite, motif) values ('a0000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 20000, 'Couverture < 15 jours') $$,
  'Le magasin crée une demande d''achat');
select throws_ok($$ insert into public.bons_commande (fournisseur_id) values ('30000000-0000-0000-0000-000000000001') $$, '42501', null, 'Le magasin ne crée pas de bon de commande');
select pg_temp.deconnecter();

select pg_temp.connecter('achats');
insert into public.bons_commande (id, fournisseur_id, devise) values ('a1000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'USD');
insert into public.lignes_bc (bc_id, article_id, quantite, prix_unitaire) values ('a1000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 20000, 1.15);
select is((select montant_devise from public.lignes_bc where bc_id = 'a1000000-0000-0000-0000-000000000001'), 2300000::bigint, '20 t à 1 150 USD/t = 23 000 USD (en centimes)');
update public.demandes_achat set statut = 'approuvee', bc_id = 'a1000000-0000-0000-0000-000000000001' where id = 'a0000000-0000-0000-0000-000000000001';
select matches(public.envoyer_bc('a1000000-0000-0000-0000-000000000001'), '^BC-\d{4}-\d{5}$', 'Bon de commande numéroté à l''envoi');
select is((select taux_change from public.bons_commande where id = 'a1000000-0000-0000-0000-000000000001'), public.taux_a_la_date('USD', public.aujourdhui_conakry()), 'Taux USD du jour figé sur le bon');
select is((select statut::text from public.demandes_achat where id = 'a0000000-0000-0000-0000-000000000001'), 'commandee', 'La demande liée passe « commandée »');

-- Conteneur : le statut suit les dates réelles
insert into public.conteneurs (id, bc_id, reference, poids_net_prevu_kg) values ('a2000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'TEST0001', 20000);
update public.conteneurs set date_embarquement_reelle = public.aujourdhui_conakry() - 20, date_arrivee_port_reelle = public.aujourdhui_conakry() - 2 where id = 'a2000000-0000-0000-0000-000000000001';
select is((select statut::text from public.conteneurs where id = 'a2000000-0000-0000-0000-000000000001'), 'au_port', 'Arrivée au port saisie : statut « au port »');

-- Frais : 2 000 USD de fret (taux fixé à 9 500) + 30 000 000 GNF de douane
insert into public.frais_approche (conteneur_id, type_frais_id, devise, montant, taux_change)
select 'a2000000-0000-0000-0000-000000000001', id, 'USD', 200000, 9500 from public.types_frais where libelle = 'Fret maritime';
insert into public.frais_approche (conteneur_id, type_frais_id, devise, montant)
select 'a2000000-0000-0000-0000-000000000001', id, 'GNF', 30000000 from public.types_frais where libelle = 'Droits et taxes de douane';
select is((select frais_gnf from public.couts_conteneurs where id = 'a2000000-0000-0000-0000-000000000001'), 49000000::numeric, 'Frais en GNF : 19 000 000 + 30 000 000');
select is((select cout_kg_gnf from public.couts_conteneurs where id = 'a2000000-0000-0000-0000-000000000001'),
  round((23000 * public.taux_a_la_date('USD', public.aujourdhui_conakry()) + 49000000) / 20000, 2), 'Coût complet au kg = (marchandise + frais) ÷ poids');
update public.conteneurs set date_dedouanement_reelle = public.aujourdhui_conakry() - 1, date_livraison_reelle = public.aujourdhui_conakry() where id = 'a2000000-0000-0000-0000-000000000001';
select pg_temp.deconnecter();

-- Réception des bobines par le magasin au coût complet
select pg_temp.connecter('magasin');
select lives_ok($$ select public.receptionner_bobine_conteneur('a2000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'TEST-CT-1', 1000) $$, 'Réception d''une bobine du conteneur');
select is((select cout_kg_gnf from public.lots where numero_lot = 'TEST-CT-1'),
  (select cout_kg_gnf from public.couts_conteneurs where id = 'a2000000-0000-0000-0000-000000000001'), 'La bobine entre au coût de revient complet');
select pg_temp.deconnecter();

select pg_temp.connecter('commercial1');
select is((select count(*) from public.bons_commande), 0::bigint, 'Un commercial ne voit pas les achats');
select pg_temp.deconnecter();

select * from finish();
rollback;
