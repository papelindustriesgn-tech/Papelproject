-- =============================================================================
-- Application RH : employés et contrats, congés et absences, présences, paie mensuelle.
-- Listes modifiables dans l'interface (services, fonctions, types de contrat, types d'absence, jours fériés,
-- barème de l'impôt sur salaire) ; taux et seuils en paramètres (catégorie « rh »).
-- Le calcul des bulletins est fait par src/lib/metier/rh.ts (testé) ; la base fige une paie validée.
-- Les salaires sont confidentiels : RH et Direction ; la Finance lit les bulletins pour payer.
-- =============================================================================

insert into public.roles (code, libelle, description, ordre) values
  ('rh', 'Ressources humaines', 'Employés, congés, présences, paie', 12)
on conflict (code) do nothing;

-- Paramètres (valeurs de départ à valider avec le comptable selon la réglementation guinéenne en vigueur).
insert into public.parametres (cle, valeur, libelle, description, categorie, type_valeur, unite) values
  ('rh_conges_jours_par_mois', '2.5', 'Congés acquis par mois', 'Jours ouvrables de congé payé acquis par mois de travail effectif', 'rh', 'nombre', 'jours'),
  ('rh_jours_ouvrables_mois', '26', 'Jours ouvrables par mois', 'Base de calcul de la retenue pour absence non payée (salaire ÷ ce nombre de jours)', 'rh', 'nombre', 'jours'),
  ('rh_heures_mensuelles', '173.33', 'Heures mensuelles', 'Durée légale mensuelle : taux horaire = salaire de base ÷ ce nombre d''heures', 'rh', 'nombre', 'h'),
  ('rh_majoration_heures_sup', '0.3', 'Majoration des heures supplémentaires', 'Une heure supplémentaire est payée au taux horaire × (1 + cette majoration)', 'rh', 'pourcentage', null),
  ('cnss_taux_salarie', '0.05', 'CNSS – part salariale', 'Retenue sur le salaire brut, dans la limite du plafond (à valider avec le comptable)', 'rh', 'pourcentage', null),
  ('cnss_taux_employeur', '0.18', 'CNSS – part patronale', 'Charge de l''employeur, dans la limite du plafond (à valider avec le comptable)', 'rh', 'pourcentage', null),
  ('cnss_plafond_gnf', '2500000', 'CNSS – plafond mensuel', 'Salaire brut maximum soumis aux cotisations CNSS (à valider avec le comptable)', 'rh', 'entier', 'GNF'),
  ('rh_alerte_fin_contrat_jours', '30', 'Alerte fin de contrat', 'Un contrat qui se termine dans ce nombre de jours est signalé', 'rh', 'entier', 'jours')
on conflict (cle) do nothing;

-- -----------------------------------------------------------------------------
-- Listes modifiables
-- -----------------------------------------------------------------------------
create table public.departements (
  id      uuid primary key default gen_random_uuid(),
  libelle text not null unique check (length(trim(libelle)) between 1 and 60),
  ordre   integer not null default 0,
  actif   boolean not null default true
);
create table public.fonctions (
  id             uuid primary key default gen_random_uuid(),
  libelle        text not null unique check (length(trim(libelle)) between 1 and 80),
  departement_id uuid references public.departements (id),
  actif          boolean not null default true
);
create table public.types_contrats (
  id               uuid primary key default gen_random_uuid(),
  libelle          text not null unique check (length(trim(libelle)) between 1 and 60),
  duree_determinee boolean not null default false,
  ordre            integer not null default 0,
  actif            boolean not null default true
);
create table public.types_absences (
  id               uuid primary key default gen_random_uuid(),
  libelle          text not null unique check (length(trim(libelle)) between 1 and 60),
  -- Décompte du solde de congés payés (congé annuel).
  decompte_conges  boolean not null default false,
  -- Absence payée (maladie justifiée, permission…) ou retenue sur salaire.
  payee            boolean not null default true,
  ordre            integer not null default 0,
  actif            boolean not null default true
);
create table public.jours_feries (
  id      uuid primary key default gen_random_uuid(),
  jour    date not null unique,
  libelle text not null check (length(trim(libelle)) between 1 and 80)
);
-- Barème progressif de l'impôt sur salaire (RTS) : chaque tranche s'applique à partir de « de_gnf ».
create table public.tranches_rts (
  id     uuid primary key default gen_random_uuid(),
  de_gnf bigint not null unique check (de_gnf >= 0),
  taux   numeric(6,4) not null check (taux between 0 and 1)
);

