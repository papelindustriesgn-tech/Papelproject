-- =============================================================================
-- Papel ERP — Migration 1 : socle
-- Extensions, rôles, profils, fonctions de droits, journal d'audit,
-- paramètres, taux de change, géographie.
-- =============================================================================

create extension if not exists postgis with schema extensions;
create extension if not exists btree_gist with schema extensions;

-- -----------------------------------------------------------------------------
-- Rôles métier
-- -----------------------------------------------------------------------------
create type public.role_code as enum (
  'direction',              -- PDG, DG : accès total
  'achats',                 -- Achats et approvisionnement
  'magasin',                -- Magasinier
  'production',             -- Chef de production, opérateurs
  'maintenance',            -- Techniciens
  'qualite',                -- QHSE
  'commercial_terrain',     -- Agents commerciaux (PWA)
  'responsable_commercial', -- Supervise les commerciaux
  'logistique',             -- Logistique et chauffeurs
  'finance',                -- Comptabilité et finance
  'admin'                   -- Administrateur système
);

create table public.roles (
  code        public.role_code primary key,
  libelle     text not null,
  description text not null default '',
  ordre       smallint not null default 0
);
comment on table public.roles is 'Libellés des rôles métier (la liste est fixée par le type role_code).';

insert into public.roles (code, libelle, description, ordre) values
  ('direction', 'Direction', 'PDG, DG : accès total et tableau de bord global', 1),
  ('achats', 'Achats et approvisionnement', 'Fournisseurs, commandes, conteneurs', 2),
  ('magasin', 'Magasin', 'Stocks matières premières, emballages, produits finis', 3),
  ('production', 'Production', 'Chef de production et opérateurs', 4),
  ('maintenance', 'Maintenance', 'Techniciens de maintenance', 5),
  ('qualite', 'Qualité (QHSE)', 'Contrôles, non-conformités, traçabilité', 6),
  ('commercial_terrain', 'Commercial terrain', 'Agents commerciaux : application mobile', 7),
  ('responsable_commercial', 'Responsable commercial', 'Supervise les commerciaux', 8),
  ('logistique', 'Logistique et livraison', 'Tournées, véhicules, chauffeurs', 9),
  ('finance', 'Comptabilité et finance', 'Caisse, banque, créances, dettes', 10),
  ('admin', 'Administrateur système', 'Utilisateurs, rôles, paramètres', 11);

-- -----------------------------------------------------------------------------
-- Utilitaire : mise à jour automatique de updated_at
-- -----------------------------------------------------------------------------
create or replace function public.maj_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- -----------------------------------------------------------------------------
-- Profils (un par compte Auth)
-- -----------------------------------------------------------------------------
create table public.profils (
  id          uuid primary key references auth.users (id) on delete cascade,
  identifiant text not null unique check (identifiant ~ '^[a-z0-9._-]{3,40}$'),
  nom         text not null check (length(trim(nom)) > 0),
  prenom      text not null default '',
  telephone   text,
  actif       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.profils is 'Profil de chaque utilisateur. Connexion par identifiant (converti en e-mail technique identifiant@papel.local).';

create trigger profils_updated_at before update on public.profils
  for each row execute function public.maj_updated_at();

create table public.utilisateur_roles (
  utilisateur_id uuid not null references public.profils (id) on delete cascade,
  role           public.role_code not null,
  created_at     timestamptz not null default now(),
  primary key (utilisateur_id, role)
);
comment on table public.utilisateur_roles is 'Rôles attribués à chaque utilisateur (un utilisateur peut cumuler plusieurs rôles).';

-- Création automatique du profil quand l'administrateur crée un compte Auth.
create or replace function public.creer_profil_utilisateur()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profils (id, identifiant, nom, prenom, telephone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'identifiant', split_part(new.email, '@', 1)),
    coalesce(nullif(new.raw_user_meta_data ->> 'nom', ''), split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'prenom', ''),
    new.raw_user_meta_data ->> 'telephone'
  );
  return new;
end $$;

create trigger auth_utilisateur_cree after insert on auth.users
  for each row execute function public.creer_profil_utilisateur();

