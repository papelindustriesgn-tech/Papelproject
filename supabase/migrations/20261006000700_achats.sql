-- =============================================================================
-- Papel ERP — Migration 7 (phase 2) : achats et conteneurs
-- Demandes d'achat, bons de commande (GNF ou USD, taux du jour), conteneurs suivis de la commande
-- à la livraison usine (dates prévues et réelles), frais d'approche, documents joints,
-- coût de revient complet par kg appliqué aux bobines reçues.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Listes modifiables : types de frais d'approche, types de documents
-- -----------------------------------------------------------------------------
create table public.types_frais (
  id         uuid primary key default gen_random_uuid(),
  libelle    text not null unique check (length(trim(libelle)) > 0),
  ordre      smallint not null default 0,
  actif      boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.types_documents (
  id         uuid primary key default gen_random_uuid(),
  libelle    text not null unique check (length(trim(libelle)) > 0),
  ordre      smallint not null default 0,
  actif      boolean not null default true,
  created_at timestamptz not null default now()
);

-- Fournisseurs : devise habituelle.
alter table public.fournisseurs add column devise text not null default 'USD' check (devise in ('GNF', 'USD'));

-- -----------------------------------------------------------------------------
-- Demandes d'achat (magasin, production, achats…)
-- -----------------------------------------------------------------------------
create type public.statut_demande as enum ('soumise', 'approuvee', 'refusee', 'commandee');

create table public.demandes_achat (
  id            uuid primary key default gen_random_uuid(),
  numero        text unique,
  article_id    uuid not null references public.articles (id),
  quantite      numeric(14, 3) not null check (quantite > 0),
  date_besoin   date,
  motif         text not null default '',
  statut        public.statut_demande not null default 'soumise',
  demandeur_id  uuid references public.profils (id) default auth.uid(),
  traite_par    uuid references public.profils (id),
  commentaire   text not null default '',
  bc_id         uuid,
  created_at    timestamptz not null default now()
);

create or replace function public.numeroter_demande()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.numero := public.prochain_numero('DA-' || to_char(public.aujourdhui_conakry(), 'YYYY') || '-');
  return new;
end $$;
create trigger demande_numero before insert on public.demandes_achat for each row execute function public.numeroter_demande();

-- -----------------------------------------------------------------------------
-- Bons de commande
-- -----------------------------------------------------------------------------
create type public.statut_bc as enum ('brouillon', 'envoye', 'recu', 'annule');

create table public.bons_commande (
  id                    uuid primary key default gen_random_uuid(),
  numero                text unique,
  fournisseur_id        uuid not null references public.fournisseurs (id),
  date_commande         date not null default public.aujourdhui_conakry(),
  devise                text not null default 'USD' check (devise in ('GNF', 'USD')),
  -- Taux GNF pour 1 unité de la devise, figé à la date de la commande.
  taux_change           numeric(12, 4) not null default 1 check (taux_change > 0),
  incoterm              text not null default '',
  date_livraison_prevue date,
  -- Estimation des frais d'approche (GNF) : sert à comparer le coût prévu au coût réel.
  frais_estimes_gnf     bigint not null default 0 check (frais_estimes_gnf >= 0),
  statut                public.statut_bc not null default 'brouillon',
  notes                 text not null default '',
  created_by            uuid references public.profils (id) default auth.uid(),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create trigger bons_commande_updated_at before update on public.bons_commande for each row execute function public.maj_updated_at();
alter table public.demandes_achat add constraint demandes_bc_fk foreign key (bc_id) references public.bons_commande (id);

create table public.lignes_bc (
  id                 uuid primary key default gen_random_uuid(),
  bc_id              uuid not null references public.bons_commande (id) on delete cascade,
  article_id         uuid not null references public.articles (id),
  -- Quantité dans l'unité de stock de l'article (kg pour les bobines).
  quantite           numeric(14, 3) not null check (quantite > 0),
  -- Prix par unité de stock, dans la devise du bon (ex. 1,15 USD/kg = 1 150 USD/t).
  prix_unitaire      numeric(16, 4) not null check (prix_unitaire >= 0),
  -- Montant en unités minimales de la devise (GNF, ou centimes d'USD).
  montant_devise     bigint not null default 0
);

create or replace function public.ligne_bc_calcul()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_devise text;
begin
  select devise into v_devise from public.bons_commande where id = new.bc_id;
  new.montant_devise := round(new.quantite * new.prix_unitaire * case when v_devise = 'USD' then 100 else 1 end);
  return new;
end $$;
create trigger ligne_bc_calcul before insert or update on public.lignes_bc for each row execute function public.ligne_bc_calcul();

-- Validation (envoi) d'un bon de commande : numéro, taux du jour, demandes liées passées « commandées ».
create or replace function public.envoyer_bc(p_bc uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_bc public.bons_commande%rowtype;
  v_numero text;
begin
  if not public.a_un_role('achats') then raise exception 'Réservé au service achats.' using errcode = '42501'; end if;
  select * into v_bc from public.bons_commande where id = p_bc for update;
  if v_bc.statut <> 'brouillon' then raise exception 'Ce bon de commande est déjà envoyé.' using errcode = '22023'; end if;
  if not exists (select 1 from public.lignes_bc where bc_id = p_bc) then raise exception 'Le bon de commande ne contient aucune ligne.' using errcode = '22023'; end if;
  v_numero := public.prochain_numero('BC-' || to_char(v_bc.date_commande, 'YYYY') || '-');
  update public.bons_commande
     set statut = 'envoye', numero = v_numero,
         taux_change = case when devise = 'USD' then public.taux_a_la_date('USD', date_commande) else 1 end
   where id = p_bc;
  update public.demandes_achat set statut = 'commandee' where bc_id = p_bc;
  return v_numero;
end $$;

-- -----------------------------------------------------------------------------
-- Conteneurs (ou livraisons fournisseur) : suivi jusqu'à l'usine
-- -----------------------------------------------------------------------------
create type public.statut_conteneur as enum ('commande', 'en_mer', 'au_port', 'dedouane', 'livre');

create table public.conteneurs (
  id                         uuid primary key default gen_random_uuid(),
  bc_id                      uuid not null references public.bons_commande (id),
  reference                  text not null check (length(trim(reference)) > 0),
  navire                     text not null default '',
  statut                     public.statut_conteneur not null default 'commande',
  -- Poids net déclaré (packing list) : base du coût de revient au kg.
  poids_net_prevu_kg         numeric(12, 2) not null default 0 check (poids_net_prevu_kg >= 0),
  date_embarquement_prevue   date,
  date_embarquement_reelle   date,
  date_arrivee_port_prevue   date,
  date_arrivee_port_reelle   date,
  date_dedouanement_prevue   date,
  date_dedouanement_reelle   date,
  date_livraison_prevue      date,
  date_livraison_reelle      date,
  notes                      text not null default '',
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  unique (bc_id, reference)
);
create trigger conteneurs_updated_at before update on public.conteneurs for each row execute function public.maj_updated_at();

-- Le statut avance avec les dates réelles saisies (le plus avancé l'emporte).
create or replace function public.conteneur_statut()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.statut := case
    when new.date_livraison_reelle is not null then 'livre'
    when new.date_dedouanement_reelle is not null then 'dedouane'
    when new.date_arrivee_port_reelle is not null then 'au_port'
    when new.date_embarquement_reelle is not null then 'en_mer'
    else 'commande' end;
  return new;
end $$;
create trigger conteneur_statut before insert or update on public.conteneurs for each row execute function public.conteneur_statut();

-- Frais d'approche rattachés à un conteneur, chacun avec sa devise et son taux du jour.
create table public.frais_approche (
  id             uuid primary key default gen_random_uuid(),
  conteneur_id   uuid not null references public.conteneurs (id) on delete cascade,
  type_frais_id  uuid not null references public.types_frais (id),
  date_frais     date not null default public.aujourdhui_conakry(),
  devise         text not null default 'GNF' check (devise in ('GNF', 'USD')),
  montant        bigint not null check (montant > 0),
  taux_change    numeric(12, 4) not null default 1 check (taux_change > 0),
  montant_gnf    bigint not null default 0,
  prestataire    text not null default '',
  reference      text not null default '',
  created_by     uuid references public.profils (id) default auth.uid(),
  created_at     timestamptz not null default now()
);

create or replace function public.frais_calcul()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.devise = 'GNF' then
    new.taux_change := 1;
    new.montant_gnf := new.montant;
  else
    -- Taux à la date du frais si non fourni ; montant en centimes d'USD.
    if new.taux_change is null or new.taux_change = 1 then new.taux_change := public.taux_a_la_date('USD', new.date_frais); end if;
    new.montant_gnf := round(new.montant * new.taux_change / 100);
  end if;
  return new;
end $$;
create trigger frais_calcul before insert or update on public.frais_approche for each row execute function public.frais_calcul();

-- Lots (bobines) rattachés au conteneur d'origine (traçabilité et coût de revient).
alter table public.lots add column conteneur_id uuid references public.conteneurs (id);

-- -----------------------------------------------------------------------------
-- Coût de revient d'un conteneur (même calcul que src/lib/metier/achats.ts)
-- Marchandise = part du bon de commande au prorata du poids du conteneur (prix × kg prévus, au taux du BC).
-- -----------------------------------------------------------------------------
create view public.couts_conteneurs with (security_invoker = true) as
with base as (
  select c.id, c.bc_id, c.reference, c.statut, c.poids_net_prevu_kg,
         b.devise, b.taux_change, b.numero as bc_numero, b.fournisseur_id, b.date_commande, b.frais_estimes_gnf,
         (select coalesce(sum(l.quantite), 0) from public.lignes_bc l where l.bc_id = b.id) as kg_bc,
         (select coalesce(sum(l.montant_devise), 0) from public.lignes_bc l where l.bc_id = b.id) as montant_bc_devise,
         (select coalesce(sum(lo.poids_net_kg), 0) from public.lots lo where lo.conteneur_id = c.id) as kg_recus,
         (select coalesce(sum(f.montant_gnf), 0) from public.frais_approche f where f.conteneur_id = c.id) as frais_gnf,
         c.date_livraison_reelle
  from public.conteneurs c join public.bons_commande b on b.id = c.bc_id
)
select base.*,
       round(case when kg_bc > 0 then montant_bc_devise * (poids_net_prevu_kg / kg_bc) else 0 end
             * case when devise = 'USD' then taux_change / 100 else 1 end) as marchandise_gnf,
       -- Coût au kg sur le poids net DÉCLARÉ (packing list, facture) : stable pendant une réception partielle.
       -- Le poids réellement reçu (kg_recus) sert à contrôler l'écart de poids.
       case when poids_net_prevu_kg > 0 then
         round((round(case when kg_bc > 0 then montant_bc_devise * (poids_net_prevu_kg / kg_bc) else 0 end
                      * case when devise = 'USD' then taux_change / 100 else 1 end) + frais_gnf)
               / poids_net_prevu_kg, 2)
       end as cout_kg_gnf,
       -- Coût prévu au kg : prix du BC + frais estimés répartis sur le poids du BC.
       case when kg_bc > 0 then round((montant_bc_devise * case when devise = 'USD' then taux_change / 100 else 1 end + frais_estimes_gnf) / kg_bc, 2) end as cout_kg_prevu_gnf
from base;

-- Tonnes en transit : conteneurs non livrés.
create view public.transit with (security_invoker = true) as
select coalesce(sum(poids_net_prevu_kg), 0) as kg_en_transit, count(*) as nb_conteneurs
from public.conteneurs where statut <> 'livre';

-- -----------------------------------------------------------------------------
-- Documents joints (factures, BL, packing list…) — Storage privé « documents-achats »
-- -----------------------------------------------------------------------------
create table public.documents (
  id              uuid primary key default gen_random_uuid(),
  objet_type      text not null check (objet_type in ('bon_commande', 'conteneur')),
  objet_id        uuid not null,
  type_document_id uuid references public.types_documents (id),
  nom_fichier     text not null,
  chemin          text not null unique,
  taille_octets   integer,
  created_by      uuid references public.profils (id) default auth.uid(),
  created_at      timestamptz not null default now()
);
create index documents_objet_idx on public.documents (objet_type, objet_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents-achats', 'documents-achats', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy documents_achats_ajout on storage.objects for insert to authenticated
  with check (bucket_id = 'documents-achats' and public.a_un_role('achats', 'finance'));
create policy documents_achats_lecture on storage.objects for select to authenticated
  using (bucket_id = 'documents-achats' and public.a_un_role('achats', 'finance', 'magasin'));

-- -----------------------------------------------------------------------------
-- RLS : achats (écriture), finance et magasin (lecture), demandes ouvertes au magasin et à la production.
-- -----------------------------------------------------------------------------
alter table public.types_frais enable row level security;
alter table public.types_documents enable row level security;
alter table public.demandes_achat enable row level security;
alter table public.bons_commande enable row level security;
alter table public.lignes_bc enable row level security;
alter table public.conteneurs enable row level security;
alter table public.frais_approche enable row level security;
alter table public.documents enable row level security;

create policy types_frais_lecture on public.types_frais for select to authenticated using (public.est_actif());
create policy types_frais_ecriture on public.types_frais for all to authenticated
  using (public.est_admin() or public.a_un_role('achats')) with check (public.est_admin() or public.a_un_role('achats'));
create policy types_documents_lecture on public.types_documents for select to authenticated using (public.est_actif());
create policy types_documents_ecriture on public.types_documents for all to authenticated
  using (public.est_admin() or public.a_un_role('achats')) with check (public.est_admin() or public.a_un_role('achats'));

create policy demandes_lecture on public.demandes_achat for select to authenticated
  using (public.a_un_role('achats', 'finance') or demandeur_id = (select auth.uid()));
create policy demandes_ajout on public.demandes_achat for insert to authenticated
  with check (public.a_un_role('achats', 'magasin', 'production', 'maintenance') and demandeur_id = (select auth.uid()));
create policy demandes_traitement on public.demandes_achat for update to authenticated
  using (public.a_un_role('achats')) with check (public.a_un_role('achats'));

do $$
declare
  t text;
begin
  foreach t in array array['bons_commande', 'lignes_bc', 'conteneurs', 'frais_approche', 'documents'] loop
    execute format($p$create policy %I on public.%I for select to authenticated using (public.a_un_role('achats', 'finance', 'magasin'))$p$, t || '_lecture', t);
    execute format($p$create policy %I on public.%I for insert to authenticated with check (public.a_un_role('achats'))$p$, t || '_ajout', t);
    execute format($p$create policy %I on public.%I for update to authenticated using (public.a_un_role('achats')) with check (public.a_un_role('achats'))$p$, t || '_modif', t);
  end loop;
end $$;
-- Les lignes d'un bon de commande en brouillon peuvent être supprimées ; les frais saisis par erreur aussi.
create policy lignes_bc_suppr on public.lignes_bc for delete to authenticated
  using (public.a_un_role('achats') and exists (select 1 from public.bons_commande b where b.id = bc_id and b.statut = 'brouillon'));
create policy frais_suppr on public.frais_approche for delete to authenticated using (public.a_un_role('achats'));
create policy documents_ajout_finance on public.documents for insert to authenticated with check (public.a_un_role('finance'));

-- Le magasin réceptionne les bobines d'un conteneur : il peut rattacher ses lots (colonne conteneur_id via receptionner_bobine).
create or replace function public.receptionner_bobine_conteneur(
  p_conteneur uuid, p_article uuid, p_numero_lot text, p_poids_kg numeric,
  p_grammage numeric default null, p_largeur_mm numeric default null, p_diametre_mm numeric default null, p_plis smallint default null
) returns uuid language plpgsql set search_path = '' as $$
declare
  v_c record;
  v_lot uuid;
begin
  select * into v_c from public.couts_conteneurs where id = p_conteneur;
  if v_c.id is null then raise exception 'Conteneur introuvable.' using errcode = '22023'; end if;
  v_lot := public.receptionner_bobine(p_article, p_numero_lot, p_poids_kg, coalesce(v_c.cout_kg_gnf, 0),
             (select fournisseur_id from public.bons_commande where id = v_c.bc_id), public.aujourdhui_conakry(),
             p_grammage, p_largeur_mm, p_diametre_mm, p_plis, 'Conteneur ' || v_c.reference);
  update public.lots set conteneur_id = p_conteneur where id = v_lot;
  return v_lot;
end $$;

select public.activer_audit('public.types_frais');
select public.activer_audit('public.types_documents');
select public.activer_audit('public.demandes_achat');
select public.activer_audit('public.bons_commande');
select public.activer_audit('public.lignes_bc');
select public.activer_audit('public.conteneurs');
select public.activer_audit('public.frais_approche');
select public.activer_audit('public.documents');
