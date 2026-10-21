-- Tests de la maintenance : signalement par la production, clôture d'intervention (pièces sorties du stock,
-- plan préventif mis à jour), génération des préventifs, figement, droits.
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

select pg_temp.connecter('production');
select lives_ok($$ insert into public.interventions (id, equipement_id, type_intervention, description, arret_machine)
  values ('d0000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000002', 'curative', 'Bruit anormal plieuse', true) $$, 'La production signale une panne');
select throws_ok($$ insert into public.interventions (equipement_id, type_intervention, description) values ('80000000-0000-0000-0000-000000000002', 'preventive', 'x') $$,
  '42501', null, 'La production ne crée pas de préventif');
select throws_ok($$ select public.terminer_intervention('d0000000-0000-0000-0000-000000000001') $$, '42501', null, 'La production ne clôture pas');
select pg_temp.deconnecter();

select pg_temp.connecter('maintenance');
select matches((select numero from public.interventions where id = 'd0000000-0000-0000-0000-000000000001'), '^OT-\d{4}-\d{5}$', 'Ordre de travail numéroté');
select throws_ok($$ select public.terminer_intervention('d0000000-0000-0000-0000-000000000001') $$, '22023', null, 'Clôture refusée sans dates ni travaux');
update public.interventions set statut = 'en_cours', debut = now() - interval '50 minutes', fin = now(), travaux = 'Roulement remplacé', cause = 'Usure', intervenant = 'Test'
 where id = 'd0000000-0000-0000-0000-000000000001';
insert into public.intervention_pieces (intervention_id, article_id, quantite) values ('d0000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000004', 99);
select throws_ok($$ select public.terminer_intervention('d0000000-0000-0000-0000-000000000001') $$, '22023', null, 'Pièce en quantité supérieure au stock : refus');
update public.intervention_pieces set quantite = 2 where intervention_id = 'd0000000-0000-0000-0000-000000000001';
create temporary table t_avant as select quantite from public.stocks_articles where article_id = '41000000-0000-0000-0000-000000000004';
select lives_ok($$ select public.terminer_intervention('d0000000-0000-0000-0000-000000000001') $$, 'Intervention clôturée');
select is((select quantite from t_avant) - (select quantite from public.stocks_articles where article_id = '41000000-0000-0000-0000-000000000004'), 2::numeric, '2 roulements sortis du stock');
select is((select duree_min from public.interventions_etat where id = 'd0000000-0000-0000-0000-000000000001'), 50, 'Durée de l''arrêt : 50 min');
select throws_ok($$ update public.interventions set travaux = 'x' where id = 'd0000000-0000-0000-0000-000000000001' $$, '42501', null, 'Intervention clôturée figée');

-- Préventifs : le plan en retard (graissage) génère un OT, une seule fois.
select ok(public.generer_preventifs(7) >= 1, 'OT préventifs générés pour les échéances proches');
select is(public.generer_preventifs(7), 0, 'Pas de doublon si l''OT est déjà ouvert');
select pg_temp.deconnecter();

select * from finish();
rollback;
