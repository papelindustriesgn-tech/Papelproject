-- Tests de la qualité : conformité calculée, validation et NC automatique, blocage de bobine,
-- clôture des NC, code de lot des fiches, traçabilité, droits.
begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

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

create temporary table t_lot as select id from public.lots where statut = 'disponible' order by date_reception limit 1;
create temporary table t_fiche as select id from public.fiches_production where statut = 'validee' order by date_production limit 1;
grant select on t_lot, t_fiche to authenticated;

select matches((select code_lot from public.fiches_production where id = (select id from t_fiche)), '^PF\d{6}-\d+$', 'Chaque fiche a un code de lot de produits finis');

select pg_temp.connecter('production');
select throws_ok(format('insert into public.controles_qualite (etape, lot_id) values (%L, %L)', 'reception', (select id from t_lot)), '42501', null, 'La production ne saisit pas de contrôle');
select lives_ok($$ insert into public.non_conformites (origine, description) values ('interne', 'Fuite d''huile sous la ligne 1') $$, 'La production déclare une non-conformité');
select pg_temp.deconnecter();

select pg_temp.connecter('qualite');
insert into public.controles_qualite (id, etape, lot_id) select 'c0000000-0000-0000-0000-000000000001', 'reception', id from t_lot;
insert into public.mesures_controle (controle_id, critere_id, valeur, conforme)
select 'c0000000-0000-0000-0000-000000000001', id, 13.9, true from public.criteres_qualite where etape = 'reception' and libelle = 'Grammage';
select is((select conforme from public.mesures_controle where controle_id = 'c0000000-0000-0000-0000-000000000001'), false, 'Grammage 13,9 hors tolérance (12,5–13,5) : non conforme, même si saisi « conforme »');
select throws_ok($$ insert into public.mesures_controle (controle_id, critere_id, conforme) select 'c0000000-0000-0000-0000-000000000001', id, true from public.criteres_qualite where etape = 'reception' and libelle = 'Humidité' $$,
  '22023', null, 'Valeur obligatoire pour un critère mesuré');
select matches(public.valider_controle('c0000000-0000-0000-0000-000000000001'), '^NC-\d{4}-\d{5}$', 'Contrôle non conforme : NC créée automatiquement');
select is((select statut::text from public.lots where id = (select id from t_lot)), 'bloque', 'La bobine non conforme est bloquée');
select throws_ok($$ update public.mesures_controle set valeur = 13 where controle_id = 'c0000000-0000-0000-0000-000000000001' $$, '42501', null, 'Contrôle validé figé');
select throws_ok(format('select public.decider_lot(%L, false, %L)', (select id from t_lot), ''), '22023', null, 'Motif obligatoire pour libérer');
select lives_ok(format('select public.decider_lot(%L, false, %L)', (select id from t_lot), 'Dérogation : grammage acceptable pour le Grand 100'), 'Libération motivée');
select is((select statut::text from public.lots where id = (select id from t_lot)), 'disponible', 'Bobine de nouveau disponible');

-- Clôture d'une NC
create temporary table t_nc as select id from public.non_conformites where controle_id = 'c0000000-0000-0000-0000-000000000001';
select throws_ok(format('select public.cloturer_nc(%L)', (select id from t_nc)), '22023', 'Renseignez la cause racine avant de clôturer.', 'Pas de clôture sans cause racine');
update public.non_conformites set cause_racine = 'Lot fournisseur hors spécification' where id = (select id from t_nc);
insert into public.actions_correctives (nc_id, description, realisee_le) select id, 'Réclamation au fournisseur', public.aujourdhui_conakry() from t_nc;
select lives_ok(format('select public.cloturer_nc(%L)', (select id from t_nc)), 'Clôture avec cause et actions réalisées');
select throws_ok(format('update public.non_conformites set description = %L where id = %L', 'x', (select id from t_nc)), '42501', null, 'NC clôturée figée');

-- Traçabilité : une fiche ancienne a des livraisons dans la fenêtre
select ok((select count(*) from public.tracer_fiche((select id from t_fiche))) > 0, 'Traçabilité : clients livrés après la production du lot');
select pg_temp.deconnecter();

select * from finish();
rollback;
