-- =============================================================================
-- Papel ERP — Migration 3 : stocks
-- Articles (MP, emballages, produits finis, pièces), fournisseurs, lots (bobines jumbo),
-- mouvements (journal en ajout seul), stock en temps réel valorisé au coût moyen pondéré (CMP),
-- inventaires, jours de couverture et alertes.
-- Site unique : usine de Coyah.
-- =============================================================================

create type public.famille_article as enum ('matiere_premiere', 'emballage', 'produit_fini', 'piece_detachee', 'autre');

-- Unités de stock autorisées. Les conversions sont centralisées dans src/lib/metier/unites.ts.
create type public.unite_stock as enum ('kg', 'paquet', 'unite', 'rouleau', 'litre', 'metre');

-- Types de mouvement : le signe de la quantité est imposé par le type.
create type public.type_mouvement as enum (
  'reception',    -- + entrée fournisseur
  'production',   -- + entrée de produits finis fabriqués
  'retour',       -- + retour client ou retour d'atelier
  'consommation', -- − consommation en production (bobines, films…)
  'sortie',       -- − sortie diverse (échantillon, usage interne…)
  'vente',        -- − livraison client
  'dotation',     -- − colis offerts (dotation)
  'rebut',        -- − mise au rebut
  'ajustement',   -- ± correction manuelle justifiée
  'inventaire'    -- ± écart constaté à l'inventaire
);

-- -----------------------------------------------------------------------------
-- Listes de référence
-- -----------------------------------------------------------------------------
create table public.categories_articles (
  id         uuid primary key default gen_random_uuid(),
  famille    public.famille_article not null,
  libelle    text not null check (length(trim(libelle)) > 0),
  actif      boolean not null default true,
  created_at timestamptz not null default now(),
  unique (famille, libelle)
);

