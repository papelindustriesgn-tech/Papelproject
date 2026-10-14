-- Réglages des services et paramètres : réservés à l'administrateur (ni les services, ni la Direction).
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

-- Un service (magasin) ne règle rien, pas même ses propres seuils.
-- L'identifiant se lit avant de prendre le rôle « authenticated » (sinon la RLS des profils le masque).
select set_config('request.jwt.claims', json_build_object('sub', (select id from public.profils where identifiant = 'magasin'), 'role', 'authenticated')::text, true);
set local role authenticated;
update public.parametres set valeur = '20' where cle = 'stock_jours_couverture_alerte';
select isnt((select valeur::text from public.parametres where cle = 'stock_jours_couverture_alerte'), '20', 'Le magasin ne modifie pas ses seuils');
select throws_ok($$ insert into public.accueil_elements (espace, genre, libelle, ecran, icone) values ('magasin', 'action', 'Test', '/magasin', 'stock') $$, '42501', null, 'Le magasin ne règle pas son application');
update public.accueil_espaces set promesse = 'x' where espace = 'magasin';
select isnt((select promesse from public.accueil_espaces where espace = 'magasin'), 'x', 'Le magasin ne change pas sa phrase d''accueil');
reset role;

-- La Direction non plus.
select set_config('request.jwt.claims', json_build_object('sub', (select id from public.profils where identifiant = 'pdg'), 'role', 'authenticated')::text, true);
set local role authenticated;
update public.parametres set valeur = '0.5' where cle = 'seuil_rendement_min';
select isnt((select valeur::text from public.parametres where cle = 'seuil_rendement_min'), '0.5', 'La Direction ne modifie pas les paramètres');
reset role;

-- L'administrateur règle tout.
select set_config('request.jwt.claims', json_build_object('sub', (select id from public.profils where identifiant = 'admin'), 'role', 'authenticated')::text, true);
set local role authenticated;
update public.parametres set valeur = '20' where cle = 'stock_jours_couverture_alerte';
select is((select valeur::text from public.parametres where cle = 'stock_jours_couverture_alerte'), '20', 'L''administrateur modifie les paramètres');
select lives_ok($$ insert into public.accueil_elements (espace, genre, libelle, ecran, icone) values ('magasin', 'action', 'Test', '/magasin', 'stock') $$, 'L''administrateur règle les applications');
select throws_ok($$ insert into public.accueil_elements (espace, genre, libelle, ecran) values ('magasin', 'tache', 'Sans indicateur', '/magasin') $$, '23514', null, 'Une ligne « À faire » exige un indicateur');
reset role;
select ok(exists (select 1 from public.journal_audit where table_nom = 'accueil_elements'), 'Les réglages sont tracés dans le journal d''audit');

select * from finish();
rollback;
