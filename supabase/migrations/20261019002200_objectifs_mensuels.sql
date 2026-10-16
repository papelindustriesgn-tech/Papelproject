-- =============================================================================
-- Papel ERP — Objectifs mensuels du business plan (production, ventes, coûts), comparés au réel
-- dans les vues d'ensemble Direction, Ventes et Production. Une ligne par mois, modifiable par la
-- Direction et la Finance (Direction → Configuration → Objectifs du business plan).
-- =============================================================================
create table public.objectifs_mensuels (
  id                   uuid primary key default gen_random_uuid(),
  -- Premier jour du mois visé.
  mois                 date not null unique check (extract(day from mois) = 1),
  libelle              text not null default '',
  production_kg        numeric(14, 3) not null default 0 check (production_kg >= 0),
  paquets              integer not null default 0 check (paquets >= 0),
  ca_ht_gnf            bigint not null default 0 check (ca_ht_gnf >= 0),
  couts_variables_gnf  bigint not null default 0 check (couts_variables_gnf >= 0),
  charges_fixes_gnf    bigint not null default 0 check (charges_fixes_gnf >= 0),
  actif                boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create trigger objectifs_mensuels_updated_at before update on public.objectifs_mensuels
  for each row execute function public.maj_updated_at();

alter table public.objectifs_mensuels enable row level security;
-- Lecture : tout compte actif (les vues d'ensemble comparent le réel à l'objectif) ; écriture : Direction, Finance, administrateur.
create policy objectifs_lecture on public.objectifs_mensuels for select to authenticated using (public.est_actif());
create policy objectifs_ecriture on public.objectifs_mensuels for all to authenticated
  using (public.est_actif() and (public.a_un_role('finance') or public.est_admin()))
  with check (public.est_actif() and (public.a_un_role('finance') or public.est_admin()));

select public.activer_audit('public.objectifs_mensuels');
