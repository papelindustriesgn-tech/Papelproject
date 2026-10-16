-- =============================================================================
-- Phase 2 – étape 3 : Qualité (QHSE)
-- Critères de contrôle (modifiables), contrôles à réception (bobines), en production et sur produits finis,
-- non-conformités (NC) et actions correctives, traçabilité lot MP → lot produit fini (fiche) → clients.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Lot de produits finis = fiche de production (jour × poste × ligne) : code imprimable sur les colis.
-- -----------------------------------------------------------------------------
alter table public.fiches_production add column code_lot text unique;

create or replace function public.code_lot_fiche() returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_prefixe text := 'PF' || to_char(new.date_production, 'YYMMDD') || '-';
begin
  if tg_op = 'INSERT' or new.date_production is distinct from old.date_production then
    new.code_lot := v_prefixe || (
      select coalesce(max(split_part(code_lot, '-', 2)::int), 0) + 1
      from public.fiches_production where code_lot like v_prefixe || '%' and id <> new.id);
  end if;
  return new;
end $$;
create trigger fiche_code_lot before insert or update of date_production on public.fiches_production
  for each row execute function public.code_lot_fiche();
revoke execute on function public.code_lot_fiche() from public, anon, authenticated;

-- Fiches déjà saisies : code attribué dans l'ordre chronologique (les fiches validées sont figées : on suspend ce contrôle le temps de la reprise).
alter table public.fiches_production disable trigger fiche_figee;
update public.fiches_production f set code_lot = 'PF' || to_char(f.date_production, 'YYMMDD') || '-' || x.rang
from (select id, row_number() over (partition by date_production order by created_at, id) as rang from public.fiches_production) x
where x.id = f.id;
alter table public.fiches_production enable trigger fiche_figee;