-- -----------------------------------------------------------------------------
-- Employés
-- -----------------------------------------------------------------------------
create sequence public.employes_matricule_seq;
create table public.employes (
  id                uuid primary key default gen_random_uuid(),
  matricule         text unique,
  nom               text not null check (length(trim(nom)) between 1 and 60),
  prenom            text not null default '' check (length(prenom) <= 60),
  sexe              text check (sexe in ('F', 'M')),
  date_naissance    date,
  telephone         text not null default '',
  adresse           text not null default '',
  departement_id    uuid references public.departements (id),
  fonction_id       uuid references public.fonctions (id),
  type_contrat_id   uuid references public.types_contrats (id),
  date_embauche     date not null,
  date_fin_contrat  date,
  salaire_base_gnf  bigint not null default 0 check (salaire_base_gnf >= 0),
  numero_cnss       text not null default '',
  mode_paiement     text not null default 'especes' check (mode_paiement in ('especes', 'banque', 'mobile')),
  compte_paiement   text not null default '',
  profil_id         uuid unique references public.profils (id),
  actif             boolean not null default true,
  date_sortie       date,
  motif_sortie      text not null default '',
  notes             text not null default '',
  created_at        timestamptz not null default now(),
  check (date_fin_contrat is null or date_fin_contrat >= date_embauche),
  check (date_sortie is null or date_sortie >= date_embauche)
);
comment on table public.employes is 'Dossier du personnel (matricule EMP-NNNNN automatique).';

create or replace function public.employe_matricule()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.matricule is null or new.matricule = '' then
    new.matricule := 'EMP-' || lpad(nextval('public.employes_matricule_seq')::text, 5, '0');
  end if;
  -- Une sortie (date de sortie) rend l'employé inactif.
  if new.date_sortie is not null then new.actif := false; end if;
  return new;
end $$;
create trigger employes_matricule before insert or update on public.employes for each row execute function public.employe_matricule();

-- Jours ouvrables entre deux dates (lundi à samedi), jours fériés exclus.
create or replace function public.jours_ouvrables(p_du date, p_au date)
returns integer language sql stable set search_path = '' as $$
  select count(*)::integer
  from generate_series(p_du, p_au, interval '1 day') g(j)
  where extract(isodow from g.j) <> 7
    and not exists (select 1 from public.jours_feries f where f.jour = g.j::date);
$$;

-- -----------------------------------------------------------------------------
-- Congés et absences
-- -----------------------------------------------------------------------------
create table public.absences (
  id              uuid primary key default gen_random_uuid(),
  employe_id      uuid not null references public.employes (id),
  type_absence_id uuid not null references public.types_absences (id),
  du              date not null,
  au              date not null,
  nb_jours        integer not null default 0,
  motif           text not null default '' check (length(motif) <= 300),
  statut          text not null default 'demandee' check (statut in ('demandee', 'approuvee', 'refusee')),
  decide_par      uuid references public.profils (id),
  decide_le       timestamptz,
  created_by      uuid references public.profils (id) default auth.uid(),
  created_at      timestamptz not null default now(),
  check (au >= du)
);
create index absences_employe_idx on public.absences (employe_id, du);

create or replace function public.absence_controle()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_type public.types_absences;
  v_solde numeric;
  v_deja numeric := 0;
