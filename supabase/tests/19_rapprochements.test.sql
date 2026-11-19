-- Vérification de la caisse et de la banque : solde de l'ERP à la date, écart, droits, journal inaltérable.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

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

-- Compte de test : ouvert il y a 10 jours avec 1 000 000 GNF, une entrée de 200 000 il y a 5 jours, une sortie de 50 000 aujourd'hui.
insert into public.comptes_tresorerie (id, libelle, type_compte, devise, compte_comptable, solde_initial, date_solde_initial)
values ('7e000000-0000-0000-0000-000000000001', 'Caisse test', 'caisse', 'GNF', '571', 1000000, public.aujourdhui_conakry() - 10);
insert into public.mouvements_tresorerie (compte_id, date_operation, sens, montant, taux_change, montant_gnf, origine, libelle)
values ('7e000000-0000-0000-0000-000000000001', public.aujourdhui_conakry() - 5, 'entree', 200000, 1, 200000, 'autre', 'Apport'),
       ('7e000000-0000-0000-0000-000000000001', public.aujourdhui_conakry(), 'sortie', 50000, 1, 50000, 'autre', 'Achat');

select is(public.solde_compte_au('7e000000-0000-0000-0000-000000000001', public.aujourdhui_conakry() - 3), 1200000::bigint, 'Solde ERP à une date passée (sans les opérations postérieures)');

select pg_temp.deconnecter();
select pg_temp.connecter('finance');
create temporary table r (id uuid);
grant all on r to authenticated;
insert into r select public.enregistrer_rapprochement('7e000000-0000-0000-0000-000000000001', public.aujourdhui_conakry(), 1140000, 'Compté le soir');
select is((select solde_erp from public.rapprochements_tresorerie where id = (select id from r)), 1150000::bigint, 'Solde ERP du jour calculé par la base');
select is((select ecart from public.rapprochements_tresorerie where id = (select id from r)), -10000::bigint, 'Écart = réel − ERP (il manque une sortie de 10 000)');
select is((select date_releve from public.derniers_rapprochements where compte_id = '7e000000-0000-0000-0000-000000000001'), public.aujourdhui_conakry(), 'Dernière vérification visible');
select throws_ok($$ select public.enregistrer_rapprochement('7e000000-0000-0000-0000-000000000001', public.aujourdhui_conakry() + 1, 0) $$, '22023', null, 'Date future refusée');
select throws_ok($$ select public.enregistrer_rapprochement('7e000000-0000-0000-0000-000000000001', public.aujourdhui_conakry() - 30, 0) $$, '22023', null, 'Date avant l''ouverture du compte refusée');
select is_empty($$ update public.rapprochements_tresorerie set solde_releve = 0 returning 1 $$, 'Vérification inaltérable (pas de modification directe)');
select throws_ok($$ insert into public.rapprochements_tresorerie (compte_id, date_releve, solde_releve, solde_erp) values ('7e000000-0000-0000-0000-000000000001', current_date, 0, 0) $$, '42501', null, 'Pas d''ajout direct : fonction seulement');

select pg_temp.deconnecter();
select pg_temp.connecter('magasin');
select throws_ok($$ select public.enregistrer_rapprochement('7e000000-0000-0000-0000-000000000001', public.aujourdhui_conakry(), 0) $$, '42501', null, 'Magasin : ne vérifie pas la caisse');

select * from finish();
rollback;
