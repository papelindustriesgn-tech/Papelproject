-- RH : dossiers et salaires confidentiels (RH et Direction ; la Finance lit pour payer), paie figée après validation.
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

-- Données de test (en super-utilisateur).
insert into public.employes (id, nom, date_embauche, salaire_base_gnf) values ('90000000-0000-0000-0000-000000000001', 'Test', '2024-01-01', 2000000);
insert into public.periodes_paie (mois) values ('2026-09-01');
insert into public.bulletins (mois, employe_id, salaire_base_gnf, brut_gnf, cnss_salarie_gnf, cnss_employeur_gnf, rts_gnf, net_gnf)
values ('2026-09-01', '90000000-0000-0000-0000-000000000001', 2000000, 2000000, 100000, 360000, 45000, 1855000);

-- Un magasinier ne voit ni les employés ni les bulletins.
select set_config('request.jwt.claims', json_build_object('sub', (select id from public.profils where identifiant = 'magasin'), 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*)::int from public.employes), 0, 'Le magasin ne voit pas les dossiers du personnel');
select is((select count(*)::int from public.bulletins), 0, 'Le magasin ne voit pas les salaires');
reset role;

-- La Finance lit les bulletins (pour payer) mais ne les modifie pas.
select set_config('request.jwt.claims', json_build_object('sub', (select id from public.profils where identifiant = 'finance'), 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*)::int from public.bulletins where mois = '2026-09-01'), 1, 'La Finance lit les bulletins');
update public.bulletins set net_gnf = 1 where mois = '2026-09-01';
select isnt((select net_gnf from public.bulletins where mois = '2026-09-01'), 1::bigint, 'La Finance ne modifie pas un bulletin');
reset role;

-- Les RH valident la paie, ensuite les bulletins sont figés.
select set_config('request.jwt.claims', json_build_object('sub', (select id from public.profils where identifiant = 'drh'), 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*)::int from public.employes where id = '90000000-0000-0000-0000-000000000001'), 1, 'Les RH voient les dossiers');
select lives_ok($$ select public.valider_paie('2026-09-01') $$, 'Les RH valident la paie');
select throws_ok($$ update public.bulletins set primes_gnf = 10 where mois = '2026-09-01' $$, '22023', null, 'Une paie validée est figée');
reset role;

-- Jours ouvrables : du lundi 12 au dimanche 18 octobre 2026 = 6 jours.
select is(public.jours_ouvrables('2026-10-12', '2026-10-18'), 6, 'Jours ouvrables : lundi à samedi');

select * from finish();
rollback;