begin
  new.nb_jours := public.jours_ouvrables(new.du, new.au);
  if new.statut <> 'demandee' and (tg_op = 'INSERT' or old.statut = 'demandee') then
    new.decide_par := auth.uid();
    new.decide_le := now();
  end if;
  if tg_op = 'UPDATE' and old.statut <> 'demandee' and (new.du, new.au, new.type_absence_id, new.employe_id) is distinct from (old.du, old.au, old.type_absence_id, old.employe_id) then
    raise exception 'Une absence déjà décidée ne se modifie plus : refusez-la et créez-en une nouvelle.' using errcode = '22023';
  end if;
  -- Un congé payé approuvé ne peut pas dépasser le solde.
  select * into v_type from public.types_absences where id = new.type_absence_id;
  if new.statut = 'approuvee' and v_type.decompte_conges then
    select solde into v_solde from public.soldes_conges where employe_id = new.employe_id;
    -- Une absence déjà approuvée est déjà déduite du solde.
    if tg_op = 'UPDATE' and old.statut = 'approuvee' then v_deja := old.nb_jours; end if;
    if coalesce(v_solde, 0) + v_deja < new.nb_jours then
      raise exception 'Solde de congés insuffisant : % jour(s) disponible(s), % demandé(s).', public.nombre_fr(coalesce(v_solde, 0)), new.nb_jours using errcode = '22023';
    end if;
  end if;
  return new;
end $$;

-- -----------------------------------------------------------------------------
-- Présences (une ligne par employé et par jour)
-- -----------------------------------------------------------------------------
create table public.presences (
  employe_id  uuid not null references public.employes (id),
  jour        date not null,
  statut      text not null check (statut in ('present', 'retard', 'absent', 'conge', 'repos')),
  heures_sup  numeric(5,2) not null default 0 check (heures_sup between 0 and 24),
  note        text not null default '' check (length(note) <= 200),
  saisi_par   uuid references public.profils (id) default auth.uid(),
  saisi_le    timestamptz not null default now(),
  primary key (employe_id, jour)
);
create index presences_jour_idx on public.presences (jour);

-- -----------------------------------------------------------------------------
-- Paie
-- -----------------------------------------------------------------------------
create table public.periodes_paie (
  mois       date primary key check (extract(day from mois) = 1),
  statut     text not null default 'brouillon' check (statut in ('brouillon', 'validee')),
  valide_par uuid references public.profils (id),
  valide_le  timestamptz
);
create table public.bulletins (
  id                        uuid primary key default gen_random_uuid(),
  mois                      date not null references public.periodes_paie (mois),
  employe_id                uuid not null references public.employes (id),
  salaire_base_gnf          bigint not null check (salaire_base_gnf >= 0),
  primes_gnf                bigint not null default 0 check (primes_gnf >= 0),
  heures_sup                numeric(6,2) not null default 0 check (heures_sup >= 0),
  montant_heures_sup_gnf    bigint not null default 0,
  jours_absence_non_payee   numeric(5,1) not null default 0 check (jours_absence_non_payee >= 0),
  retenue_absences_gnf      bigint not null default 0,
  avances_gnf               bigint not null default 0 check (avances_gnf >= 0),
  brut_gnf                  bigint not null,
  cnss_salarie_gnf          bigint not null,
  cnss_employeur_gnf        bigint not null,
  rts_gnf                   bigint not null,
  net_gnf                   bigint not null,
  unique (mois, employe_id)
);
comment on table public.bulletins is 'Bulletins de paie ; montants calculés par src/lib/metier/rh.ts (calculerBulletin), figés à la validation de la période.';

create or replace function public.bulletin_fige()
returns trigger language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from public.periodes_paie where mois = coalesce(new.mois, old.mois) and statut = 'validee') then
    raise exception 'La paie de ce mois est validée : les bulletins ne se modifient plus.' using errcode = '22023';
  end if;
  return coalesce(new, old);
end $$;
create trigger bulletins_fige before insert or update or delete on public.bulletins for each row execute function public.bulletin_fige();

