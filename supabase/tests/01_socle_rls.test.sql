-- Tests des droits (RLS), du journal d'audit et de l'historique des prix.
-- Lancement : npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

-- Se connecter « comme » un utilisateur de démo.
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

-- --- Anonyme : ne voit rien -------------------------------------------------
set local role anon;
select is((select count(*) from public.produits), 0::bigint, 'Anonyme : aucun produit visible');
select is((select count(*) from public.parametres), 0::bigint, 'Anonyme : aucun paramètre visible');
reset role;

-- --- Fonctions de droits ----------------------------------------------------
select pg_temp.connecter('magasin');
select ok(public.a_role('magasin'), 'Le magasinier a le rôle magasin');
select ok(not public.a_un_role('finance'), 'Le magasinier n''a pas le rôle finance');
select is((select count(*) from public.produits), 2::bigint, 'Le magasinier lit les produits');

-- Magasinier : ne peut pas modifier un paramètre (0 ligne mise à jour par la RLS).
update public.parametres set valeur = '0.5' where cle = 'taux_dotation';
select pg_temp.deconnecter();
select is((select valeur from public.parametres where cle = 'taux_dotation'), '0.04'::jsonb, 'Magasinier : paramètre inchangé');

-- La direction a accès à tout via a_un_role.
select pg_temp.connecter('pdg');
select ok(public.a_un_role('finance'), 'La direction passe tous les contrôles de rôle');
select pg_temp.deconnecter();

-- --- Admin : modifie un paramètre, c'est journalisé ------------------------
select pg_temp.connecter('admin');
update public.parametres set valeur = '0.05' where cle = 'taux_dotation';
select pg_temp.deconnecter();
select is((select valeur from public.parametres where cle = 'taux_dotation'), '0.05'::jsonb, 'Admin : paramètre modifié');
select is(
  (select utilisateur_id from public.journal_audit where table_nom = 'parametres' and enregistrement_id = 'taux_dotation' order by id desc limit 1),
  (select id from public.profils where identifiant = 'admin'),
  'Journal d''audit : la modification est attribuée à l''admin'
);
select is(
  (select avant ->> 'valeur' from public.journal_audit where table_nom = 'parametres' and enregistrement_id = 'taux_dotation' order by id desc limit 1),
  '0.04', 'Journal d''audit : la valeur avant est conservée'
);

-- --- Journal d'audit : non modifiable ---------------------------------------
select pg_temp.connecter('admin');
select throws_ok($$ delete from public.journal_audit $$, '42501', null, 'Le journal d''audit ne peut pas être supprimé');
select throws_ok($$ insert into public.journal_audit (table_nom, operation) values ('x', 'INSERT') $$, '42501', null, 'Le journal d''audit ne peut pas être alimenté à la main');

-- --- Rôles : un admin ne peut pas s'attribuer le rôle Direction --------------
select throws_ok(
  $$ insert into public.utilisateur_roles (utilisateur_id, role) select id, 'direction' from public.profils where identifiant = 'admin' $$,
  '42501', null, 'Un admin ne peut pas s''attribuer le rôle Direction'
);
select lives_ok(
  $$ insert into public.utilisateur_roles (utilisateur_id, role) select id, 'magasin' from public.profils where identifiant = 'commercial3' $$,
  'Un admin peut attribuer un rôle courant'
);
select pg_temp.deconnecter();

-- --- Profils : chacun voit le sien, le responsable commercial voit l'équipe -----
select pg_temp.connecter('commercial1');
select is((select count(*) from public.profils), 1::bigint, 'Un commercial ne voit que son propre profil');
select pg_temp.deconnecter();
select pg_temp.connecter('resp.commercial');
select ok((select count(*) from public.profils) > 1, 'Le responsable commercial voit les profils de l''équipe');
select pg_temp.deconnecter();

-- --- Profil désactivé : plus aucun droit -------------------------------------
update public.profils set actif = false where identifiant = 'magasin';
select pg_temp.connecter('magasin');
select is((select count(*) from public.produits), 0::bigint, 'Un compte désactivé ne voit plus rien');
select pg_temp.deconnecter();

-- --- Historique des prix ---------------------------------------------------
select pg_temp.connecter('pdg');
select lives_ok(
  $$ select public.definir_prix('10000000-0000-0000-0000-000000000001', 'papel', 3500, '2026-11-01') $$,
  'La direction définit un nouveau prix'
);
select is(
  (select date_fin from public.grille_prix where produit_id = '10000000-0000-0000-0000-000000000001' and niveau = 'papel' and prix_paquet_gnf = 3400),
  '2026-10-31'::date, 'L''ancien prix est clôturé la veille, pas écrasé'
);
select throws_ok(
  $$ update public.grille_prix set prix_paquet_gnf = 1 where niveau = 'papel' $$,
  '22023', null, 'Un prix historisé ne peut pas être modifié'
);
select pg_temp.deconnecter();

select * from finish();
rollback;
