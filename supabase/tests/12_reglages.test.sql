-- Réglages des services : chaque service règle son application et ses propres paramètres, pas ceux des autres.
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

-- L'identifiant se lit avant de prendre le rôle « authenticated » (sinon la RLS des profils le masque).
select set_config('request.jwt.claims', json_build_object('sub', (select id from public.profils where identifiant = 'magasin'), 'role', 'authenticated')::text, true);
set local role authenticated;

-- Paramètres : le magasin modifie un seuil de stock, pas un seuil de production.
update public.parametres set valeur = '20' where cle = 'stock_jours_couverture_alerte';
select is((select valeur::text from public.parametres where cle = 'stock_jours_couverture_alerte'), '20', 'Le magasin modifie ses seuils de stock');
update public.parametres set valeur = '0.5' where cle = 'seuil_rendement_min';
select isnt((select valeur::text from public.parametres where cle = 'seuil_rendement_min'), '0.5', 'Le magasin ne modifie pas les seuils de production');

-- Entrée de l'application : la sienne oui, celle d'un autre service non.
select lives_ok($$ insert into public.accueil_elements (espace, genre, libelle, ecran, icone) values ('magasin', 'action', 'Test', '/magasin', 'stock') $$, 'Le magasin ajoute un bouton à son application');
select throws_ok($$ insert into public.accueil_elements (espace, genre, libelle, ecran, icone) values ('production', 'action', 'Test', '/production', 'usine') $$, '42501', null, 'Le magasin ne règle pas l''application Production');
update public.accueil_espaces set promesse = 'x' where espace = 'ventes';
select isnt((select promesse from public.accueil_espaces where espace = 'ventes'), 'x', 'Le magasin ne change pas la phrase des Ventes');
select throws_ok($$ insert into public.accueil_elements (espace, genre, libelle, ecran) values ('magasin', 'tache', 'Sans indicateur', '/magasin') $$, '23514', null, 'Une ligne « À faire » exige un indicateur');

reset role;
select ok(exists (select 1 from public.journal_audit where table_nom = 'accueil_elements'), 'Les réglages sont tracés dans le journal d''audit');

select * from finish();
rollback;
