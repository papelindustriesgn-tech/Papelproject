-- =============================================================================
-- Phase 3 – étape 1 : Finance
-- Comptes de trésorerie (caisse, banques, mobile money), journal de trésorerie inaltérable alimenté par les
-- encaissements clients et les règlements fournisseurs, factures fournisseurs (dettes) classées par catégorie
-- de charge (nature stock / variable / fixe, compte SYSCOHADA), charges récurrentes (loyer, salaires…).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Listes modifiables
-- -----------------------------------------------------------------------------
create table public.comptes_tresorerie (
  id                  uuid primary key default gen_random_uuid(),
  libelle             text not null unique check (length(trim(libelle)) > 0),
  type_compte         text not null check (type_compte in ('caisse', 'banque', 'mobile')),
  devise              text not null default 'GNF' check (devise in ('GNF', 'USD')),
  compte_comptable    text not null default '',
  -- Solde d'ouverture dans la devise du compte (GNF, ou centimes d'USD).
  solde_initial       bigint not null default 0,
  date_solde_initial  date not null default public.aujourdhui_conakry(),
  ordre               integer not null default 0,
  actif               boolean not null default true
);

-- Compte de trésorerie où arrivent les encaissements de chaque mode de paiement (espèces → caisse…).
alter table public.modes_paiement add column compte_id uuid references public.comptes_tresorerie (id);

create table public.categories_charges (
  id                uuid primary key default gen_random_uuid(),
  libelle           text not null unique check (length(trim(libelle)) > 0),
  -- stock : achat stocké (son coût passe dans le coût des ventes au CMP, pas directement en charge) ;
  -- variable : varie avec l'activité ; fixe : indépendante du volume (sert au seuil de rentabilité).
  nature            text not null check (nature in ('stock', 'variable', 'fixe')),
  compte_comptable  text not null default '',
  ordre             integer not null default 0,
  actif             boolean not null default true
);

