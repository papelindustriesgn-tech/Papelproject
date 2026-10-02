-- =============================================================================
-- Papel ERP — Migration 2 : produits finis, conditionnements, grille de prix historisée
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Produits finis (le produit est le PAQUET : Petit 100, Grand 100)
-- -----------------------------------------------------------------------------
create table public.produits (
  id                  uuid primary key default gen_random_uuid(),
  code                text not null unique check (code ~ '^[A-Z0-9_-]{2,20}$'),
  libelle             text not null,
  nb_mouchoirs        integer not null check (nb_mouchoirs > 0),
  plis                smallint not null check (plis between 1 and 6),
  longueur_mm         numeric(6, 1) not null check (longueur_mm > 0),
  largeur_mm          numeric(6, 1) not null check (largeur_mm > 0),
  grammage_g_m2_pli   numeric(5, 2) not null default 13 check (grammage_g_m2_pli > 0),
  taux_perte_ref      numeric(5, 4) not null default 0.05 check (taux_perte_ref >= 0 and taux_perte_ref < 1),
  -- Poids théorique d'un paquet (g) et rendement théorique (paquets par tonne, après pertes) :
  -- même formule que src/lib/metier/rendement.ts (arrondi à l'entier le plus proche).
  poids_paquet_g      numeric(10, 3) generated always as (
    round((longueur_mm / 1000) * (largeur_mm / 1000) * plis * grammage_g_m2_pli * nb_mouchoirs, 3)
  ) stored,
  rendement_theorique_paquets_t integer generated always as (
    round(1000000 * (1 - taux_perte_ref) / ((longueur_mm / 1000) * (largeur_mm / 1000) * plis * grammage_g_m2_pli * nb_mouchoirs))
  ) stored,
  actif               boolean not null default true,
  ordre               smallint not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
comment on table public.produits is 'Produits finis. Unité de base : le paquet. Le rendement théorique est recalculé automatiquement.';

create trigger produits_updated_at before update on public.produits
  for each row execute function public.maj_updated_at();

-- -----------------------------------------------------------------------------
-- Conditionnements : nombre de paquets par colis (Petit : 50, 80 ou 100 ; Grand : 30)
-- -----------------------------------------------------------------------------
create table public.conditionnements (
  id                uuid primary key default gen_random_uuid(),
  produit_id        uuid not null references public.produits (id) on delete restrict,
  libelle           text not null,
  paquets_par_colis integer not null check (paquets_par_colis > 0),
  colis_par_palette integer check (colis_par_palette is null or colis_par_palette > 0),
  par_defaut        boolean not null default false,
  actif             boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (produit_id, paquets_par_colis)
);
comment on table public.conditionnements is 'Formats de colis par produit. Le prix d''un colis = prix du paquet × paquets par colis.';

-- Un seul conditionnement par défaut par produit.
create unique index conditionnements_un_defaut on public.conditionnements (produit_id) where par_defaut;

create trigger conditionnements_updated_at before update on public.conditionnements
  for each row execute function public.maj_updated_at();

-- -----------------------------------------------------------------------------
-- Grille de prix historisée (prix AU PAQUET, en GNF)
-- -----------------------------------------------------------------------------
-- Niveaux de prix : modifiables dans l'interface (on peut en ajouter, renommer, archiver).
-- Le niveau « papel » (prix de vente de Papel) est obligatoire et sert à la facturation.
create table public.niveaux_prix (
  code        text primary key check (code ~ '^[a-z0-9_]{2,30}$'),
  libelle     text not null,
  description text not null default '',
  ordre       smallint not null default 0,
  actif       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.niveaux_prix is 'Niveaux de la grille de prix : prix Papel, prix conseillés grossiste, semi-grossiste, détaillant…';
create trigger niveaux_prix_updated_at before update on public.niveaux_prix
  for each row execute function public.maj_updated_at();
-- Le niveau « papel » est indispensable : il ne peut être ni archivé ni renommé en code.
insert into public.niveaux_prix (code, libelle, description, ordre)
values ('papel', 'Prix Papel', 'Prix de vente de Papel à ses clients (facturation)', 0);
create or replace function public.proteger_niveau_papel()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.code <> old.code then
    raise exception 'Le code d''un niveau de prix ne peut pas être modifié : changez plutôt son libellé.' using errcode = '22023';
  end if;
  if old.code = 'papel' and (tg_op = 'DELETE' or not new.actif) then
    raise exception 'Le niveau « Prix Papel » est obligatoire : il ne peut être ni supprimé ni archivé.' using errcode = '22023';
  end if;
  return coalesce(new, old);
end $$;
create trigger niveaux_prix_protection before update or delete on public.niveaux_prix
  for each row execute function public.proteger_niveau_papel();

create table public.grille_prix (
  id              uuid primary key default gen_random_uuid(),
  produit_id      uuid not null references public.produits (id) on delete restrict,
  niveau          text not null references public.niveaux_prix (code),
  prix_paquet_gnf bigint not null check (prix_paquet_gnf > 0),
  date_debut      date not null,
  date_fin        date check (date_fin is null or date_fin >= date_debut),
  note            text,
  created_by      uuid references public.profils (id) default auth.uid(),
  created_at      timestamptz not null default now(),
  -- Deux prix d'un même produit et niveau ne peuvent pas se chevaucher dans le temps.
  constraint grille_prix_sans_chevauchement exclude using gist (
    produit_id with =,
    niveau with =,
    daterange(date_debut, date_fin, '[]') with &&
  )
);
comment on table public.grille_prix is 'Historique des prix au paquet. Un prix n''est jamais écrasé : on le clôture (date_fin) et on en crée un nouveau.';

-- Prix en vigueur à une date.
create or replace function public.prix_en_vigueur(p_produit uuid, p_niveau text, p_date date default public.aujourdhui_conakry())
returns bigint language sql stable set search_path = '' as $$
  select g.prix_paquet_gnf from public.grille_prix g
  where g.produit_id = p_produit and g.niveau = p_niveau
    and g.date_debut <= p_date and (g.date_fin is null or g.date_fin >= p_date)
  limit 1;
$$;

-- Définit un nouveau prix à partir d'une date : clôture le prix ouvert la veille.
-- Exécutée avec les droits de l'appelant (la RLS s'applique).
create or replace function public.definir_prix(
  p_produit uuid, p_niveau text, p_prix_paquet_gnf bigint, p_date_debut date, p_note text default null
) returns uuid language plpgsql set search_path = '' as $$
declare
  v_id uuid;
begin
  if p_prix_paquet_gnf is null or p_prix_paquet_gnf <= 0 then
    raise exception 'Le prix doit être supérieur à zéro.' using errcode = '22023';
  end if;
  if exists (select 1 from public.grille_prix where produit_id = p_produit and niveau = p_niveau and date_debut >= p_date_debut) then
    raise exception 'Un prix commence déjà à cette date ou après : l''historique ne peut pas être réécrit.' using errcode = '22023';
  end if;
  update public.grille_prix
     set date_fin = p_date_debut - 1
   where produit_id = p_produit and niveau = p_niveau and date_fin is null;
  insert into public.grille_prix (produit_id, niveau, prix_paquet_gnf, date_debut, note)
  values (p_produit, p_niveau, p_prix_paquet_gnf, p_date_debut, p_note)
  returning id into v_id;
  return v_id;
end $$;

-- Création d'un produit en une seule opération : produit + conditionnement par défaut + prix Papel.
-- Exécutée avec les droits de l'appelant (la RLS s'applique).
create or replace function public.creer_produit(
  p_code text, p_libelle text, p_nb_mouchoirs integer, p_plis smallint, p_longueur_mm numeric, p_largeur_mm numeric,
  p_grammage numeric, p_taux_perte numeric, p_paquets_par_colis integer,
  p_prix_paquet_gnf bigint default null, p_date_prix date default public.aujourdhui_conakry()
) returns uuid language plpgsql set search_path = '' as $$
declare
  v_id uuid;
begin
  insert into public.produits (code, libelle, nb_mouchoirs, plis, longueur_mm, largeur_mm, grammage_g_m2_pli, taux_perte_ref, ordre)
  values (upper(p_code), p_libelle, p_nb_mouchoirs, p_plis, p_longueur_mm, p_largeur_mm, p_grammage, p_taux_perte,
          (select coalesce(max(ordre), 0) + 1 from public.produits))
  returning id into v_id;
  insert into public.conditionnements (produit_id, libelle, paquets_par_colis, par_defaut)
  values (v_id, 'Colis de ' || p_paquets_par_colis, p_paquets_par_colis, true);
  if p_prix_paquet_gnf is not null then
    perform public.definir_prix(v_id, 'papel', p_prix_paquet_gnf, p_date_prix, null);
  end if;
  return v_id;
end $$;

-- Vue pratique : prix actuels avec prix du colis pour chaque conditionnement.
create view public.prix_actuels with (security_invoker = true) as
select
  p.id as produit_id, p.code as produit_code, p.libelle as produit_libelle,
  c.id as conditionnement_id, c.libelle as conditionnement_libelle, c.paquets_par_colis,
  g.niveau, g.prix_paquet_gnf, g.prix_paquet_gnf * c.paquets_par_colis as prix_colis_gnf, g.date_debut
from public.produits p
join public.conditionnements c on c.produit_id = p.id and c.actif
join public.grille_prix g on g.produit_id = p.id
  and g.date_debut <= public.aujourdhui_conakry()
  and (g.date_fin is null or g.date_fin >= public.aujourdhui_conakry())
where p.actif;

-- -----------------------------------------------------------------------------
-- RLS : lecture pour tous les utilisateurs actifs ; écriture admin et direction
-- -----------------------------------------------------------------------------
alter table public.produits enable row level security;
alter table public.conditionnements enable row level security;
alter table public.grille_prix enable row level security;
alter table public.niveaux_prix enable row level security;

create policy niveaux_prix_lecture on public.niveaux_prix for select to authenticated using (public.est_actif());
create policy niveaux_prix_ecriture on public.niveaux_prix for all to authenticated
  using (public.est_admin() or public.a_role('direction'))
  with check (public.est_admin() or public.a_role('direction'));

create policy produits_lecture on public.produits for select to authenticated using (public.est_actif());
create policy produits_ecriture on public.produits for all to authenticated
  using (public.est_admin() or public.a_role('direction'))
  with check (public.est_admin() or public.a_role('direction'));

create policy conditionnements_lecture on public.conditionnements for select to authenticated using (public.est_actif());
create policy conditionnements_ecriture on public.conditionnements for all to authenticated
  using (public.est_admin() or public.a_role('direction'))
  with check (public.est_admin() or public.a_role('direction'));

create policy grille_prix_lecture on public.grille_prix for select to authenticated using (public.est_actif());
create policy grille_prix_ajout on public.grille_prix for insert to authenticated
  with check (public.est_admin() or public.a_role('direction'));
-- Seule la clôture (date_fin) est modifiable ; le contrôle est fait par le trigger ci-dessous.
create policy grille_prix_cloture on public.grille_prix for update to authenticated
  using (public.est_admin() or public.a_role('direction'))
  with check (public.est_admin() or public.a_role('direction'));

-- Un prix enregistré ne change jamais de montant ni de date de début (historique conservé).
create or replace function public.grille_prix_immuable()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.prix_paquet_gnf <> old.prix_paquet_gnf or new.date_debut <> old.date_debut
     or new.produit_id <> old.produit_id or new.niveau <> old.niveau then
    raise exception 'Un prix historisé ne peut pas être modifié : créez un nouveau prix.' using errcode = '22023';
  end if;
  return new;
end $$;
create trigger grille_prix_immuable before update on public.grille_prix
  for each row execute function public.grille_prix_immuable();

select public.activer_audit('public.produits');
select public.activer_audit('public.conditionnements');
select public.activer_audit('public.grille_prix');
select public.activer_audit('public.niveaux_prix', 'code');
