-- Coordination entre services : objectifs mensuels, tâches, commandes du terrain, commandes à servir, confirmation des livraisons.
begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

create temporary table bl_test as
select l.id, p.commercial_id from public.livraisons l join public.pieces_vente p on p.id = l.commande_id
where l.statut_remise <> 'a_livrer' and p.commercial_id is not null limit 1;
grant select on bl_test to authenticated;

create function pg_temp.connecter(p_identifiant text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', (select id from public.profils where identifiant = p_identifiant), 'role', 'authenticated')::text, true);
$$;

-- Objectifs : lus par tous, fixés par la Direction.
select pg_temp.connecter('magasin');
set local role authenticated;
select ok((select count(*) from public.objectifs_services) > 0, 'Le magasin lit les objectifs');
select throws_ok($$ insert into public.objectifs_services (espace, indicateur, mois, valeur) values ('magasin', 'paquets_livres', '2035-01-01', 1) $$, '42501', null, 'Le magasin ne fixe pas ses objectifs');
-- Commandes à servir : visibles par le magasin.
select lives_ok($$ select public.coordination_commandes() $$, 'Le magasin voit les commandes à servir');
-- Tâche du magasin vers la production.
select lives_ok($$ insert into public.taches (titre, espace_emetteur, espace_destinataire) values ('Préparer 20 cartons', 'magasin', 'production') $$, 'Le magasin envoie une demande à la production');
select throws_ok($$ insert into public.taches (titre, espace_emetteur, espace_destinataire) values ('Demande usurpée', 'finance', 'production') $$, '42501', null, 'On n''écrit qu''au nom de son service');
select throws_ok($$ update public.taches set statut = 'faite' where titre = 'Préparer 20 cartons' $$, '42501', null, 'L''émetteur ne termine pas la tâche à la place du destinataire');
reset role;

select pg_temp.connecter('qualite');
set local role authenticated;
select throws_ok($$ select public.coordination_commandes() $$, '42501', null, 'La qualité n''a pas accès aux commandes clients');
select is((select count(*) from public.taches), 0::bigint, 'Une tâche n''est visible que des services concernés');
reset role;

select pg_temp.connecter('production');
set local role authenticated;
update public.taches set statut = 'en_cours' where titre = 'Préparer 20 cartons';
update public.taches set statut = 'faite', compte_rendu = 'Fait' where titre = 'Préparer 20 cartons';
select is((select termine_par from public.taches where titre = 'Préparer 20 cartons'), (select id from public.profils where identifiant = 'production'), 'La production termine la tâche');
select throws_ok($$ update public.taches set compte_rendu = 'Modifié' where titre = 'Préparer 20 cartons' $$, '42501', null, 'Une tâche terminée est figée');
reset role;

select pg_temp.connecter('pdg');
set local role authenticated;
select lives_ok($$ insert into public.objectifs_services (espace, indicateur, mois, valeur) values ('magasin', 'paquets_livres', '2035-01-01', 1000) $$, 'La Direction fixe les objectifs');
reset role;

-- Le commercial passe une commande dans sa série (CMD-AAAA-<code>-NNNNN).
select pg_temp.connecter('commercial1');
set local role authenticated;
select lives_ok($$ insert into public.pieces_vente (type_piece, numero, client_id, commercial_id)
  values ('commande', 'CMD-2026-C01-00001', (select id from public.clients where commercial_id = auth.uid() limit 1), auth.uid()) $$, 'Le commercial passe une commande dans sa série');
select throws_ok($$ insert into public.pieces_vente (type_piece, numero, client_id, commercial_id)
  values ('commande', 'FA-2026-C01-00099', (select id from public.clients where commercial_id = auth.uid() limit 1), auth.uid()) $$, '22023', null, 'Une commande a un numéro CMD-');
reset role;

-- Confirmation de la livraison par le commercial de la commande, une seule fois.
select set_config('request.jwt.claims', json_build_object('sub', (select commercial_id from bl_test), 'role', 'authenticated')::text, true);
set local role authenticated;
select is(public.confirmer_livraison((select id from bl_test), 'conforme'), 'ok', 'Le commercial confirme la livraison');
select is(public.confirmer_livraison((select id from bl_test), 'conforme'), 'deja', 'Un renvoi ne confirme pas deux fois');
reset role;

select * from finish();
rollback;