-- -----------------------------------------------------------------------------
-- Factures fournisseurs (dettes)
-- -----------------------------------------------------------------------------
create table public.factures_fournisseurs (
  id                     uuid primary key default gen_random_uuid(),
  numero                 text unique,
  fournisseur_id         uuid references public.fournisseurs (id),
  -- Bénéficiaire sans fiche fournisseur (salariés, administration…).
  tiers                  text not null default '',
  reference_fournisseur  text not null default '',
  libelle                text not null check (length(trim(libelle)) > 0),
  categorie_id           uuid not null references public.categories_charges (id),
  date_facture           date not null default public.aujourdhui_conakry(),
  date_echeance          date not null default public.aujourdhui_conakry(),
  devise                 text not null default 'GNF' check (devise in ('GNF', 'USD')),
  -- Montants dans la devise (GNF, ou centimes d'USD) ; conversion au taux de la date de facture.
  montant_ht             bigint not null check (montant_ht >= 0),
  montant_tva            bigint not null default 0 check (montant_tva >= 0),
  taux_change            numeric(14, 4),
  montant_ht_gnf         bigint,
  montant_tva_gnf        bigint,
  total_gnf              bigint,
  bc_id                  uuid references public.bons_commande (id),
  conteneur_id           uuid references public.conteneurs (id),
  recurrente_id          uuid,
  mois_recurrence        date,
  statut                 text not null default 'a_payer' check (statut in ('a_payer', 'annulee')),
  created_by             uuid references public.profils (id) default auth.uid(),
  created_at             timestamptz not null default now(),
  check (fournisseur_id is not null or length(trim(tiers)) > 0),
  check (date_echeance >= date_facture),
  unique (recurrente_id, mois_recurrence)
);
create index factures_fournisseurs_date_idx on public.factures_fournisseurs (date_facture desc);

create or replace function public.facture_fournisseur_calcul() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.numero := public.prochain_numero('FF-' || to_char(new.date_facture, 'YYYY') || '-');
  end if;
  if new.devise = 'GNF' then
    new.taux_change := 1;
    new.montant_ht_gnf := new.montant_ht;
    new.montant_tva_gnf := new.montant_tva;
  else
    new.taux_change := coalesce(new.taux_change, public.taux_a_la_date('USD', new.date_facture));
    new.montant_ht_gnf := round(new.montant_ht * new.taux_change / 100);
    new.montant_tva_gnf := round(new.montant_tva * new.taux_change / 100);
  end if;
  new.total_gnf := new.montant_ht_gnf + new.montant_tva_gnf;
  return new;
end $$;
create trigger facture_fournisseur_calcul before insert or update on public.factures_fournisseurs
  for each row execute function public.facture_fournisseur_calcul();
revoke execute on function public.facture_fournisseur_calcul() from public, anon, authenticated;

create table public.reglements_fournisseurs (
  id              uuid primary key default gen_random_uuid(),
  facture_id      uuid not null references public.factures_fournisseurs (id),
  date_reglement  date not null default public.aujourdhui_conakry(),
  compte_id       uuid not null references public.comptes_tresorerie (id),
  montant_gnf     bigint not null check (montant_gnf > 0),
  reference       text not null default '',
  saisi_par       uuid references public.profils (id) default auth.uid(),
  created_at      timestamptz not null default now()
);
create index reglements_facture_idx on public.reglements_fournisseurs (facture_id);

create view public.factures_fournisseurs_etat with (security_invoker = true) as
select f.*, coalesce(fo.nom, f.tiers) as beneficiaire, c.libelle as categorie_libelle, c.nature, c.compte_comptable as compte_charge,
       coalesce((select sum(r.montant_gnf) from public.reglements_fournisseurs r where r.facture_id = f.id), 0)::bigint as paye_gnf,
       case when f.statut = 'annulee' then 0
            else greatest(0, f.total_gnf - coalesce((select sum(r.montant_gnf) from public.reglements_fournisseurs r where r.facture_id = f.id), 0)) end::bigint as solde_gnf,
       greatest(0, public.aujourdhui_conakry() - f.date_echeance) as jours_retard
from public.factures_fournisseurs f
join public.categories_charges c on c.id = f.categorie_id
left join public.fournisseurs fo on fo.id = f.fournisseur_id;

-- Facture réglée (même partiellement) : figée. Une erreur se corrige avant le premier règlement (modification ou annulation).
create or replace function public.facture_fournisseur_figee() returns trigger language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from public.reglements_fournisseurs where facture_id = old.id) and current_user in ('authenticated', 'anon') then
    raise exception 'Facture déjà (partiellement) réglée : elle ne peut plus être modifiée ni annulée.' using errcode = '42501';
  end if;
  return coalesce(new, old);
end $$;
create trigger facture_fournisseur_figee before update or delete on public.factures_fournisseurs
  for each row execute function public.facture_fournisseur_figee();

-- -----------------------------------------------------------------------------
-- Charges récurrentes (loyer, salaires, abonnements…) → une facture à payer par mois
-- -----------------------------------------------------------------------------
create table public.charges_recurrentes (
  id              uuid primary key default gen_random_uuid(),
  libelle         text not null check (length(trim(libelle)) > 0),
  categorie_id    uuid not null references public.categories_charges (id),
  fournisseur_id  uuid references public.fournisseurs (id),
  tiers           text not null default '',
  montant_gnf     bigint not null check (montant_gnf > 0),
  jour_echeance   smallint not null default 5 check (jour_echeance between 1 and 28),
  date_debut      date not null default date_trunc('month', public.aujourdhui_conakry())::date,
  date_fin        date,
  actif           boolean not null default true,
  check (fournisseur_id is not null or length(trim(tiers)) > 0)
);
alter table public.factures_fournisseurs add constraint factures_recurrente_fk foreign key (recurrente_id) references public.charges_recurrentes (id);

-- Génère les factures du mois pour les charges récurrentes actives (idempotent).
create or replace function public.generer_charges_mois(p_mois date)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_mois date := date_trunc('month', p_mois)::date;
  v_nb integer;
