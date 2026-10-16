-- =============================================================================
-- Papel ERP — Migration 4 : production
-- Listes modifiables (postes, équipes, opérateurs, lignes, cadences, causes d'arrêt, campagnes),
-- ordres de fabrication, fiches de production par poste, validation → mouvements de stock
-- (consommation des bobines, entrée des produits finis au coût de revient matière).
-- Les indicateurs (rendement, perte, TRS) sont calculés dans src/lib/metier/production.ts.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Listes de référence (modifiables dans Production → Listes de référence)
-- -----------------------------------------------------------------------------
create table public.postes (
  id          uuid primary key default gen_random_uuid(),
  libelle     text not null unique check (length(trim(libelle)) > 0),
  heure_debut time not null,
  heure_fin   time not null,
  ordre       smallint not null default 0,
  actif       boolean not null default true,
  created_at  timestamptz not null default now(),
  check (heure_debut <> heure_fin)
);
comment on table public.postes is 'Postes de travail (matin, après-midi, nuit…). Un poste peut passer minuit.';

create table public.equipes (
  id         uuid primary key default gen_random_uuid(),
  libelle    text not null unique check (length(trim(libelle)) > 0),
  actif      boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.operateurs (
  id         uuid primary key default gen_random_uuid(),
  nom        text not null check (length(trim(nom)) > 0),
  prenom     text not null default '',
  matricule  text not null default '',
  equipe_id  uuid references public.equipes (id),
  actif      boolean not null default true,
  created_at timestamptz not null default now()
);
comment on table public.operateurs is 'Personnel de production (sans compte informatique obligatoire).';

create table public.lignes_production (
  id         uuid primary key default gen_random_uuid(),
  libelle    text not null unique check (length(trim(libelle)) > 0),
  actif      boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.cadences_nominales (
  id              uuid primary key default gen_random_uuid(),
  ligne_id        uuid not null references public.lignes_production (id),
  produit_id      uuid not null references public.produits (id),
  paquets_minute  numeric(8, 2) not null check (paquets_minute > 0),
  created_at      timestamptz not null default now(),
  unique (ligne_id, produit_id)
);
comment on table public.cadences_nominales is 'Cadence nominale (paquets/minute) d''une ligne pour un produit : nécessaire au calcul du TRS.';

create table public.causes_arret (
  id         uuid primary key default gen_random_uuid(),
  libelle    text not null unique check (length(trim(libelle)) > 0),
  -- Un arrêt planifié (pause, nettoyage prévu) réduit le temps d'ouverture ; un arrêt non planifié réduit la disponibilité.
  type_arret text not null default 'non_planifie' check (type_arret in ('non_planifie', 'planifie')),
  actif      boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.campagnes (
  id         uuid primary key default gen_random_uuid(),
  libelle    text not null unique check (length(trim(libelle)) > 0),
  date_debut date not null,
  date_fin   date not null,
  notes      text not null default '',
  actif      boolean not null default true,
  created_at timestamptz not null default now(),
  check (date_fin >= date_debut)
);
comment on table public.campagnes is 'Campagnes de production (période et objectif), regroupant des ordres de fabrication.';

-- -----------------------------------------------------------------------------
-- Ordres de fabrication
-- -----------------------------------------------------------------------------
create type public.statut_of as enum ('planifie', 'en_cours', 'termine', 'annule');
create sequence public.ordres_fabrication_seq;

create table public.ordres_fabrication (
  id                 uuid primary key default gen_random_uuid(),
  numero             text not null unique default ('OF-' || to_char(public.aujourdhui_conakry(), 'YYYY') || '-' || lpad(nextval('public.ordres_fabrication_seq')::text, 4, '0')),
  campagne_id        uuid references public.campagnes (id),
  conditionnement_id uuid not null references public.conditionnements (id),
  ligne_id           uuid references public.lignes_production (id),
  quantite_colis     integer not null check (quantite_colis > 0),
  date_debut_prevue  date not null,
  date_fin_prevue    date not null,
  statut             public.statut_of not null default 'planifie',
  notes              text not null default '',
  created_by         uuid references public.profils (id) default auth.uid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (date_fin_prevue >= date_debut_prevue)
);
create trigger ordres_fabrication_updated_at before update on public.ordres_fabrication
  for each row execute function public.maj_updated_at();

-- -----------------------------------------------------------------------------
-- Fiches de production (une par jour × poste × ligne)
-- -----------------------------------------------------------------------------
create type public.statut_fiche as enum ('brouillon', 'validee');

create table public.fiches_production (
  id               uuid primary key default gen_random_uuid(),
  date_production  date not null default public.aujourdhui_conakry(),
  poste_id         uuid not null references public.postes (id),
  ligne_id         uuid not null references public.lignes_production (id),
  equipe_id        uuid references public.equipes (id),
  of_id            uuid references public.ordres_fabrication (id),
  -- Durée du poste figée à la création (minutes), pour que l'historique ne change pas si le poste est modifié.
  duree_poste_min  integer not null default 0 check (duree_poste_min >= 0),
  statut           public.statut_fiche not null default 'brouillon',
  notes            text not null default '',
  cout_matiere_gnf numeric(16, 2),
  chef_id          uuid references public.profils (id) default auth.uid(),
  validee_par      uuid references public.profils (id),
  validee_le       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (date_production, poste_id, ligne_id)
);
create index fiches_date_idx on public.fiches_production (date_production desc);
create trigger fiches_production_updated_at before update on public.fiches_production
  for each row execute function public.maj_updated_at();

create table public.fiche_consommations (
  id         uuid primary key default gen_random_uuid(),
  fiche_id   uuid not null references public.fiches_production (id) on delete cascade,
  article_id uuid not null references public.articles (id),
  lot_id     uuid references public.lots (id),
  -- Quantité consommée dans l'unité de l'article (kg pour les bobines).
  quantite   numeric(14, 3) not null check (quantite > 0),
  created_at timestamptz not null default now()
);

create table public.fiche_productions (
  id                 uuid primary key default gen_random_uuid(),
  fiche_id           uuid not null references public.fiches_production (id) on delete cascade,
  conditionnement_id uuid not null references public.conditionnements (id),
  paquets            integer not null check (paquets >= 0),
  rebuts_kg          numeric(10, 2) not null default 0 check (rebuts_kg >= 0),
  cout_unitaire_gnf  numeric(14, 2),
  created_at         timestamptz not null default now(),
  unique (fiche_id, conditionnement_id)
);

create table public.fiche_arrets (
  id          uuid primary key default gen_random_uuid(),
  fiche_id    uuid not null references public.fiches_production (id) on delete cascade,
  cause_id    uuid not null references public.causes_arret (id),
  duree_min   integer not null check (duree_min > 0 and duree_min <= 1440),
  heure_debut time,
  commentaire text not null default '',
  created_at  timestamptz not null default now()
);

create table public.fiche_operateurs (
  fiche_id    uuid not null references public.fiches_production (id) on delete cascade,
  operateur_id uuid not null references public.operateurs (id),
  primary key (fiche_id, operateur_id)
);

-- Durée du poste figée à la création de la fiche.
create or replace function public.fiche_duree_poste()
returns trigger language plpgsql set search_path = '' as $$
declare
  p public.postes%rowtype;
  minutes integer;
begin
  select * into p from public.postes where id = new.poste_id;
  minutes := (extract(epoch from (p.heure_fin - p.heure_debut)) / 60)::integer;
  if minutes <= 0 then minutes := minutes + 1440; end if;
  new.duree_poste_min := minutes;
  return new;
end $$;
create trigger fiche_duree_poste before insert on public.fiches_production
  for each row execute function public.fiche_duree_poste();

-- Une fiche validée est figée (elle a généré des mouvements de stock).
create or replace function public.fiche_figee()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.statut = 'validee' then
    raise exception 'Fiche validée : elle ne peut plus être modifiée (les stocks ont été mis à jour).' using errcode = '22023';
  end if;
  return coalesce(new, old);
end $$;
create trigger fiche_figee before update or delete on public.fiches_production
  for each row execute function public.fiche_figee();

-- Lignes d'une fiche : modifiables uniquement si la fiche est en brouillon.
create or replace function public.ligne_fiche_modifiable()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_statut public.statut_fiche;
begin
  select statut into v_statut from public.fiches_production where id = coalesce(new.fiche_id, old.fiche_id);
  if v_statut = 'validee' then
    raise exception 'Fiche validée : elle ne peut plus être modifiée.' using errcode = '22023';
  end if;
  return coalesce(new, old);
end $$;
create trigger fiche_consommations_modifiable before insert or update or delete on public.fiche_consommations
  for each row execute function public.ligne_fiche_modifiable();
create trigger fiche_productions_modifiable before insert or update or delete on public.fiche_productions
  for each row execute function public.ligne_fiche_modifiable();
create trigger fiche_arrets_modifiable before insert or update or delete on public.fiche_arrets
  for each row execute function public.ligne_fiche_modifiable();
create trigger fiche_operateurs_modifiable before insert or update or delete on public.fiche_operateurs
  for each row execute function public.ligne_fiche_modifiable();

-- -----------------------------------------------------------------------------
-- Validation d'une fiche : mouvements de stock + coût de revient matière (atomique).
-- Exécutée avec les droits de l'appelant (la RLS des mouvements s'applique).
-- -----------------------------------------------------------------------------
create or replace function public.valider_fiche_production(p_fiche uuid)
returns numeric language plpgsql set search_path = '' as $$
declare
  v_fiche   public.fiches_production%rowtype;
  v_conso   record;
  v_prod    record;
  v_valeur  numeric;
  v_cout    numeric := 0;
  v_poids_total numeric;
  v_cout_unitaire numeric;
  v_article uuid;
begin
  select * into v_fiche from public.fiches_production where id = p_fiche for update;
  if v_fiche.id is null then raise exception 'Fiche introuvable.' using errcode = '22023'; end if;
  if v_fiche.statut = 'validee' then raise exception 'Cette fiche est déjà validée.' using errcode = '22023'; end if;
  if not exists (select 1 from public.fiche_productions where fiche_id = p_fiche and paquets > 0)
     and not exists (select 1 from public.fiche_consommations where fiche_id = p_fiche)
     and not exists (select 1 from public.fiche_arrets where fiche_id = p_fiche) then
    raise exception 'La fiche est vide : saisissez la production, les consommations ou les arrêts.' using errcode = '22023';
  end if;
  if exists (select 1 from public.fiche_productions where fiche_id = p_fiche and paquets > 0)
     and not exists (select 1 from public.fiche_consommations c join public.articles a on a.id = c.article_id
                     where c.fiche_id = p_fiche and a.famille = 'matiere_premiere') then
    raise exception 'Production saisie sans consommation de bobine : indiquez les bobines utilisées.' using errcode = '22023';
  end if;

  -- 1. Consommations → sorties de stock, valorisées au coût moyen pondéré.
  for v_conso in select * from public.fiche_consommations where fiche_id = p_fiche order by created_at loop
    insert into public.mouvements_stock (date_operation, type, article_id, lot_id, quantite, unite, motif, document_type, document_id)
    select v_fiche.date_production, 'consommation', v_conso.article_id, v_conso.lot_id, -v_conso.quantite, a.unite,
           'Fiche de production', 'fiche_production', p_fiche
    from public.articles a where a.id = v_conso.article_id
    returning valeur_gnf into v_valeur;
    v_cout := v_cout - coalesce(v_valeur, 0);
  end loop;

  -- 2. Production → entrées de produits finis, au coût matière réparti au prorata du poids de papier.
  select coalesce(sum(fp.paquets * p.poids_paquet_g), 0) into v_poids_total
  from public.fiche_productions fp
  join public.conditionnements c on c.id = fp.conditionnement_id
  join public.produits p on p.id = c.produit_id
  where fp.fiche_id = p_fiche and fp.paquets > 0;

  for v_prod in
    select fp.id, fp.conditionnement_id, fp.paquets, p.poids_paquet_g
    from public.fiche_productions fp
    join public.conditionnements c on c.id = fp.conditionnement_id
    join public.produits p on p.id = c.produit_id
    where fp.fiche_id = p_fiche and fp.paquets > 0
  loop
    v_cout_unitaire := case when v_poids_total > 0 then round(v_cout * v_prod.poids_paquet_g / v_poids_total, 2) else 0 end;
    select id into v_article from public.articles where conditionnement_id = v_prod.conditionnement_id;
    insert into public.mouvements_stock (date_operation, type, article_id, quantite, unite, cout_unitaire_gnf, motif, document_type, document_id)
    values (v_fiche.date_production, 'production', v_article, v_prod.paquets, 'paquet', v_cout_unitaire,
            'Fiche de production', 'fiche_production', p_fiche);
    update public.fiche_productions set cout_unitaire_gnf = v_cout_unitaire where id = v_prod.id;
  end loop;

  -- 3. Fiche validée (figée : plus aucune modification possible ensuite) ; l'OF passe « en cours ».
  update public.fiches_production
     set statut = 'validee', cout_matiere_gnf = round(v_cout, 2), validee_par = auth.uid(), validee_le = now()
   where id = p_fiche;
  if v_fiche.of_id is not null then
    update public.ordres_fabrication set statut = 'en_cours' where id = v_fiche.of_id and statut = 'planifie';
  end if;

  return round(v_cout, 2);
end $$;

-- -----------------------------------------------------------------------------
-- Vues
-- -----------------------------------------------------------------------------
create view public.fiches_resume with (security_invoker = true) as
select
  f.id, f.date_production, f.poste_id, po.libelle as poste_libelle, po.ordre as poste_ordre,
  f.ligne_id, l.libelle as ligne_libelle, f.equipe_id, e.libelle as equipe_libelle, f.of_id, o.numero as of_numero,
  f.statut, f.duree_poste_min, f.cout_matiere_gnf, f.notes,
  coalesce((select sum(c.quantite) from public.fiche_consommations c join public.articles a on a.id = c.article_id
            where c.fiche_id = f.id and a.famille = 'matiere_premiere' and a.unite = 'kg'), 0) as papier_kg,
  coalesce((select sum(fp.paquets) from public.fiche_productions fp where fp.fiche_id = f.id), 0) as paquets,
  coalesce((select sum(fp.rebuts_kg) from public.fiche_productions fp where fp.fiche_id = f.id), 0) as rebuts_kg,
  coalesce((select sum(fa.duree_min) from public.fiche_arrets fa join public.causes_arret ca on ca.id = fa.cause_id
            where fa.fiche_id = f.id and ca.type_arret = 'non_planifie'), 0) as arrets_non_planifies_min,
  coalesce((select sum(fa.duree_min) from public.fiche_arrets fa join public.causes_arret ca on ca.id = fa.cause_id
            where fa.fiche_id = f.id and ca.type_arret = 'planifie'), 0) as arrets_planifies_min,
  coalesce((select max(fa.duree_min) from public.fiche_arrets fa where fa.fiche_id = f.id), 0) as arret_max_min,
  (select count(*) from public.fiche_operateurs fo where fo.fiche_id = f.id) as nb_operateurs
from public.fiches_production f
join public.postes po on po.id = f.poste_id
join public.lignes_production l on l.id = f.ligne_id
left join public.equipes e on e.id = f.equipe_id
left join public.ordres_fabrication o on o.id = f.of_id;

-- Avancement des OF : colis produits (fiches validées rattachées à l'OF, même conditionnement).
create view public.of_avancement with (security_invoker = true) as
select
  o.*, c.libelle as conditionnement_libelle, c.paquets_par_colis, p.id as produit_id, p.libelle as produit_libelle,
  ca.libelle as campagne_libelle, l.libelle as ligne_libelle,
  coalesce((select sum(fp.paquets) from public.fiche_productions fp join public.fiches_production f on f.id = fp.fiche_id
            where f.of_id = o.id and f.statut = 'validee' and fp.conditionnement_id = o.conditionnement_id), 0) as paquets_produits
from public.ordres_fabrication o
join public.conditionnements c on c.id = o.conditionnement_id
join public.produits p on p.id = c.produit_id
left join public.campagnes ca on ca.id = o.campagne_id
left join public.lignes_production l on l.id = o.ligne_id;

-- -----------------------------------------------------------------------------
-- RLS : lecture production, magasin, qualité, maintenance, finance (+ direction) ; écriture production.
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['postes', 'equipes', 'operateurs', 'lignes_production', 'cadences_nominales', 'causes_arret', 'campagnes',
                           'ordres_fabrication', 'fiches_production', 'fiche_consommations', 'fiche_productions', 'fiche_arrets', 'fiche_operateurs']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format($p$create policy %I on public.%I for select to authenticated
      using (public.a_un_role('production', 'magasin', 'qualite', 'maintenance', 'finance'))$p$, t || '_lecture', t);
    execute format($p$create policy %I on public.%I for insert to authenticated
      with check (public.a_un_role('production'))$p$, t || '_ajout', t);
    execute format($p$create policy %I on public.%I for update to authenticated
      using (public.a_un_role('production')) with check (public.a_un_role('production'))$p$, t || '_modif', t);
  end loop;
end $$;

-- Listes simples : l'administrateur peut aussi les gérer.
do $$
declare
  t text;
begin
  foreach t in array array['postes', 'equipes', 'operateurs', 'lignes_production', 'cadences_nominales', 'causes_arret', 'campagnes'] loop
    execute format($p$create policy %I on public.%I for all to authenticated
      using (public.est_admin()) with check (public.est_admin())$p$, t || '_admin', t);
  end loop;
end $$;

-- Suppression : uniquement les lignes d'une fiche en brouillon (le trigger contrôle le statut) et les cadences.
create policy fiche_consommations_suppr on public.fiche_consommations for delete to authenticated using (public.a_un_role('production'));
create policy fiche_productions_suppr on public.fiche_productions for delete to authenticated using (public.a_un_role('production'));
create policy fiche_arrets_suppr on public.fiche_arrets for delete to authenticated using (public.a_un_role('production'));
create policy fiche_operateurs_suppr on public.fiche_operateurs for delete to authenticated using (public.a_un_role('production'));
create policy fiches_production_suppr on public.fiches_production for delete to authenticated using (public.a_un_role('production'));
create policy cadences_suppr on public.cadences_nominales for delete to authenticated using (public.a_un_role('production'));

-- -----------------------------------------------------------------------------
-- Audit
-- -----------------------------------------------------------------------------
select public.activer_audit('public.postes');
select public.activer_audit('public.equipes');
select public.activer_audit('public.operateurs');
select public.activer_audit('public.lignes_production');
select public.activer_audit('public.cadences_nominales');
select public.activer_audit('public.causes_arret');
select public.activer_audit('public.campagnes');
select public.activer_audit('public.ordres_fabrication');
select public.activer_audit('public.fiches_production');
select public.activer_audit('public.fiche_consommations');
select public.activer_audit('public.fiche_productions');
select public.activer_audit('public.fiche_arrets');
select public.activer_audit('public.fiche_operateurs', 'fiche_id');