create table public.fournisseurs (
  id         uuid primary key default gen_random_uuid(),
  nom        text not null unique check (length(trim(nom)) > 0),
  pays       text not null default '',
  contact    text not null default '',
  telephone  text not null default '',
  email      text not null default '',
  notes      text not null default '',
  actif      boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger fournisseurs_updated_at before update on public.fournisseurs
  for each row execute function public.maj_updated_at();

-- -----------------------------------------------------------------------------
-- Articles
-- -----------------------------------------------------------------------------
create table public.articles (
  id                 uuid primary key default gen_random_uuid(),
  code               text not null unique check (code ~ '^[A-Z0-9_.-]{2,30}$'),
  libelle            text not null check (length(trim(libelle)) > 0),
  famille            public.famille_article not null,
  categorie_id       uuid references public.categories_articles (id),
  unite              public.unite_stock not null,
  -- Bobines jumbo : chaque entrée/sortie est rattachée à un lot (n° de lot, poids, grammage…).
  suivi_par_lot      boolean not null default false,
  -- Seuil d'alerte, exprimé dans l'unité de l'article.
  seuil_alerte       numeric(14, 3) not null default 0 check (seuil_alerte >= 0),
  -- Produits finis : un article par (produit × conditionnement), stocké en paquets.
  produit_id         uuid references public.produits (id),
  conditionnement_id uuid unique references public.conditionnements (id),
  notes              text not null default '',
  actif              boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint articles_produit_fini check (
    (famille = 'produit_fini') = (produit_id is not null and conditionnement_id is not null)
    and (famille <> 'produit_fini' or unite = 'paquet')
  ),
  constraint articles_lot_kg check (not suivi_par_lot or unite = 'kg')
);
comment on table public.articles is 'Articles stockés. Unité de stock fixée à la création (MP en kg, produits finis en paquets).';
create trigger articles_updated_at before update on public.articles
  for each row execute function public.maj_updated_at();

-- L'unité, la famille et le produit d'un article ne changent plus une fois créé (cohérence des mouvements).
create or replace function public.articles_unite_figee()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.unite <> old.unite or new.famille <> old.famille or new.produit_id is distinct from old.produit_id
     or new.conditionnement_id is distinct from old.conditionnement_id or new.suivi_par_lot <> old.suivi_par_lot then
    raise exception 'L''unité, la famille et le suivi par lot d''un article ne peuvent pas être modifiés : créez un nouvel article.' using errcode = '22023';
  end if;
  return new;
end $$;
create trigger articles_unite_figee before update on public.articles
  for each row execute function public.articles_unite_figee();

-- Chaque conditionnement crée automatiquement son article produit fini (ex. « Petit 100 – Colis de 50 »).
create or replace function public.creer_article_produit_fini()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_produit public.produits%rowtype;
begin
  select * into v_produit from public.produits where id = new.produit_id;
  insert into public.articles (code, libelle, famille, unite, produit_id, conditionnement_id)
  values (
    left(v_produit.code || '-C' || new.paquets_par_colis, 30),
    v_produit.libelle || ' – ' || new.libelle,
    'produit_fini', 'paquet', new.produit_id, new.id
  );
  return new;
end $$;
create trigger conditionnement_cree after insert on public.conditionnements
  for each row execute function public.creer_article_produit_fini();

-- -----------------------------------------------------------------------------
-- Lots (bobines jumbo)
-- -----------------------------------------------------------------------------
create type public.statut_lot as enum ('disponible', 'bloque', 'epuise');

create table public.lots (
  id               uuid primary key default gen_random_uuid(),
  article_id       uuid not null references public.articles (id),
  numero_lot       text not null check (length(trim(numero_lot)) > 0),
  fournisseur_id   uuid references public.fournisseurs (id),
  date_reception   date not null default public.aujourdhui_conakry(),
  poids_net_kg     numeric(10, 2) not null check (poids_net_kg > 0),
  grammage_g_m2    numeric(5, 2) check (grammage_g_m2 > 0),
  largeur_mm       numeric(7, 1) check (largeur_mm > 0),
  diametre_mm      numeric(7, 1) check (diametre_mm > 0),
  plis             smallint check (plis between 1 and 6),
  cout_kg_gnf      numeric(14, 2) not null default 0 check (cout_kg_gnf >= 0),
  statut           public.statut_lot not null default 'disponible',
  notes            text not null default '',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (article_id, numero_lot)
);
comment on table public.lots is 'Bobines jumbo : une ligne par bobine (n° de lot). Le poids restant est dans stocks_lots.';
create trigger lots_updated_at before update on public.lots
  for each row execute function public.maj_updated_at();

-- -----------------------------------------------------------------------------
-- Mouvements de stock (journal en ajout seul) et stock en temps réel
-- -----------------------------------------------------------------------------
create table public.mouvements_stock (
  id                uuid primary key default gen_random_uuid(),
  date_operation    date not null default public.aujourdhui_conakry(),
  type              public.type_mouvement not null,
  article_id        uuid not null references public.articles (id),
  lot_id            uuid references public.lots (id),
  -- Quantité SIGNÉE dans l'unité de l'article (+ entrée, − sortie).
  quantite          numeric(14, 3) not null check (quantite <> 0),
  unite             public.unite_stock not null,
  -- Coût unitaire en GNF : saisi pour une entrée, = CMP pour une sortie (renseigné automatiquement).
  cout_unitaire_gnf numeric(14, 2),
  valeur_gnf        numeric(16, 2),
  -- Stock de l'article après le mouvement (lecture facile de l'historique).
  stock_apres       numeric(14, 3),
  motif             text not null default '',
  document_type     text,
  document_id       uuid,
  auteur_id         uuid references public.profils (id) default auth.uid(),
  created_at        timestamptz not null default now(),
  constraint mouvements_signe check (
    case
      when type in ('reception', 'production', 'retour') then quantite > 0
      when type in ('consommation', 'sortie', 'vente', 'dotation', 'rebut') then quantite < 0
      else true
    end
  ),
  constraint mouvements_motif_correction check (type not in ('ajustement', 'sortie', 'rebut') or length(trim(motif)) > 0)
);
create index mouvements_article_date_idx on public.mouvements_stock (article_id, date_operation desc, created_at desc);
create index mouvements_lot_idx on public.mouvements_stock (lot_id) where lot_id is not null;
create index mouvements_date_idx on public.mouvements_stock (date_operation desc);
comment on table public.mouvements_stock is 'Journal des entrées/sorties. Jamais modifié ni supprimé : une erreur se corrige par un mouvement inverse.';