begin
  if not public.a_un_role('finance') then raise exception 'Droits insuffisants.' using errcode = '42501'; end if;
  insert into public.factures_fournisseurs (fournisseur_id, tiers, libelle, categorie_id, date_facture, date_echeance, devise, montant_ht, recurrente_id, mois_recurrence)
  select r.fournisseur_id, r.tiers, r.libelle || ' – ' || to_char(v_mois, 'MM/YYYY'), r.categorie_id, v_mois,
         v_mois + (r.jour_echeance - 1), 'GNF', r.montant_gnf, r.id, v_mois
  from public.charges_recurrentes r
  where r.actif and r.date_debut <= (v_mois + interval '1 month' - interval '1 day')::date and (r.date_fin is null or r.date_fin >= v_mois)
  on conflict (recurrente_id, mois_recurrence) do nothing;
  get diagnostics v_nb = row_count;
  return v_nb;
end $$;

-- -----------------------------------------------------------------------------
-- Journal de trésorerie (inaltérable : une erreur se corrige par un mouvement inverse)
-- -----------------------------------------------------------------------------
create table public.mouvements_tresorerie (
  id              uuid primary key default gen_random_uuid(),
  compte_id       uuid not null references public.comptes_tresorerie (id),
  date_operation  date not null default public.aujourdhui_conakry(),
  sens            text not null check (sens in ('entree', 'sortie')),
  -- Montant positif dans la devise du compte (GNF, ou centimes d'USD) et contre-valeur en GNF.
  montant         bigint not null check (montant > 0),
  taux_change     numeric(14, 4) not null default 1,
  montant_gnf     bigint not null check (montant_gnf > 0),
  origine         text not null check (origine in ('client', 'fournisseur', 'virement', 'autre')),
  paiement_id     uuid unique references public.paiements (id),
  reglement_id    uuid unique references public.reglements_fournisseurs (id),
  virement_id     uuid,
  categorie_id    uuid references public.categories_charges (id),
  libelle         text not null check (length(trim(libelle)) > 0),
  reference       text not null default '',
  saisi_par       uuid references public.profils (id) default auth.uid(),
  created_at      timestamptz not null default now()
);
create index mouvements_tresorerie_idx on public.mouvements_tresorerie (compte_id, date_operation);

create or replace function public.mouvement_tresorerie_inalterable() returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'Le journal de trésorerie est inaltérable : passez un mouvement inverse.' using errcode = '42501';
end $$;
create trigger mouvements_tresorerie_inalterable before update or delete on public.mouvements_tresorerie
  for each row execute function public.mouvement_tresorerie_inalterable();

-- Montant dans la devise d'un compte à partir d'un montant GNF (taux du jour pour un compte en USD).
create or replace function public.convertir_pour_compte(p_compte uuid, p_montant_gnf bigint, p_date date, out montant bigint, out taux numeric)
language plpgsql stable set search_path = '' as $$
begin
  if (select devise from public.comptes_tresorerie where id = p_compte) = 'USD' then
    taux := public.taux_a_la_date('USD', p_date);
    montant := round(p_montant_gnf * 100 / taux);
  else
    taux := 1;
    montant := p_montant_gnf;
  end if;
end $$;

-- Encaissement client → entrée sur le compte du mode de paiement (à défaut, la première caisse en GNF).
create or replace function public.paiement_vers_tresorerie() returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_compte uuid;
  v_facture text;
  v_client text;
begin
  select coalesce(m.compte_id, (select id from public.comptes_tresorerie where type_compte = 'caisse' and devise = 'GNF' and actif order by ordre limit 1))
    into v_compte from public.modes_paiement m where m.id = new.mode_id;
  if v_compte is null then return new; end if; -- trésorerie non paramétrée
  select f.numero, c.nom into v_facture, v_client from public.pieces_vente f join public.clients c on c.id = f.client_id where f.id = new.facture_id;
  insert into public.mouvements_tresorerie (compte_id, date_operation, sens, montant, taux_change, montant_gnf, origine, paiement_id, libelle, reference, saisi_par)
  select v_compte, new.date_paiement, 'entree', cv.montant, cv.taux, new.montant_gnf, 'client', new.id,
         'Encaissement ' || coalesce(v_facture, '') || ' – ' || coalesce(v_client, ''), new.reference, new.saisi_par
  from public.convertir_pour_compte(v_compte, new.montant_gnf, new.date_paiement) cv;
  return new;
end $$;
create trigger paiement_tresorerie after insert on public.paiements for each row execute function public.paiement_vers_tresorerie();
revoke execute on function public.paiement_vers_tresorerie() from public, anon, authenticated;

-- Règlement d'une facture fournisseur : refus au-delà du reste dû ; sortie de trésorerie.
create or replace function public.regler_facture_fournisseur(
  p_facture uuid, p_compte uuid, p_montant_gnf bigint, p_date date default public.aujourdhui_conakry(), p_reference text default ''
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_f record;
  v_id uuid;
begin
  if not public.a_un_role('finance') then raise exception 'Seule la comptabilité règle les fournisseurs.' using errcode = '42501'; end if;
  select * into v_f from public.factures_fournisseurs_etat where id = p_facture;
  if v_f.id is null or v_f.statut = 'annulee' then raise exception 'Facture introuvable ou annulée.' using errcode = '22023'; end if;
  if p_montant_gnf > v_f.solde_gnf then
    raise exception 'Le règlement (% GNF) dépasse le reste à payer (% GNF).', public.nombre_fr(p_montant_gnf), public.nombre_fr(v_f.solde_gnf) using errcode = '22023';
  end if;
  insert into public.reglements_fournisseurs (facture_id, date_reglement, compte_id, montant_gnf, reference)
  values (p_facture, p_date, p_compte, p_montant_gnf, coalesce(p_reference, '')) returning id into v_id;
  insert into public.mouvements_tresorerie (compte_id, date_operation, sens, montant, taux_change, montant_gnf, origine, reglement_id, categorie_id, libelle, reference)
  select p_compte, p_date, 'sortie', cv.montant, cv.taux, p_montant_gnf, 'fournisseur', v_id, v_f.categorie_id,
         'Règlement ' || v_f.numero || ' – ' || v_f.beneficiaire, coalesce(p_reference, '')
  from public.convertir_pour_compte(p_compte, p_montant_gnf, p_date) cv;
  return v_id;
end $$;

-- Virement entre deux comptes (ex. dépôt d'espèces à la banque).
create or replace function public.virement_interne(p_de uuid, p_vers uuid, p_montant_gnf bigint, p_date date default public.aujourdhui_conakry(), p_libelle text default 'Virement interne')
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid := gen_random_uuid();
begin
  if not public.a_un_role('finance') then raise exception 'Droits insuffisants.' using errcode = '42501'; end if;
  if p_de = p_vers then raise exception 'Choisissez deux comptes différents.' using errcode = '22023'; end if;
  if p_montant_gnf is null or p_montant_gnf <= 0 then raise exception 'Montant invalide.' using errcode = '22023'; end if;
  insert into public.mouvements_tresorerie (compte_id, date_operation, sens, montant, taux_change, montant_gnf, origine, virement_id, libelle)
  select p_de, p_date, 'sortie', cv.montant, cv.taux, p_montant_gnf, 'virement', v_id, p_libelle from public.convertir_pour_compte(p_de, p_montant_gnf, p_date) cv;
  insert into public.mouvements_tresorerie (compte_id, date_operation, sens, montant, taux_change, montant_gnf, origine, virement_id, libelle)
  select p_vers, p_date, 'entree', cv.montant, cv.taux, p_montant_gnf, 'virement', v_id, p_libelle from public.convertir_pour_compte(p_vers, p_montant_gnf, p_date) cv;
  return v_id;
end $$;

-- Soldes : ouverture + entrées − sorties (dans la devise du compte) et contre-valeur GNF au taux du jour.
create view public.soldes_tresorerie with (security_invoker = true) as
select c.*,
       c.solde_initial + coalesce((select sum(case when m.sens = 'entree' then m.montant else -m.montant end)
                                   from public.mouvements_tresorerie m where m.compte_id = c.id and m.date_operation >= c.date_solde_initial), 0) as solde,
       case when c.devise = 'USD' then public.taux_a_la_date('USD', public.aujourdhui_conakry()) else 1 end as taux_actuel
from public.comptes_tresorerie c;

-- Une caisse ne peut pas être négative (une banque peut l'être : découvert).
create or replace function public.controler_solde_compte(p_compte uuid) returns void language plpgsql set search_path = '' as $$
declare
  v record;
begin
  select * into v from public.soldes_tresorerie where id = p_compte;
  if v.type_compte in ('caisse', 'mobile') and v.solde < 0 then
    raise exception 'Solde insuffisant sur « % » (il deviendrait négatif).', v.libelle using errcode = '22023';
  end if;
end $$;

create or replace function public.mouvement_tresorerie_solde() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.sens = 'sortie' then perform public.controler_solde_compte(new.compte_id); end if;
  return new;
end $$;
create trigger mouvements_tresorerie_solde after insert on public.mouvements_tresorerie for each row execute function public.mouvement_tresorerie_solde();
revoke execute on function public.mouvement_tresorerie_solde() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- RLS : finance (et Direction) ; les achats consultent et saisissent les factures fournisseurs.
-- -----------------------------------------------------------------------------
alter table public.comptes_tresorerie enable row level security;
alter table public.categories_charges enable row level security;
alter table public.factures_fournisseurs enable row level security;
alter table public.reglements_fournisseurs enable row level security;
alter table public.charges_recurrentes enable row level security;
alter table public.mouvements_tresorerie enable row level security;

create policy comptes_lecture on public.comptes_tresorerie for select to authenticated using (public.a_un_role('finance'));
create policy comptes_ecriture on public.comptes_tresorerie for all to authenticated
  using (public.est_admin() or public.a_un_role('finance')) with check (public.est_admin() or public.a_un_role('finance'));
create policy categories_charges_lecture on public.categories_charges for select to authenticated using (public.est_actif());
create policy categories_charges_ecriture on public.categories_charges for all to authenticated
  using (public.est_admin() or public.a_un_role('finance')) with check (public.est_admin() or public.a_un_role('finance'));

create policy ff_lecture on public.factures_fournisseurs for select to authenticated using (public.a_un_role('finance', 'achats'));
create policy ff_ajout on public.factures_fournisseurs for insert to authenticated with check (public.a_un_role('finance', 'achats') and statut = 'a_payer');
create policy ff_modif on public.factures_fournisseurs for update to authenticated
  using (public.a_un_role('finance')) with check (public.a_un_role('finance'));
create policy reglements_lecture on public.reglements_fournisseurs for select to authenticated using (public.a_un_role('finance', 'achats'));

create policy recurrentes_lecture on public.charges_recurrentes for select to authenticated using (public.a_un_role('finance'));
create policy recurrentes_ecriture on public.charges_recurrentes for all to authenticated
  using (public.a_un_role('finance')) with check (public.a_un_role('finance'));

create policy mvt_tresorerie_lecture on public.mouvements_tresorerie for select to authenticated using (public.a_un_role('finance'));
-- Mouvements divers saisis à la main (frais bancaires, apport, retrait…) ; les autres passent par les fonctions.
create policy mvt_tresorerie_ajout on public.mouvements_tresorerie for insert to authenticated
  with check (public.a_un_role('finance') and origine = 'autre' and paiement_id is null and reglement_id is null);

select public.activer_audit('public.comptes_tresorerie');
select public.activer_audit('public.categories_charges');
select public.activer_audit('public.factures_fournisseurs');
select public.activer_audit('public.reglements_fournisseurs');
select public.activer_audit('public.charges_recurrentes');
select public.activer_audit('public.mouvements_tresorerie');