-- -----------------------------------------------------------------------------
-- Fonctions de droits (utilisées par toutes les politiques RLS)
-- security definer : lisent utilisateur_roles sans être bloquées par sa propre RLS.
-- -----------------------------------------------------------------------------

-- Vrai si l'utilisateur connecté est actif et possède le rôle demandé.
create or replace function public.a_role(r public.role_code)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.utilisateur_roles ur
    join public.profils p on p.id = ur.utilisateur_id
    where ur.utilisateur_id = (select auth.uid()) and ur.role = r and p.actif
  );
$$;

-- Vrai si l'utilisateur possède l'un des rôles donnés, ou est Direction (accès total).
create or replace function public.a_un_role(variadic roles public.role_code[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.utilisateur_roles ur
    join public.profils p on p.id = ur.utilisateur_id
    where ur.utilisateur_id = (select auth.uid())
      and p.actif
      and (ur.role = any (roles) or ur.role = 'direction')
  );
$$;

create or replace function public.est_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.a_role('admin');
$$;

-- Vrai pour tout utilisateur connecté dont le profil est actif.
create or replace function public.est_actif()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profils where id = (select auth.uid()) and actif);
$$;

-- Liste des rôles de l'utilisateur connecté (pour l'interface).
create or replace function public.mes_roles()
returns public.role_code[] language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(ur.role order by ur.role), '{}')
  from public.utilisateur_roles ur
  join public.profils p on p.id = ur.utilisateur_id
  where ur.utilisateur_id = (select auth.uid()) and p.actif;
$$;