-- -----------------------------------------------------------------------------
-- Listes modifiables
-- -----------------------------------------------------------------------------
create table public.criteres_qualite (
  id           uuid primary key default gen_random_uuid(),
  libelle      text not null check (length(trim(libelle)) > 0),
  -- Étape du contrôle (code qui pilote l'écran) : réception de bobines, en cours de production, produit fini.
  etape        text not null check (etape in ('reception', 'production', 'produit_fini')),
  -- « mesure » : valeur numérique comparée aux tolérances ; « visuel » : conforme / non conforme.
  type_mesure  text not null default 'mesure' check (type_mesure in ('mesure', 'visuel')),
  unite        text not null default '',
  valeur_min   numeric(12, 3),
  valeur_max   numeric(12, 3),
  ordre        integer not null default 0,
  actif        boolean not null default true,
  unique (etape, libelle),
  check (valeur_min is null or valeur_max is null or valeur_min <= valeur_max)
);

create table public.types_non_conformite (
  id       uuid primary key default gen_random_uuid(),
  libelle  text not null unique check (length(trim(libelle)) > 0),
  ordre    integer not null default 0,
  actif    boolean not null default true
);

-- -----------------------------------------------------------------------------
-- Contrôles
-- -----------------------------------------------------------------------------
create table public.controles_qualite (
  id             uuid primary key default gen_random_uuid(),
  etape          text not null check (etape in ('reception', 'production', 'produit_fini')),
  date_controle  date not null default public.aujourdhui_conakry(),
  lot_id         uuid references public.lots (id),
  fiche_id       uuid references public.fiches_production (id),
  statut         text not null default 'brouillon' check (statut in ('brouillon', 'valide')),
  resultat       text check (resultat in ('conforme', 'non_conforme')),
  notes          text not null default '',
  controleur_id  uuid references public.profils (id) default auth.uid(),
  valide_le      timestamptz,
  created_at     timestamptz not null default now(),
  -- Réception : sur une bobine ; production et produit fini : sur une fiche (lot de produits finis).
  check ((etape = 'reception' and lot_id is not null and fiche_id is null) or (etape <> 'reception' and fiche_id is not null and lot_id is null))
);
create index controles_date_idx on public.controles_qualite (date_controle desc);

create table public.mesures_controle (
  id           uuid primary key default gen_random_uuid(),
  controle_id  uuid not null references public.controles_qualite (id) on delete cascade,
  critere_id   uuid not null references public.criteres_qualite (id),
  valeur       numeric(12, 3),
  conforme     boolean not null,
  commentaire  text not null default '',
  unique (controle_id, critere_id)
);

-- Conformité d'une mesure calculée par la base à partir des tolérances du critère.
create or replace function public.mesure_conformite() returns trigger language plpgsql set search_path = '' as $$
declare
  v_c public.criteres_qualite%rowtype;
begin
  select * into v_c from public.criteres_qualite where id = new.critere_id;
  if v_c.type_mesure = 'mesure' then
    if new.valeur is null then raise exception 'Saisissez la valeur mesurée pour « % ».', v_c.libelle using errcode = '22023'; end if;
    new.conforme := (v_c.valeur_min is null or new.valeur >= v_c.valeur_min) and (v_c.valeur_max is null or new.valeur <= v_c.valeur_max);
  end if;
  return new;
end $$;
create trigger mesure_conformite before insert or update on public.mesures_controle for each row execute function public.mesure_conformite();

-- Un contrôle validé est figé.
create or replace function public.controle_figee() returns trigger language plpgsql set search_path = '' as $$
declare
  v_statut text;
begin
  select statut into v_statut from public.controles_qualite where id = coalesce(new.controle_id, old.controle_id);
  if v_statut = 'valide' then raise exception 'Contrôle validé : modification impossible.' using errcode = '42501'; end if;
  return coalesce(new, old);
end $$;
create trigger mesure_figee before insert or update or delete on public.mesures_controle for each row execute function public.controle_figee();

-- -----------------------------------------------------------------------------
-- Non-conformités et actions correctives
-- -----------------------------------------------------------------------------
create table public.non_conformites (
  id             uuid primary key default gen_random_uuid(),
  numero         text unique,
  date_constat   date not null default public.aujourdhui_conakry(),
  origine        text not null check (origine in ('reception', 'production', 'client', 'interne')),
  type_id        uuid references public.types_non_conformite (id),
  gravite        text not null default 'majeure' check (gravite in ('mineure', 'majeure', 'critique')),
  description    text not null check (length(trim(description)) > 0),
  lot_id         uuid references public.lots (id),
  fiche_id       uuid references public.fiches_production (id),
  client_id      uuid references public.clients (id),
  livraison_id   uuid references public.livraisons (id),
  controle_id    uuid references public.controles_qualite (id),
  cause_racine   text not null default '',
  statut         text not null default 'ouverte' check (statut in ('ouverte', 'en_traitement', 'cloturee')),
  cloturee_le    timestamptz,
  cloturee_par   uuid references public.profils (id),
  created_by     uuid references public.profils (id) default auth.uid(),
  created_at     timestamptz not null default now()
);
create index nc_statut_idx on public.non_conformites (statut, date_constat desc);

create or replace function public.numeroter_nc() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.numero := public.prochain_numero('NC-' || to_char(new.date_constat, 'YYYY') || '-');
  return new;
end $$;
create trigger nc_numero before insert on public.non_conformites for each row execute function public.numeroter_nc();
revoke execute on function public.numeroter_nc() from public, anon, authenticated;

create table public.actions_correctives (
  id           uuid primary key default gen_random_uuid(),
  nc_id        uuid not null references public.non_conformites (id) on delete cascade,
  description  text not null check (length(trim(description)) > 0),
  responsable  text not null default '',
  echeance     date,
  realisee_le  date,
  efficace     boolean,
  commentaire  text not null default '',
  created_at   timestamptz not null default now()
);

-- NC clôturée = figée (actions comprises).
create or replace function public.nc_figee() returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_table_name = 'non_conformites' then
    if old.statut = 'cloturee' and current_user in ('authenticated', 'anon') then
      raise exception 'Non-conformité clôturée : modification impossible.' using errcode = '42501';
    end if;
  elsif exists (select 1 from public.non_conformites where id = coalesce(new.nc_id, old.nc_id) and statut = 'cloturee') then
    raise exception 'Non-conformité clôturée : modification impossible.' using errcode = '42501';
  end if;
  return coalesce(new, old);
end $$;
create trigger nc_figee before update on public.non_conformites for each row execute function public.nc_figee();
create trigger action_nc_figee before insert or update or delete on public.actions_correctives for each row execute function public.nc_figee();

-- -----------------------------------------------------------------------------
-- Opérations
-- -----------------------------------------------------------------------------
-- Validation d'un contrôle : résultat global ; si non conforme, NC créée et bobine bloquée (elle ne peut plus sortir du stock).
create or replace function public.valider_controle(p_controle uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_c public.controles_qualite%rowtype;
  v_nb integer;
  v_nc integer;
  v_numero text;
  v_detail text;
begin
  if not public.a_un_role('qualite') then
    raise exception 'Seule la qualité valide un contrôle.' using errcode = '42501';
  end if;
  select * into v_c from public.controles_qualite where id = p_controle for update;
  if v_c.statut <> 'brouillon' then raise exception 'Contrôle déjà validé.' using errcode = '22023'; end if;
  select count(*), count(*) filter (where not conforme) into v_nb, v_nc from public.mesures_controle where controle_id = p_controle;
  if v_nb = 0 then raise exception 'Saisissez au moins une mesure avant de valider.' using errcode = '22023'; end if;

  update public.controles_qualite set statut = 'valide', resultat = case when v_nc = 0 then 'conforme' else 'non_conforme' end,
         valide_le = now() where id = p_controle;
  if v_nc = 0 then return null; end if;

  select string_agg(cr.libelle || coalesce(' = ' || public.nombre_fr(m.valeur) || case when cr.unite <> '' then ' ' || cr.unite else '' end, ''), ', ' order by cr.ordre)
    into v_detail
  from public.mesures_controle m join public.criteres_qualite cr on cr.id = m.critere_id
  where m.controle_id = p_controle and not m.conforme;

  insert into public.non_conformites (date_constat, origine, gravite, description, lot_id, fiche_id, controle_id)
  values (v_c.date_controle, case when v_c.etape = 'reception' then 'reception' else 'production' end, 'majeure',
          'Contrôle non conforme : ' || v_detail, v_c.lot_id, v_c.fiche_id, p_controle)
  returning numero into v_numero;
  if v_c.lot_id is not null then
    update public.lots set statut = 'bloque' where id = v_c.lot_id and statut = 'disponible';
  end if;
  return v_numero;
end $$;

-- Décision qualité sur une bobine : bloquer (quarantaine) ou libérer.
create or replace function public.decider_lot(p_lot uuid, p_bloquer boolean, p_motif text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.a_un_role('qualite') then
    raise exception 'Seule la qualité décide du blocage ou de la libération d''une bobine.' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_motif, ''))) = 0 then raise exception 'Indiquez le motif de la décision.' using errcode = '22023'; end if;
  update public.lots set statut = case when p_bloquer then 'bloque' else 'disponible' end::public.statut_lot,
         notes = trim(both from notes || E'\n' || to_char(public.aujourdhui_conakry(), 'DD/MM/YYYY') || ' – qualité : ' || case when p_bloquer then 'bloquée' else 'libérée' end || ' (' || trim(p_motif) || ')')
   where id = p_lot and statut <> 'epuise';
  if not found then raise exception 'Bobine introuvable ou épuisée.' using errcode = '22023'; end if;
