-- =============================================================================
-- Phase 2 – étape 4 : Maintenance
-- Équipements, plans de maintenance préventive, interventions (ordres de travail), pièces de rechange
-- (articles du stock, sorties automatiques), indicateurs MTBF / MTTR / disponibilité.
-- =============================================================================

create table public.equipements (
  id                 uuid primary key default gen_random_uuid(),
  code               text not null unique check (length(trim(code)) > 0),
  libelle            text not null check (length(trim(libelle)) > 0),
  ligne_id           uuid references public.lignes_production (id),
  categorie          text not null default '',
  -- A : arrêt de la production si en panne ; B : production ralentie ; C : sans impact direct.
  criticite          text not null default 'B' check (criticite in ('A', 'B', 'C')),
  marque_modele      text not null default '',
  date_mise_service  date,
  actif              boolean not null default true,
  notes              text not null default '',
  created_at         timestamptz not null default now()
);
comment on table public.equipements is 'Parc machines (liste modifiable). Criticité A/B/C : priorité des interventions et des pièces.';

-- Pièces de rechange d'un équipement : articles du stock (famille « pièce détachée »).
create table public.equipement_pieces (
  id              uuid primary key default gen_random_uuid(),
  equipement_id   uuid not null references public.equipements (id) on delete cascade,
  article_id      uuid not null references public.articles (id),
  critique        boolean not null default false,
  unique (equipement_id, article_id)
);

create table public.plans_preventifs (
  id                     uuid primary key default gen_random_uuid(),
  equipement_id          uuid not null references public.equipements (id),
  libelle                text not null check (length(trim(libelle)) > 0),
  frequence_jours        integer not null check (frequence_jours > 0),
  duree_estimee_min      integer check (duree_estimee_min is null or duree_estimee_min > 0),
  consignes              text not null default '',
  derniere_realisation   date,
  actif                  boolean not null default true,
  created_at             timestamptz not null default now()
);