-- Hook Auth : ajoute les rôles Papel au jeton (claim "papel_roles").
-- Sert uniquement aux redirections rapides de l'interface ; la RLS relit toujours la table.
create or replace function public.hook_jeton_acces(event jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  claims jsonb := coalesce(event -> 'claims', '{}');
  roles  jsonb;
begin
  select coalesce(jsonb_agg(ur.role order by ur.role), '[]'::jsonb) into roles
  from public.utilisateur_roles ur
  join public.profils p on p.id = ur.utilisateur_id
  where ur.utilisateur_id = (event ->> 'user_id')::uuid and p.actif;
  claims := jsonb_set(claims, '{papel_roles}', roles);
  return jsonb_set(event, '{claims}', claims);
end $$;

grant execute on function public.hook_jeton_acces(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_jeton_acces(jsonb) from authenticated, anon, public;
grant usage on schema public to supabase_auth_admin;

-- -----------------------------------------------------------------------------
-- Journal d'audit : qui, quoi, quand, avant/après. Ajout seul.
-- -----------------------------------------------------------------------------
create table public.journal_audit (
  id               bigint generated always as identity primary key,
  horodatage       timestamptz not null default now(),
  utilisateur_id   uuid,
  table_nom        text not null,
  enregistrement_id text,
  operation        text not null check (operation in ('INSERT', 'UPDATE', 'DELETE')),
  avant            jsonb,
  apres            jsonb
);
create index journal_audit_table_idx on public.journal_audit (table_nom, horodatage desc);
create index journal_audit_utilisateur_idx on public.journal_audit (utilisateur_id, horodatage desc);
comment on table public.journal_audit is 'Journal de toutes les modifications. Aucune modification ni suppression possible.';

create or replace function public.journaliser()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  ancien jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  nouveau jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
begin
  -- On n'enregistre pas les mises à jour sans changement réel.
  if tg_op = 'UPDATE' and ancien = nouveau then
    return new;
  end if;
  insert into public.journal_audit (utilisateur_id, table_nom, enregistrement_id, operation, avant, apres)
  values (
    (select auth.uid()),
    tg_table_name,
    coalesce(nouveau, ancien) ->> coalesce(tg_argv[0], 'id'),
    tg_op,
    ancien,
    nouveau
  );
  return coalesce(new, old);
end $$;

-- Raccourci pour poser le trigger d'audit sur une table.
-- p_cle : colonne servant d'identifiant dans le journal (par défaut « id »).
create or replace function public.activer_audit(p_table regclass, p_cle text default 'id')
returns void language plpgsql set search_path = '' as $$
begin
  execute format(
    'create trigger audit_%s after insert or update or delete on %s for each row execute function public.journaliser(%L)',
    replace(p_table::text, 'public.', ''), p_table, p_cle
  );
end $$;
revoke execute on function public.activer_audit(regclass, text) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Paramètres (clé → valeur JSON), modifiables dans Admin
-- -----------------------------------------------------------------------------
create table public.parametres (
  cle         text primary key check (cle ~ '^[a-z0-9_]+$'),
  valeur      jsonb not null,
  libelle     text not null,
  description text not null default '',
  categorie   text not null default 'general',
  -- Type pour l'interface : nombre, pourcentage, entier, texte, booleen, liste
  type_valeur text not null default 'nombre'
    check (type_valeur in ('nombre', 'pourcentage', 'entier', 'texte', 'booleen', 'liste')),
  unite       text,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profils (id) default auth.uid()
);
comment on table public.parametres is 'Paramètres métier : seuils d''alerte, taux de dotation, rayon GPS, etc.';

create trigger parametres_updated_at before update on public.parametres
  for each row execute function public.maj_updated_at();

-- -----------------------------------------------------------------------------
-- Taux de change historisés (GNF pour 1 unité de devise)
-- -----------------------------------------------------------------------------
create table public.taux_change (
  id         uuid primary key default gen_random_uuid(),
  devise     text not null default 'USD' check (devise in ('USD', 'EUR')),
  date_effet date not null,
  taux_gnf   numeric(12, 4) not null check (taux_gnf > 0),
  note       text,
  saisi_par  uuid references public.profils (id) default auth.uid(),
  created_at timestamptz not null default now(),
  unique (devise, date_effet)
);
comment on table public.taux_change is 'Taux de change : le taux applicable à une opération est le dernier taux dont la date d''effet est ≤ date de l''opération.';

-- Taux applicable à une date (dernier taux connu, sinon paramètre par défaut).
create or replace function public.taux_a_la_date(p_devise text, p_date date)
returns numeric language sql stable set search_path = '' as $$
  select coalesce(
    (select t.taux_gnf from public.taux_change t
      where t.devise = p_devise and t.date_effet <= p_date
      order by t.date_effet desc limit 1),
    (select (p.valeur #>> '{}')::numeric from public.parametres p where p.cle = 'taux_usd_gnf_defaut'),
    9450
  );
$$;

-- Nombre au format français pour les messages d'erreur : 1250.5 → « 1 250,5 », 3060000 → « 3 060 000 ».
create or replace function public.nombre_fr(n numeric)
returns text language plpgsql immutable set search_path = '' as $$
declare
  t text;
begin
  if n is null then return ''; end if;
  t := to_char(round(n, 3), 'FM999G999G999G999G990D000');
  t := replace(replace(t, ',', ' '), '.', ',');
  return rtrim(rtrim(t, '0'), ',');
end $$;

-- Date métier du jour à Conakry.
create or replace function public.aujourdhui_conakry()
returns date language sql stable set search_path = '' as $$
  select (now() at time zone 'Africa/Conakry')::date;
$$;

-- -----------------------------------------------------------------------------
-- Géographie : villes → communes → quartiers
-- -----------------------------------------------------------------------------
create table public.villes (
  id         uuid primary key default gen_random_uuid(),
  nom        text not null unique,
  prefecture text,
  region     text
);

create table public.communes (
  id      uuid primary key default gen_random_uuid(),
  ville_id uuid not null references public.villes (id) on delete restrict,
  nom     text not null,
  unique (ville_id, nom)
);

create table public.quartiers (
  id         uuid primary key default gen_random_uuid(),
  commune_id uuid not null references public.communes (id) on delete restrict,
  nom        text not null,
  unique (commune_id, nom)
);

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.roles enable row level security;
alter table public.profils enable row level security;
alter table public.utilisateur_roles enable row level security;
alter table public.journal_audit enable row level security;
alter table public.parametres enable row level security;
alter table public.taux_change enable row level security;
alter table public.villes enable row level security;
alter table public.communes enable row level security;
alter table public.quartiers enable row level security;

-- Rôles : lecture pour tout utilisateur actif.
create policy roles_lecture on public.roles for select to authenticated using (public.est_actif());

-- Profils : chacun voit le sien ; admin, direction, responsable commercial et comptabilité voient tous les profils
-- (liste de l'équipe commerciale, affectation des clients).
create policy profils_lecture on public.profils for select to authenticated
  using (id = (select auth.uid()) or public.est_admin() or public.a_un_role('responsable_commercial', 'finance'));
-- Seuls l'administrateur et la direction modifient les profils (activation, nom, téléphone).
create policy profils_modif_admin on public.profils for update to authenticated
  using (public.est_admin() or public.a_role('direction')) with check (public.est_admin() or public.a_role('direction'));

-- Rôles des utilisateurs : chacun voit les siens ; l'admin et la direction voient et gèrent tout.
create policy utilisateur_roles_lecture on public.utilisateur_roles for select to authenticated
  using (utilisateur_id = (select auth.uid()) or public.est_admin() or public.a_role('direction'));
-- Seule la Direction peut attribuer ou retirer le rôle Direction (un admin ne peut pas s'auto-promouvoir).
create policy utilisateur_roles_ajout on public.utilisateur_roles for insert to authenticated
  with check ((public.est_admin() or public.a_role('direction')) and (role <> 'direction' or public.a_role('direction')));
create policy utilisateur_roles_retrait on public.utilisateur_roles for delete to authenticated
  using ((public.est_admin() or public.a_role('direction')) and (role <> 'direction' or public.a_role('direction')));

-- Journal d'audit : lecture direction et admin ; aucune écriture directe.
create policy journal_lecture on public.journal_audit for select to authenticated
  using (public.est_admin() or public.a_role('direction'));
revoke insert, update, delete, truncate on public.journal_audit from anon, authenticated;

-- Paramètres : lecture pour tous les actifs ; modification admin et direction.
create policy parametres_lecture on public.parametres for select to authenticated using (public.est_actif());
create policy parametres_modif on public.parametres for update to authenticated
  using (public.est_admin() or public.a_role('direction'))
  with check (public.est_admin() or public.a_role('direction'));
create policy parametres_ajout on public.parametres for insert to authenticated
  with check (public.est_admin());

-- Taux de change : lecture pour tous ; saisie par admin, finance, achats (et direction).
create policy taux_lecture on public.taux_change for select to authenticated using (public.est_actif());
create policy taux_ajout on public.taux_change for insert to authenticated
  with check (public.est_admin() or public.a_un_role('finance', 'achats'));
create policy taux_modif on public.taux_change for update to authenticated
  using (public.est_admin() or public.a_un_role('finance', 'achats'))
  with check (public.est_admin() or public.a_un_role('finance', 'achats'));
create policy taux_suppr on public.taux_change for delete to authenticated
  using (public.est_admin() or public.a_un_role('finance'));

-- Géographie : lecture pour tous ; saisie admin et responsable commercial.
create policy villes_lecture on public.villes for select to authenticated using (public.est_actif());
create policy villes_ecriture on public.villes for all to authenticated
  using (public.est_admin() or public.a_un_role('responsable_commercial'))
  with check (public.est_admin() or public.a_un_role('responsable_commercial'));
create policy communes_lecture on public.communes for select to authenticated using (public.est_actif());
create policy communes_ecriture on public.communes for all to authenticated
  using (public.est_admin() or public.a_un_role('responsable_commercial'))
  with check (public.est_admin() or public.a_un_role('responsable_commercial'));
create policy quartiers_lecture on public.quartiers for select to authenticated using (public.est_actif());
-- Le commercial terrain peut ajouter un quartier manquant lors de la création d'un PVA.
create policy quartiers_ajout on public.quartiers for insert to authenticated
  with check (public.est_admin() or public.a_un_role('responsable_commercial', 'commercial_terrain'));
create policy quartiers_modif on public.quartiers for update to authenticated
  using (public.est_admin() or public.a_un_role('responsable_commercial'))
  with check (public.est_admin() or public.a_un_role('responsable_commercial'));

-- -----------------------------------------------------------------------------
-- Audit
-- -----------------------------------------------------------------------------
select public.activer_audit('public.profils');
select public.activer_audit('public.utilisateur_roles', 'utilisateur_id');
select public.activer_audit('public.parametres', 'cle');
select public.activer_audit('public.taux_change');
select public.activer_audit('public.villes');
select public.activer_audit('public.communes');
select public.activer_audit('public.quartiers');
