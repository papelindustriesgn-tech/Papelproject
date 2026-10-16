-- Rapport hebdomadaire : réservé à la tâche planifiée (rôle service), fermé aux utilisateurs, même la Direction.
begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

select ok((public.rapport_hebdomadaire(current_date - 7, current_date - 1) ->> 'ca_ht_gnf')::numeric >= 0, 'Le rapport se calcule');
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select id from public.profils where identifiant = 'direction'), 'role', 'authenticated')::text, true);
select throws_ok($$ select public.rapport_hebdomadaire(current_date - 7, current_date - 1) $$, '42501', null, 'Un utilisateur (même la Direction) ne l''appelle pas');
reset role;
set local role service_role;
select lives_ok($$ select public.rapport_hebdomadaire(current_date - 7, current_date - 1) $$, 'La tâche planifiée (service) l''appelle');
reset role;

select * from finish();
rollback;
