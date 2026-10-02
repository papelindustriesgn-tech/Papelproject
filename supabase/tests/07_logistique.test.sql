-- Tests de la logistique : tournées, capacité, départ, preuve de remise, retours en stock, clôture, droits.
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

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

-- Bon de livraison validé le plus récent, remis à l'état « à livrer, sans tournée » (indépendant des tests précédents).
update public.lignes_livraison set paquets_retournes = 0
 where livraison_id = (select id from public.livraisons where statut = 'validee' order by date_livraison desc, numero desc limit 1);
update public.livraisons set tournee_id = null, ordre = 0, statut_remise = 'a_livrer', remise_le = null, signature_chemin = null
 where id = (select id from public.livraisons where statut = 'validee' order by date_livraison desc, numero desc limit 1);
create temporary table t_bl as
select l.id, (select ll.id from public.lignes_livraison ll where ll.livraison_id = l.id order by ll.paquets desc limit 1) as ligne_id,
       (select a.id from public.lignes_livraison ll join public.articles a on a.conditionnement_id = ll.conditionnement_id
         where ll.livraison_id = l.id order by ll.paquets desc limit 1) as article_id
from public.livraisons l where l.statut = 'validee' order by l.date_livraison desc, l.numero desc limit 1;
grant select on t_bl to authenticated;

select pg_temp.connecter('commercial1');
select throws_ok($$ insert into public.tournees_livraison (vehicule_id, chauffeur_id) values ('70000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001') $$,
  '42501', null, 'Un commercial ne crée pas de tournée');
select is((select count(*)::int from public.tournees_livraison), 0, 'Un commercial ne voit pas les tournées');
select pg_temp.deconnecter();

select pg_temp.connecter('logistique');
update public.vehicules set capacite_colis = 50 where id = '70000000-0000-0000-0000-000000000002';
insert into public.tournees_livraison (id, vehicule_id, chauffeur_id) values ('b0000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002', '71000000-0000-0000-0000-000000000001');
select matches((select numero from public.tournees_livraison where id = 'b0000000-0000-0000-0000-000000000001'), '^TL-\d{4}-\d{5}$', 'Tournée numérotée');
select throws_ok(format('select public.affecter_livraison(%L, %L)', 'b0000000-0000-0000-0000-000000000001', (select id from t_bl)),
  '22023', null, 'Véhicule de 50 colis : chargement trop gros refusé');
update public.tournees_livraison set vehicule_id = '70000000-0000-0000-0000-000000000001' where id = 'b0000000-0000-0000-0000-000000000001';
select lives_ok(format('select public.affecter_livraison(%L, %L)', 'b0000000-0000-0000-0000-000000000001', (select id from t_bl)), 'Camion : bon chargé');
select throws_ok(format('select public.enregistrer_remise(%L, %L, %L, %L)', (select id from t_bl), 'livree', 'Gérant', 'x/sig.png'),
  '22023', null, 'Pas de remise avant le départ');
select throws_ok($$ select public.terminer_tournee('b0000000-0000-0000-0000-000000000001', 1000) $$, '22023', null, 'Une tournée planifiée ne se termine pas');
select lives_ok($$ select public.demarrer_tournee('b0000000-0000-0000-0000-000000000001', 50000) $$, 'Départ');
select throws_ok(format('update public.livraisons set statut_remise = %L where id = %L', 'livree', (select id from t_bl)),
  '42501', null, 'Un bon validé ne se modifie pas directement');
select throws_ok(format('select public.enregistrer_remise(%L, %L, %L)', (select id from t_bl), 'livree', 'Gérant'),
  '22023', 'La signature du client est obligatoire.', 'Signature obligatoire');
select throws_ok($$ select public.terminer_tournee('b0000000-0000-0000-0000-000000000001', 50100) $$, '22023', null, 'Clôture refusée tant qu''un bon n''est pas remis');

-- Livraison partielle : 100 paquets rapportés → retour en stock et reste à livrer.
create temporary table t_avant as select quantite from public.stocks_articles where article_id = (select article_id from t_bl);
select lives_ok(format('select public.enregistrer_remise(%L, %L, %L, %L, null, 9.7, -13.4, 12, %L, %L::jsonb)', (select id from t_bl), 'partielle', 'Gérant', 'x/sig.png', 'Colis abîmés',
  json_build_array(json_build_object('ligne_id', (select ligne_id from t_bl), 'paquets', 100))), 'Remise partielle avec preuve');
select is((select quantite from public.stocks_articles where article_id = (select article_id from t_bl)) - (select quantite from t_avant), 100::numeric, '100 paquets revenus en stock');
select is((select sum(paquets_restants)::int from public.reste_a_livrer r join public.livraisons l on l.commande_id = r.commande_id where l.id = (select id from t_bl)),
  100, 'Les paquets rapportés restent à livrer');
select throws_ok($$ select public.terminer_tournee('b0000000-0000-0000-0000-000000000001', 49000) $$, '22023', null, 'Kilométrage de retour incohérent refusé');
select lives_ok($$ select public.terminer_tournee('b0000000-0000-0000-0000-000000000001', 50085) $$, 'Tournée terminée');
select pg_temp.deconnecter();

select * from finish();
rollback;
