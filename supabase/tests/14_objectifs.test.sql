-- Objectifs du business plan : lus par tous les services, modifiés seulement par la Direction, la Finance et l'administrateur.
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

-- Un magasinier lit les objectifs mais ne peut pas en ajouter.
select set_config('request.jwt.claims', json_build_object('sub', (select id from public.profils where identifiant = 'magasin'), 'role', 'authenticated')::text, true);
set local role authenticated;
select ok((select count(*) from public.objectifs_mensuels) > 0, 'Le magasin lit les objectifs');
select throws_ok($$ insert into public.objectifs_mensuels (mois, ca_ttc_gnf) values ('2035-01-01', 1) $$, '42501', null, 'Le magasin ne peut pas ajouter d''objectif');
reset role;

-- La Finance ajoute un objectif ; un mois doit commencer le 1er.
select set_config('request.jwt.claims', json_build_object('sub', (select id from public.profils where identifiant = 'finance'), 'role', 'authenticated')::text, true);
set local role authenticated;
select lives_ok($$ insert into public.objectifs_mensuels (mois, ca_ttc_gnf) values ('2035-01-01', 1) $$, 'La Finance ajoute un objectif');
select throws_ok($$ insert into public.objectifs_mensuels (mois, ca_ttc_gnf) values ('2035-02-15', 1) $$, '23514', null, 'Un objectif porte sur un mois (1er jour)');
select throws_ok($$ insert into public.objectifs_mensuels (mois, ca_ttc_gnf) values ('2035-01-01', 2) $$, '23505', null, 'Un seul objectif par mois');
reset role;

select * from finish();
rollback;