end $$;

-- Clôture : cause racine identifiée et toutes les actions réalisées.
create or replace function public.cloturer_nc(p_nc uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_nc public.non_conformites%rowtype;
begin
  if not public.a_un_role('qualite') then raise exception 'Seule la qualité clôture une non-conformité.' using errcode = '42501'; end if;
  select * into v_nc from public.non_conformites where id = p_nc for update;
  if v_nc.statut = 'cloturee' then raise exception 'Non-conformité déjà clôturée.' using errcode = '22023'; end if;
  if length(trim(v_nc.cause_racine)) = 0 then raise exception 'Renseignez la cause racine avant de clôturer.' using errcode = '22023'; end if;
  if not exists (select 1 from public.actions_correctives where nc_id = p_nc) then
    raise exception 'Ajoutez au moins une action corrective avant de clôturer.' using errcode = '22023';
  end if;
  if exists (select 1 from public.actions_correctives where nc_id = p_nc and realisee_le is null) then
    raise exception 'Toutes les actions correctives doivent être réalisées avant la clôture.' using errcode = '22023';
  end if;
  update public.non_conformites set statut = 'cloturee', cloturee_le = now(), cloturee_par = auth.uid() where id = p_nc;
end $$;

-- -----------------------------------------------------------------------------
-- Traçabilité
-- -----------------------------------------------------------------------------
-- Bobine → fiches (lots de produits finis) qui l'ont consommée.
create view public.tracabilite_bobines with (security_invoker = true) as
select fc.lot_id, f.id as fiche_id, f.code_lot, f.date_production, f.statut as statut_fiche,
       p.libelle as poste, lp.libelle as ligne, sum(fc.quantite) as kg_consommes
from public.fiche_consommations fc
join public.fiches_production f on f.id = fc.fiche_id
join public.postes p on p.id = f.poste_id
join public.lignes_production lp on lp.id = f.ligne_id
where fc.lot_id is not null
group by fc.lot_id, f.id, f.code_lot, f.date_production, f.statut, p.libelle, lp.libelle;

-- Lot de produits finis → livraisons susceptibles de le contenir : même conditionnement, livrées
-- entre la date de production et N jours après (paramètre tracabilite_fenetre_jours). Estimation :
-- les ventes ne suivent pas les lots (sortie au premier produit, premier sorti).
create or replace function public.tracer_fiche(p_fiche uuid)
returns table (livraison_id uuid, numero text, date_livraison date, client_id uuid, client_nom text, conditionnement text, paquets bigint)
language sql stable set search_path = '' as $$
  select lv.id, lv.numero, lv.date_livraison, c.id, c.nom, pr.libelle || ' – ' || co.libelle, sum(ll.paquets - ll.paquets_retournes)::bigint
  from public.fiches_production f
  join public.fiche_productions fp on fp.fiche_id = f.id and fp.paquets > 0
  join public.lignes_livraison ll on ll.conditionnement_id = fp.conditionnement_id
  join public.livraisons lv on lv.id = ll.livraison_id and lv.statut = 'validee'
   and lv.date_livraison between f.date_production
       and f.date_production + coalesce((select (valeur #>> '{}')::int from public.parametres where cle = 'tracabilite_fenetre_jours'), 30)
  join public.pieces_vente pv on pv.id = lv.commande_id
  join public.clients c on c.id = pv.client_id
  join public.conditionnements co on co.id = ll.conditionnement_id
  join public.produits pr on pr.id = co.produit_id
  where f.id = p_fiche
  group by lv.id, lv.numero, lv.date_livraison, c.id, c.nom, pr.libelle, co.libelle
  order by lv.date_livraison, lv.numero;
$$;

-- Synthèse par contrôle.
create view public.controles_etat with (security_invoker = true) as
select c.*, l.numero_lot, f.code_lot,
       (select count(*) from public.mesures_controle m where m.controle_id = c.id) as nb_mesures,
       (select count(*) from public.mesures_controle m where m.controle_id = c.id and not m.conforme) as nb_non_conformes
from public.controles_qualite c
left join public.lots l on l.id = c.lot_id
left join public.fiches_production f on f.id = c.fiche_id;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.criteres_qualite enable row level security;
alter table public.types_non_conformite enable row level security;
alter table public.controles_qualite enable row level security;
alter table public.mesures_controle enable row level security;
alter table public.non_conformites enable row level security;
alter table public.actions_correctives enable row level security;

create policy criteres_lecture on public.criteres_qualite for select to authenticated using (public.est_actif());
create policy criteres_ecriture on public.criteres_qualite for all to authenticated
  using (public.est_admin() or public.a_un_role('qualite')) with check (public.est_admin() or public.a_un_role('qualite'));
create policy types_nc_lecture on public.types_non_conformite for select to authenticated using (public.est_actif());
create policy types_nc_ecriture on public.types_non_conformite for all to authenticated
  using (public.est_admin() or public.a_un_role('qualite')) with check (public.est_admin() or public.a_un_role('qualite'));

-- Contrôles : la qualité saisit ; production et magasin consultent.
create policy controles_lecture on public.controles_qualite for select to authenticated using (public.a_un_role('qualite', 'production', 'magasin'));
create policy controles_ajout on public.controles_qualite for insert to authenticated with check (public.a_un_role('qualite') and statut = 'brouillon');
create policy controles_modif on public.controles_qualite for update to authenticated
  using (public.a_un_role('qualite') and statut = 'brouillon') with check (public.a_un_role('qualite') and statut = 'brouillon');
create policy controles_suppr on public.controles_qualite for delete to authenticated using (public.a_un_role('qualite') and statut = 'brouillon');
create policy mesures_lecture on public.mesures_controle for select to authenticated
  using (exists (select 1 from public.controles_qualite c where c.id = controle_id));
create policy mesures_ecriture on public.mesures_controle for all to authenticated
  using (public.a_un_role('qualite')) with check (public.a_un_role('qualite'));

-- NC : déclarées par la qualité, la production, le magasin ou le commercial (réclamation client) ; traitées par la qualité.
create policy nc_lecture on public.non_conformites for select to authenticated
  using (public.a_un_role('qualite', 'production', 'magasin', 'responsable_commercial'));
create policy nc_ajout on public.non_conformites for insert to authenticated
  with check (public.a_un_role('qualite', 'production', 'magasin', 'responsable_commercial') and statut = 'ouverte');
create policy nc_modif on public.non_conformites for update to authenticated
  using (public.a_un_role('qualite')) with check (public.a_un_role('qualite') and statut <> 'cloturee');
create policy actions_lecture on public.actions_correctives for select to authenticated
  using (exists (select 1 from public.non_conformites n where n.id = nc_id));
create policy actions_ecriture on public.actions_correctives for all to authenticated
  using (public.a_un_role('qualite')) with check (public.a_un_role('qualite'));

-- La qualité consulte la production, les lots, les livraisons et les clients (traçabilité).
create policy fiches_lecture_qualite on public.fiches_production for select to authenticated using (public.a_role('qualite'));
create policy fiche_conso_lecture_qualite on public.fiche_consommations for select to authenticated using (public.a_role('qualite'));
create policy fiche_prod_lecture_qualite on public.fiche_productions for select to authenticated using (public.a_role('qualite'));
create policy lots_lecture_qualite on public.lots for select to authenticated using (public.a_role('qualite'));
create policy livraisons_lecture_qualite on public.livraisons for select to authenticated using (public.a_role('qualite'));
create policy lignes_livraison_lecture_qualite on public.lignes_livraison for select to authenticated using (public.a_role('qualite'));
create policy pieces_lecture_qualite on public.pieces_vente for select to authenticated using (public.a_role('qualite'));
create policy clients_lecture_qualite on public.clients for select to authenticated using (public.a_role('qualite'));

revoke execute on function public.mesure_conformite() from public, anon, authenticated;

select public.activer_audit('public.criteres_qualite');
select public.activer_audit('public.types_non_conformite');
select public.activer_audit('public.controles_qualite');
select public.activer_audit('public.mesures_controle');
select public.activer_audit('public.non_conformites');
select public.activer_audit('public.actions_correctives');