-- Échéance : dernière réalisation + fréquence (jamais faite → due dès aujourd'hui).
create view public.echeances_preventif with (security_invoker = true) as
select p.*, e.code as equipement_code, e.libelle as equipement_libelle, e.criticite,
       coalesce(p.derniere_realisation + p.frequence_jours, public.aujourdhui_conakry()) as prochaine_echeance,
       coalesce(p.derniere_realisation + p.frequence_jours, public.aujourdhui_conakry()) - public.aujourdhui_conakry() as jours_restants
from public.plans_preventifs p join public.equipements e on e.id = p.equipement_id
where p.actif and e.actif;

-- -----------------------------------------------------------------------------
-- Interventions (ordres de travail)
-- -----------------------------------------------------------------------------
create table public.interventions (
  id                  uuid primary key default gen_random_uuid(),
  numero              text unique,
  equipement_id       uuid not null references public.equipements (id),
  type_intervention   text not null check (type_intervention in ('preventive', 'curative', 'amelioration')),
  plan_id             uuid references public.plans_preventifs (id),
  priorite            text not null default 'normale' check (priorite in ('urgente', 'normale', 'basse')),
  statut              text not null default 'demandee' check (statut in ('demandee', 'en_cours', 'terminee', 'annulee')),
  description         text not null check (length(trim(description)) > 0),
  signale_le          timestamptz not null default now(),
  signale_par         uuid references public.profils (id) default auth.uid(),
  -- La machine était-elle à l'arrêt ? Début/fin de l'arrêt (temps de réparation pour le MTTR).
  arret_machine       boolean not null default false,
  debut               timestamptz,
  fin                 timestamptz,
  intervenant         text not null default '',
  cause               text not null default '',
  travaux             text not null default '',
  cout_main_oeuvre_gnf bigint not null default 0 check (cout_main_oeuvre_gnf >= 0),
  cout_externe_gnf    bigint not null default 0 check (cout_externe_gnf >= 0),
  created_at          timestamptz not null default now(),
  check (fin is null or debut is null or fin >= debut)
);
create index interventions_equipement_idx on public.interventions (equipement_id, signale_le desc);

create or replace function public.numeroter_intervention() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.numero := public.prochain_numero('OT-' || to_char(new.signale_le at time zone 'Africa/Conakry', 'YYYY') || '-');
  return new;
end $$;
create trigger intervention_numero before insert on public.interventions for each row execute function public.numeroter_intervention();
revoke execute on function public.numeroter_intervention() from public, anon, authenticated;

create table public.intervention_pieces (
  id               uuid primary key default gen_random_uuid(),
  intervention_id  uuid not null references public.interventions (id) on delete cascade,
  article_id       uuid not null references public.articles (id),
  quantite         numeric(12, 3) not null check (quantite > 0),
  unique (intervention_id, article_id)
);

-- Intervention terminée ou annulée : figée (pièces comprises).
create or replace function public.intervention_figee() returns trigger language plpgsql set search_path = '' as $$
declare
  v_statut text;
begin
  if tg_table_name = 'interventions' then
    v_statut := old.statut;
  else
    select statut into v_statut from public.interventions where id = coalesce(new.intervention_id, old.intervention_id);
  end if;
  if v_statut in ('terminee', 'annulee') and current_user in ('authenticated', 'anon') then
    raise exception 'Intervention clôturée : modification impossible.' using errcode = '42501';
  end if;
  return coalesce(new, old);
end $$;
create trigger intervention_figee before update or delete on public.interventions for each row execute function public.intervention_figee();
create trigger intervention_pieces_figee before insert or update or delete on public.intervention_pieces for each row execute function public.intervention_figee();

-- Clôture : pièces sorties du stock (mouvement « consommation »), plan préventif remis à jour.
create or replace function public.terminer_intervention(p_intervention uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_i public.interventions%rowtype;
begin
  if not public.a_un_role('maintenance') then
    raise exception 'Seule la maintenance clôture une intervention.' using errcode = '42501';
  end if;
  select * into v_i from public.interventions where id = p_intervention for update;
  if v_i.statut not in ('demandee', 'en_cours') then raise exception 'Intervention déjà clôturée.' using errcode = '22023'; end if;
  if v_i.debut is null or v_i.fin is null then raise exception 'Renseignez le début et la fin de l''intervention.' using errcode = '22023'; end if;
  if length(trim(v_i.travaux)) = 0 then raise exception 'Décrivez les travaux réalisés.' using errcode = '22023'; end if;
  if v_i.type_intervention = 'curative' and length(trim(v_i.cause)) = 0 then
    raise exception 'Indiquez la cause de la panne.' using errcode = '22023';
  end if;

  -- Pièces : refus si stock insuffisant (contrôle du trigger de stock).
  insert into public.mouvements_stock (date_operation, type, article_id, quantite, unite, motif, document_type, document_id, auteur_id)
  select (v_i.fin at time zone 'Africa/Conakry')::date, 'consommation', ip.article_id, -ip.quantite, a.unite,
         'Maintenance ' || v_i.numero, 'intervention', p_intervention, auth.uid()
  from public.intervention_pieces ip join public.articles a on a.id = ip.article_id
  where ip.intervention_id = p_intervention;

  update public.interventions set statut = 'terminee' where id = p_intervention;
  if v_i.plan_id is not null then
    update public.plans_preventifs set derniere_realisation = greatest(coalesce(derniere_realisation, '-infinity'::date), (v_i.fin at time zone 'Africa/Conakry')::date)
     where id = v_i.plan_id;
  end if;
end $$;

-- Crée les ordres de travail préventifs arrivés à échéance (sans doublon : un seul OT ouvert par plan).
create or replace function public.generer_preventifs(p_horizon_jours integer default 7)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_nb integer;
begin
  if not public.a_un_role('maintenance') then raise exception 'Droits insuffisants.' using errcode = '42501'; end if;
  insert into public.interventions (equipement_id, type_intervention, plan_id, priorite, description)
  select e.equipement_id, 'preventive', e.id, case when e.jours_restants < 0 then 'urgente' else 'normale' end,
         'Préventif : ' || e.libelle || case when e.consignes <> '' then E'\n' || e.consignes else '' end
  from public.echeances_preventif e
  where e.jours_restants <= p_horizon_jours
    and not exists (select 1 from public.interventions i where i.plan_id = e.id and i.statut in ('demandee', 'en_cours'));
  get diagnostics v_nb = row_count;
  return v_nb;
end $$;

-- Synthèse des interventions (durée d'arrêt et coût des pièces au CMP actuel).
create view public.interventions_etat with (security_invoker = true) as
select i.*, e.code as equipement_code, e.libelle as equipement_libelle, e.criticite, e.ligne_id,
       case when i.debut is not null and i.fin is not null then round(extract(epoch from (i.fin - i.debut)) / 60) end::integer as duree_min,
       (select coalesce(sum(-m.valeur_gnf), 0) from public.mouvements_stock m where m.document_type = 'intervention' and m.document_id = i.id)::bigint as cout_pieces_gnf
from public.interventions i join public.equipements e on e.id = i.equipement_id;

-- Pièces critiques sous le seuil d'alerte (ou en rupture).
create view public.pieces_critiques_alerte with (security_invoker = true) as
select distinct a.id as article_id, a.code, a.libelle, a.unite, a.seuil_alerte, coalesce(sa.quantite, 0) as quantite,
       string_agg(e.code, ', ') over (partition by a.id) as equipements
from public.equipement_pieces ep
join public.articles a on a.id = ep.article_id and a.actif
join public.equipements e on e.id = ep.equipement_id and e.actif
left join public.stocks_articles sa on sa.article_id = a.id
where ep.critique and coalesce(sa.quantite, 0) <= coalesce(a.seuil_alerte, 0);

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.equipements enable row level security;
alter table public.equipement_pieces enable row level security;
alter table public.plans_preventifs enable row level security;
alter table public.interventions enable row level security;
alter table public.intervention_pieces enable row level security;

create policy equipements_lecture on public.equipements for select to authenticated using (public.est_actif());
create policy equipements_ecriture on public.equipements for all to authenticated
  using (public.est_admin() or public.a_un_role('maintenance')) with check (public.est_admin() or public.a_un_role('maintenance'));
create policy equipement_pieces_lecture on public.equipement_pieces for select to authenticated using (public.a_un_role('maintenance', 'magasin', 'achats'));
create policy equipement_pieces_ecriture on public.equipement_pieces for all to authenticated
  using (public.a_un_role('maintenance')) with check (public.a_un_role('maintenance'));
create policy plans_lecture on public.plans_preventifs for select to authenticated using (public.a_un_role('maintenance', 'production'));
create policy plans_ecriture on public.plans_preventifs for all to authenticated
  using (public.a_un_role('maintenance')) with check (public.a_un_role('maintenance'));

-- La production signale les pannes (demandes) et suit leur traitement ; la maintenance gère tout.
create policy interventions_lecture on public.interventions for select to authenticated using (public.a_un_role('maintenance', 'production'));
create policy interventions_ajout on public.interventions for insert to authenticated
  with check (statut = 'demandee' and (public.a_un_role('maintenance') or (public.a_role('production') and type_intervention = 'curative')));
create policy interventions_modif on public.interventions for update to authenticated
  using (public.a_un_role('maintenance')) with check (public.a_un_role('maintenance') and statut in ('demandee', 'en_cours', 'annulee'));
create policy intervention_pieces_lecture on public.intervention_pieces for select to authenticated
  using (exists (select 1 from public.interventions i where i.id = intervention_id));
create policy intervention_pieces_ecriture on public.intervention_pieces for all to authenticated
  using (public.a_un_role('maintenance')) with check (public.a_un_role('maintenance'));

-- La maintenance consulte le stock des pièces détachées et leurs mouvements (coûts).
create policy articles_lecture_maintenance on public.articles for select to authenticated using (public.a_role('maintenance'));
create policy stocks_articles_lecture_maintenance on public.stocks_articles for select to authenticated using (public.a_role('maintenance'));
create policy mouvements_lecture_maintenance on public.mouvements_stock for select to authenticated
  using (public.a_role('maintenance') and document_type = 'intervention');

select public.activer_audit('public.equipements');
select public.activer_audit('public.equipement_pieces');
select public.activer_audit('public.plans_preventifs');
select public.activer_audit('public.interventions');
select public.activer_audit('public.intervention_pieces');