create table public.stocks_articles (
  article_id    uuid primary key references public.articles (id),
  quantite      numeric(14, 3) not null default 0,
  valeur_gnf    numeric(16, 2) not null default 0,
  cmp_gnf       numeric(14, 2) not null default 0,
  derniere_entree date,
  derniere_sortie date,
  updated_at    timestamptz not null default now()
);
comment on table public.stocks_articles is 'Stock en temps réel par article, tenu à jour par les mouvements. Valorisation au coût moyen pondéré.';

create table public.stocks_lots (
  lot_id     uuid primary key references public.lots (id),
  quantite   numeric(14, 3) not null default 0,
  updated_at timestamptz not null default now()
);

-- Applique un mouvement au stock (avant insertion) :
-- verrouille la ligne de stock, refuse un stock négatif, calcule coût, valeur et nouveau CMP.
create or replace function public.appliquer_mouvement()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_article public.articles%rowtype;
  v_lot     public.lots%rowtype;
  v_stock   public.stocks_articles%rowtype;
  v_lot_qte numeric;
  v_cout_lot numeric;
  v_nouvelle_qte numeric;
begin
  select * into v_article from public.articles where id = new.article_id;
  if not v_article.actif and new.quantite > 0 then
    raise exception 'Article archivé : aucune entrée possible.' using errcode = '22023';
  end if;
  new.unite := v_article.unite; -- l'unité du mouvement est TOUJOURS celle de l'article

  -- Lot obligatoire pour les articles suivis par lot, interdit sinon.
  if v_article.suivi_par_lot and new.lot_id is null then
    raise exception 'Article « % » suivi par lot : précisez la bobine (n° de lot).', v_article.libelle using errcode = '22023';
  end if;
  if not v_article.suivi_par_lot and new.lot_id is not null then
    raise exception 'Cet article n''est pas suivi par lot.' using errcode = '22023';
  end if;

  insert into public.stocks_articles (article_id) values (new.article_id) on conflict do nothing;
  select * into v_stock from public.stocks_articles where article_id = new.article_id for update;
  v_nouvelle_qte := v_stock.quantite + new.quantite;
  if v_nouvelle_qte < 0 then
    raise exception 'Stock insuffisant pour « % » : disponible %, demandé %.',
      v_article.libelle, public.nombre_fr(v_stock.quantite), public.nombre_fr(abs(new.quantite)) using errcode = '22023';
  end if;

  -- Stock du lot
  if new.lot_id is not null then
    select * into v_lot from public.lots where id = new.lot_id;
    if v_lot.article_id <> new.article_id then
      raise exception 'Le lot ne correspond pas à l''article.' using errcode = '22023';
    end if;
    if v_lot.statut = 'bloque' and new.quantite < 0 and new.type <> 'inventaire' then
      raise exception 'La bobine % est bloquée (qualité) : sortie impossible.', v_lot.numero_lot using errcode = '22023';
    end if;
    insert into public.stocks_lots (lot_id) values (new.lot_id) on conflict do nothing;
    select quantite into v_lot_qte from public.stocks_lots where lot_id = new.lot_id for update;
    if v_lot_qte + new.quantite < 0 then
      raise exception 'Poids insuffisant sur la bobine % : reste % kg.', v_lot.numero_lot, public.nombre_fr(v_lot_qte) using errcode = '22023';
    end if;
    update public.stocks_lots set quantite = v_lot_qte + new.quantite, updated_at = now() where lot_id = new.lot_id;
    v_cout_lot := nullif(v_lot.cout_kg_gnf, 0);
    update public.lots
       set statut = case when v_lot_qte + new.quantite = 0 then 'epuise'::public.statut_lot
                         when statut = 'epuise' then 'disponible'::public.statut_lot else statut end
     where id = new.lot_id;
  end if;

  -- Valorisation
  if new.quantite > 0 then
    -- Entrée : coût saisi, sinon coût du lot, sinon CMP actuel.
    new.cout_unitaire_gnf := coalesce(new.cout_unitaire_gnf, v_cout_lot, v_stock.cmp_gnf);
    new.valeur_gnf := round(new.quantite * new.cout_unitaire_gnf, 2);
    update public.stocks_articles
       set quantite = v_nouvelle_qte,
           valeur_gnf = v_stock.valeur_gnf + new.valeur_gnf,
           cmp_gnf = case when v_nouvelle_qte > 0 then round((v_stock.valeur_gnf + new.valeur_gnf) / v_nouvelle_qte, 2) else v_stock.cmp_gnf end,
           derniere_entree = greatest(coalesce(derniere_entree, new.date_operation), new.date_operation),
           updated_at = now()
     where article_id = new.article_id;
  else
    -- Sortie : valorisée au CMP. Si le stock tombe à zéro, la valeur est remise à zéro (pas de reliquat d'arrondi).
    new.cout_unitaire_gnf := v_stock.cmp_gnf;
    new.valeur_gnf := case when v_nouvelle_qte = 0 then -v_stock.valeur_gnf else round(new.quantite * v_stock.cmp_gnf, 2) end;
    update public.stocks_articles
       set quantite = v_nouvelle_qte,
           valeur_gnf = v_stock.valeur_gnf + new.valeur_gnf,
           derniere_sortie = greatest(coalesce(derniere_sortie, new.date_operation), new.date_operation),
           updated_at = now()
     where article_id = new.article_id;
  end if;
  new.stock_apres := v_nouvelle_qte;
  return new;
end $$;

create trigger mouvement_applique before insert on public.mouvements_stock
  for each row execute function public.appliquer_mouvement();

-- Le journal des mouvements est inaltérable.
create or replace function public.mouvement_immuable()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'Un mouvement de stock ne peut être ni modifié ni supprimé : enregistrez un mouvement correctif.' using errcode = '42501';
end $$;
create trigger mouvement_immuable before update or delete on public.mouvements_stock
  for each row execute function public.mouvement_immuable();

-- -----------------------------------------------------------------------------
-- Réception d'une bobine jumbo : crée le lot ET le mouvement d'entrée (atomique).
-- -----------------------------------------------------------------------------
create or replace function public.receptionner_bobine(
  p_article uuid, p_numero_lot text, p_poids_kg numeric, p_cout_kg_gnf numeric,
  p_fournisseur uuid default null, p_date date default public.aujourdhui_conakry(),
  p_grammage numeric default null, p_largeur_mm numeric default null, p_diametre_mm numeric default null,
  p_plis smallint default null, p_notes text default ''
) returns uuid language plpgsql set search_path = '' as $$
declare
  v_lot uuid;
begin
  insert into public.lots (article_id, numero_lot, fournisseur_id, date_reception, poids_net_kg, grammage_g_m2,
                           largeur_mm, diametre_mm, plis, cout_kg_gnf, notes)
  values (p_article, trim(p_numero_lot), p_fournisseur, p_date, p_poids_kg, p_grammage, p_largeur_mm, p_diametre_mm,
          p_plis, coalesce(p_cout_kg_gnf, 0), coalesce(p_notes, ''))
  returning id into v_lot;
  insert into public.mouvements_stock (date_operation, type, article_id, lot_id, quantite, unite, cout_unitaire_gnf, motif, document_type, document_id)
  values (p_date, 'reception', p_article, v_lot, p_poids_kg, 'kg', p_cout_kg_gnf, 'Réception bobine ' || trim(p_numero_lot), 'lot', v_lot);
  return v_lot;
end $$;

-- -----------------------------------------------------------------------------
-- Inventaires
-- -----------------------------------------------------------------------------
create type public.statut_inventaire as enum ('en_cours', 'valide', 'annule');

create table public.inventaires (
  id            uuid primary key default gen_random_uuid(),
  date_inventaire date not null default public.aujourdhui_conakry(),
  famille       public.famille_article,
  libelle       text not null,
  statut        public.statut_inventaire not null default 'en_cours',
  cree_par      uuid references public.profils (id) default auth.uid(),
  valide_par    uuid references public.profils (id),
  valide_le     timestamptz,
  created_at    timestamptz not null default now()
);

create table public.inventaire_lignes (
  id                 uuid primary key default gen_random_uuid(),
  inventaire_id      uuid not null references public.inventaires (id) on delete cascade,
  article_id         uuid not null references public.articles (id),
  lot_id             uuid references public.lots (id),
  quantite_theorique numeric(14, 3) not null,
  quantite_comptee   numeric(14, 3) check (quantite_comptee >= 0),
  ecart              numeric(14, 3) generated always as (quantite_comptee - quantite_theorique) stored,
  unique (inventaire_id, article_id, lot_id)
);

-- Ouvre un inventaire : photographie du stock théorique (par lot pour les bobines).
create or replace function public.ouvrir_inventaire(p_libelle text, p_famille public.famille_article default null)
returns uuid language plpgsql set search_path = '' as $$
declare
  v_id uuid;
begin
  insert into public.inventaires (libelle, famille) values (p_libelle, p_famille) returning id into v_id;
  -- Articles sans lot
  insert into public.inventaire_lignes (inventaire_id, article_id, quantite_theorique)
  select v_id, a.id, coalesce(s.quantite, 0)
  from public.articles a left join public.stocks_articles s on s.article_id = a.id
  where a.actif and not a.suivi_par_lot and (p_famille is null or a.famille = p_famille);
  -- Bobines encore en stock
  insert into public.inventaire_lignes (inventaire_id, article_id, lot_id, quantite_theorique)
  select v_id, l.article_id, l.id, sl.quantite
  from public.lots l join public.stocks_lots sl on sl.lot_id = l.id join public.articles a on a.id = l.article_id
  where sl.quantite > 0 and (p_famille is null or a.famille = p_famille);
  return v_id;
end $$;

-- Valide un inventaire : chaque écart compté génère un mouvement « inventaire ».
create or replace function public.valider_inventaire(p_inventaire uuid)
returns integer language plpgsql set search_path = '' as $$
declare
  v_inv public.inventaires%rowtype;
  v_ligne record;
  v_nb integer := 0;
begin
  select * into v_inv from public.inventaires where id = p_inventaire for update;
  if v_inv.id is null then raise exception 'Inventaire introuvable.' using errcode = '22023'; end if;
  if v_inv.statut <> 'en_cours' then raise exception 'Cet inventaire est déjà clôturé.' using errcode = '22023'; end if;
  if exists (select 1 from public.inventaire_lignes where inventaire_id = p_inventaire and quantite_comptee is null) then
    raise exception 'Toutes les lignes doivent être comptées avant validation.' using errcode = '22023';
  end if;
  for v_ligne in select * from public.inventaire_lignes where inventaire_id = p_inventaire and ecart <> 0 loop
    insert into public.mouvements_stock (date_operation, type, article_id, lot_id, quantite, unite, motif, document_type, document_id)
    select v_inv.date_inventaire, 'inventaire', v_ligne.article_id, v_ligne.lot_id, v_ligne.ecart, a.unite,
           'Inventaire : ' || v_inv.libelle, 'inventaire', p_inventaire
    from public.articles a where a.id = v_ligne.article_id;
    v_nb := v_nb + 1;
  end loop;
  update public.inventaires set statut = 'valide', valide_par = auth.uid(), valide_le = now() where id = p_inventaire;
  return v_nb;
end $$;

-- -----------------------------------------------------------------------------
-- Vues : état du stock, couverture, alertes
-- -----------------------------------------------------------------------------

-- Consommation moyenne journalière sur la période paramétrée (sorties hors inventaire/ajustement).
create view public.etat_stock with (security_invoker = true) as
with periode as (
  select greatest(1, coalesce((select (valeur #>> '{}')::int from public.parametres where cle = 'stock_periode_consommation_jours'), 30)) as jours
),
conso as (
  select m.article_id, -sum(m.quantite) as sorties
  from public.mouvements_stock m, periode p
  where m.type in ('consommation', 'vente', 'sortie', 'dotation', 'rebut')
    and m.date_operation > public.aujourdhui_conakry() - p.jours
  group by m.article_id
)
select
  a.id as article_id, a.code, a.libelle, a.famille, a.categorie_id, a.unite, a.suivi_par_lot, a.seuil_alerte,
  a.produit_id, a.conditionnement_id, c.paquets_par_colis, a.actif,
  coalesce(s.quantite, 0) as quantite,
  coalesce(s.valeur_gnf, 0) as valeur_gnf,
  coalesce(s.cmp_gnf, 0) as cmp_gnf,
  s.derniere_entree, s.derniere_sortie,
  round(coalesce(co.sorties, 0) / p.jours, 3) as conso_jour,
  case when coalesce(co.sorties, 0) > 0 then round(coalesce(s.quantite, 0) / (co.sorties / p.jours), 1) end as jours_couverture,
  (select count(*) from public.lots l join public.stocks_lots sl on sl.lot_id = l.id where l.article_id = a.id and sl.quantite > 0) as nb_lots_en_stock
from public.articles a
cross join periode p
left join public.stocks_articles s on s.article_id = a.id
left join public.conditionnements c on c.id = a.conditionnement_id
left join conso co on co.article_id = a.id;

create view public.alertes_stock with (security_invoker = true) as
select e.*,
  case
    when e.quantite <= 0 then 'rupture'
    when e.quantite <= e.seuil_alerte then 'sous_seuil'
    else 'couverture_faible'
  end as niveau_alerte
from public.etat_stock e
where e.actif and (
  (e.seuil_alerte > 0 and e.quantite <= e.seuil_alerte)
  or (e.jours_couverture is not null and e.jours_couverture <
      coalesce((select (valeur #>> '{}')::numeric from public.parametres where cle = 'stock_jours_couverture_alerte'), 15))
);

-- Bobines avec poids restant.
create view public.etat_lots with (security_invoker = true) as
select l.*, a.libelle as article_libelle, a.code as article_code, f.nom as fournisseur_nom,
       coalesce(sl.quantite, 0) as poids_restant_kg
from public.lots l
join public.articles a on a.id = l.article_id
left join public.fournisseurs f on f.id = l.fournisseur_id
left join public.stocks_lots sl on sl.lot_id = l.id;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.categories_articles enable row level security;
alter table public.fournisseurs enable row level security;
alter table public.articles enable row level security;
alter table public.lots enable row level security;
alter table public.mouvements_stock enable row level security;
alter table public.stocks_articles enable row level security;
alter table public.stocks_lots enable row level security;
alter table public.inventaires enable row level security;
alter table public.inventaire_lignes enable row level security;

-- Référentiels : lecture par tous les actifs (le commercial voit les produits disponibles) ;
-- écriture magasin, achats, admin (et direction).
create policy categories_lecture on public.categories_articles for select to authenticated using (public.est_actif());
create policy categories_ecriture on public.categories_articles for all to authenticated
  using (public.est_admin() or public.a_un_role('magasin', 'achats'))
  with check (public.est_admin() or public.a_un_role('magasin', 'achats'));

create policy fournisseurs_lecture on public.fournisseurs for select to authenticated
  using (public.est_admin() or public.a_un_role('magasin', 'achats', 'finance', 'qualite', 'production'));
create policy fournisseurs_ecriture on public.fournisseurs for all to authenticated
  using (public.est_admin() or public.a_un_role('magasin', 'achats'))
  with check (public.est_admin() or public.a_un_role('magasin', 'achats'));

create policy articles_lecture on public.articles for select to authenticated using (public.est_actif());
create policy articles_ecriture on public.articles for insert to authenticated
  with check (public.est_admin() or public.a_un_role('magasin', 'achats'));
create policy articles_modif on public.articles for update to authenticated
  using (public.est_admin() or public.a_un_role('magasin', 'achats'))
  with check (public.est_admin() or public.a_un_role('magasin', 'achats'));

-- Stocks et lots : lecture par les métiers concernés ; le commercial voit le stock (disponibilité).
create policy lots_lecture on public.lots for select to authenticated
  using (public.a_un_role('magasin', 'production', 'achats', 'qualite', 'finance'));
create policy lots_ecriture on public.lots for insert to authenticated with check (public.a_un_role('magasin'));
-- Statut (bloquer/débloquer) : magasin et qualité.
create policy lots_modif on public.lots for update to authenticated
  using (public.a_un_role('magasin', 'qualite')) with check (public.a_un_role('magasin', 'qualite'));

create policy stocks_articles_lecture on public.stocks_articles for select to authenticated using (public.est_actif());
create policy stocks_lots_lecture on public.stocks_lots for select to authenticated
  using (public.a_un_role('magasin', 'production', 'achats', 'qualite', 'finance'));

create policy mouvements_lecture on public.mouvements_stock for select to authenticated
  using (public.a_un_role('magasin', 'production', 'achats', 'qualite', 'finance'));
-- Le magasin enregistre tous les types ; la production uniquement ses consommations, productions et rebuts.
create policy mouvements_ajout on public.mouvements_stock for insert to authenticated
  with check (
    public.a_un_role('magasin')
    or (public.a_role('production') and type in ('consommation', 'production', 'rebut'))
  );
revoke update, delete, truncate on public.mouvements_stock from anon, authenticated;
revoke insert, update, delete, truncate on public.stocks_articles, public.stocks_lots from anon, authenticated;

create policy inventaires_lecture on public.inventaires for select to authenticated using (public.a_un_role('magasin', 'finance'));
create policy inventaires_ecriture on public.inventaires for insert to authenticated with check (public.a_un_role('magasin'));
create policy inventaires_modif on public.inventaires for update to authenticated
  using (public.a_un_role('magasin')) with check (public.a_un_role('magasin'));
create policy inventaire_lignes_lecture on public.inventaire_lignes for select to authenticated using (public.a_un_role('magasin', 'finance'));
create policy inventaire_lignes_ajout on public.inventaire_lignes for insert to authenticated with check (public.a_un_role('magasin'));
-- Saisie des comptages uniquement tant que l'inventaire est en cours.
create policy inventaire_lignes_comptage on public.inventaire_lignes for update to authenticated
  using (public.a_un_role('magasin') and exists (select 1 from public.inventaires i where i.id = inventaire_id and i.statut = 'en_cours'))
  with check (public.a_un_role('magasin'));

-- -----------------------------------------------------------------------------
-- Audit (les mouvements sont eux-mêmes un journal inaltérable, avec auteur et date)
-- -----------------------------------------------------------------------------
select public.activer_audit('public.categories_articles');
select public.activer_audit('public.fournisseurs');
select public.activer_audit('public.articles');
select public.activer_audit('public.lots');
select public.activer_audit('public.inventaires');
select public.activer_audit('public.inventaire_lignes');