create or replace function public.valider_paie(p_mois date)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.a_un_role('rh') then
    raise exception 'Seuls les RH valident la paie.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.bulletins where mois = p_mois) then
    raise exception 'Aucun bulletin : préparez d''abord la paie du mois.' using errcode = '22023';
  end if;
  update public.periodes_paie set statut = 'validee', valide_par = auth.uid(), valide_le = now() where mois = p_mois and statut = 'brouillon';
  if not found then raise exception 'Paie introuvable ou déjà validée.' using errcode = '22023'; end if;
end $$;
revoke execute on function public.valider_paie(date) from public, anon;
grant execute on function public.valider_paie(date) to authenticated;

-- -----------------------------------------------------------------------------
-- Vues
-- -----------------------------------------------------------------------------
-- Solde de congés : jours acquis (mois complets depuis l'embauche × taux) − congés approuvés.
create view public.soldes_conges with (security_invoker = true) as
select e.id as employe_id,
       round(
         ((extract(year from age(coalesce(e.date_sortie, public.aujourdhui_conakry()), e.date_embauche)) * 12
           + extract(month from age(coalesce(e.date_sortie, public.aujourdhui_conakry()), e.date_embauche)))
          * coalesce((select (valeur #>> '{}')::numeric from public.parametres where cle = 'rh_conges_jours_par_mois'), 2.5))::numeric, 1) as acquis,
       coalesce((select sum(a.nb_jours) from public.absences a join public.types_absences t on t.id = a.type_absence_id
                 where a.employe_id = e.id and a.statut = 'approuvee' and t.decompte_conges), 0)::numeric as pris,
       round(
         ((extract(year from age(coalesce(e.date_sortie, public.aujourdhui_conakry()), e.date_embauche)) * 12
           + extract(month from age(coalesce(e.date_sortie, public.aujourdhui_conakry()), e.date_embauche)))
          * coalesce((select (valeur #>> '{}')::numeric from public.parametres where cle = 'rh_conges_jours_par_mois'), 2.5))::numeric, 1)
       - coalesce((select sum(a.nb_jours) from public.absences a join public.types_absences t on t.id = a.type_absence_id
                   where a.employe_id = e.id and a.statut = 'approuvee' and t.decompte_conges), 0)::numeric as solde
from public.employes e;

create trigger absences_controle before insert or update on public.absences for each row execute function public.absence_controle();

-- -----------------------------------------------------------------------------
-- Droits : RH (et Direction) gèrent ; la Finance lit les employés et les bulletins pour payer.
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['departements', 'fonctions', 'types_contrats', 'types_absences', 'jours_feries', 'tranches_rts'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.est_actif())', t || '_lecture', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.a_un_role(''rh'')) with check (public.a_un_role(''rh''))', t || '_gestion', t);
    execute format('select public.activer_audit(''public.%I'')', t);
  end loop;
end $$;

alter table public.employes enable row level security;
create policy employes_lecture on public.employes for select to authenticated using (public.a_un_role('rh', 'finance'));
create policy employes_gestion on public.employes for all to authenticated using (public.a_un_role('rh')) with check (public.a_un_role('rh'));

alter table public.absences enable row level security;
create policy absences_lecture on public.absences for select to authenticated using (public.a_un_role('rh'));
create policy absences_gestion on public.absences for all to authenticated using (public.a_un_role('rh')) with check (public.a_un_role('rh'));

alter table public.presences enable row level security;
create policy presences_lecture on public.presences for select to authenticated using (public.a_un_role('rh'));
create policy presences_gestion on public.presences for all to authenticated using (public.a_un_role('rh')) with check (public.a_un_role('rh'));

alter table public.periodes_paie enable row level security;
create policy periodes_paie_lecture on public.periodes_paie for select to authenticated using (public.a_un_role('rh', 'finance'));
create policy periodes_paie_ajout on public.periodes_paie for insert to authenticated with check (public.a_un_role('rh') and statut = 'brouillon');

alter table public.bulletins enable row level security;
create policy bulletins_lecture on public.bulletins for select to authenticated using (public.a_un_role('rh', 'finance'));
create policy bulletins_gestion on public.bulletins for all to authenticated using (public.a_un_role('rh')) with check (public.a_un_role('rh'));

select public.activer_audit('public.employes');
select public.activer_audit('public.absences');
select public.activer_audit('public.presences', 'employe_id');
select public.activer_audit('public.periodes_paie', 'mois');
select public.activer_audit('public.bulletins');

-- -----------------------------------------------------------------------------
-- Configuration de départ (modifiable dans l'interface)
-- -----------------------------------------------------------------------------
insert into public.departements (libelle, ordre) values
  ('Direction', 1), ('Production', 2), ('Magasin', 3), ('Maintenance', 4), ('Qualité', 5),
  ('Commercial', 6), ('Logistique', 7), ('Finance et administration', 8)
on conflict (libelle) do nothing;
insert into public.types_contrats (libelle, duree_determinee, ordre) values
  ('CDI', false, 1), ('CDD', true, 2), ('Journalier', true, 3), ('Stagiaire', true, 4)
on conflict (libelle) do nothing;
insert into public.types_absences (libelle, decompte_conges, payee, ordre) values
  ('Congé annuel', true, true, 1), ('Maladie (justifiée)', false, true, 2), ('Permission exceptionnelle', false, true, 3),
  ('Absence non payée', false, false, 4), ('Absence injustifiée', false, false, 5)
on conflict (libelle) do nothing;
-- Barème de départ de l'impôt sur salaire : À VALIDER avec le comptable (modifiable dans RH › Configuration).
insert into public.tranches_rts (de_gnf, taux) values
  (0, 0), (1000001, 0.05), (3000001, 0.08), (5000001, 0.10), (10000001, 0.15), (20000001, 0.20)
on conflict (de_gnf) do nothing;

-- Entrée de l'application RH (réglable par l'administrateur).
insert into public.accueil_espaces (espace, promesse) values
  ('rh', 'Suivre le personnel : contrats, présences, congés et paie du mois, au même endroit.')
on conflict (espace) do nothing;
insert into public.accueil_elements (espace, genre, libelle, description, ecran, icone, indicateur, urgent, ordre) values
  ('rh', 'action', 'Feuille de présence du jour', 'Qui est là aujourd''hui', '/rh/presences', 'fiche', null, false, 1),
  ('rh', 'action', 'Nouvel employé', 'Créer le dossier', '/rh/employes/nouveau', 'client', null, false, 2),
  ('rh', 'action', 'Demande de congé', 'Congé, maladie, permission', '/rh/absences', 'calendrier', null, false, 3),
  ('rh', 'action', 'Paie du mois', 'Préparer et valider', '/rh/paie', 'argent', null, false, 4),
  ('rh', 'etape', 'Embaucher', '', '/rh/employes/nouveau', '', null, false, 1),
  ('rh', 'etape', 'Pointer chaque jour', '', '/rh/presences', '', null, false, 2),
  ('rh', 'etape', 'Valider les congés', '', '/rh/absences', '', null, false, 3),
  ('rh', 'etape', 'Faire la paie', '', '/rh/paie', '', null, false, 4),
  ('rh', 'tache', 'Demande(s) de congé à décider', '', '/rh/absences?statut=demandee', '', 'absences_a_decider', true, 1),
  ('rh', 'tache', 'Feuille de présence du jour à remplir', '', '/rh/presences', '', 'presences_non_saisies', true, 2),
  ('rh', 'tache', 'Contrat(s) qui se terminent bientôt', '', '/rh/employes?contrat=echeance', '', 'contrats_echeance', false, 3),
  ('rh', 'tache', 'Paie du mois dernier à valider', '', '/rh/paie', '', 'paie_a_valider', false, 4);
