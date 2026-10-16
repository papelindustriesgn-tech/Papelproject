-- =============================================================================
-- Phase 2 – étape 2 : Logistique et livraison
-- Véhicules, chauffeurs, tournées, chargement, preuve de livraison (signature, photo, GPS),
-- retours (refus total ou partiel → retour en stock), dépenses de tournée.
-- Les bons de livraison (BL) existent depuis l'étape 4 (ventes) : une tournée regroupe des BL validés.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Listes modifiables
-- -----------------------------------------------------------------------------
create table public.vehicules (
  id               uuid primary key default gen_random_uuid(),
  immatriculation  text not null unique check (length(trim(immatriculation)) > 0),
  libelle          text not null default '',
  type_vehicule    text not null default '',
  capacite_colis   integer check (capacite_colis is null or capacite_colis > 0),
  actif            boolean not null default true,
  notes            text not null default '',
  created_at       timestamptz not null default now()
);
comment on table public.vehicules is 'Véhicules de livraison (liste modifiable). Capacité en colis : contrôle du chargement.';

create table public.chauffeurs (
  id          uuid primary key default gen_random_uuid(),
  nom         text not null check (length(trim(nom)) > 0),
  telephone   text not null default '',
  permis      text not null default '',
  -- Compte de connexion du chauffeur (facultatif) : il retrouve « ses » tournées.
  profil_id   uuid unique references public.profils (id),
  actif       boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.types_depenses_tournee (
  id       uuid primary key default gen_random_uuid(),
  libelle  text not null unique check (length(trim(libelle)) > 0),
  ordre    integer not null default 0,
  actif    boolean not null default true
);

-- -----------------------------------------------------------------------------
-- Tournées
-- -----------------------------------------------------------------------------
create table public.tournees_livraison (
  id             uuid primary key default gen_random_uuid(),
  numero         text unique,
  date_tournee   date not null default public.aujourdhui_conakry(),
  vehicule_id    uuid not null references public.vehicules (id),
  chauffeur_id   uuid not null references public.chauffeurs (id),
  statut         text not null default 'planifiee' check (statut in ('planifiee', 'en_cours', 'terminee', 'annulee')),
  depart_le      timestamptz,
  retour_le      timestamptz,
  km_depart      integer check (km_depart is null or km_depart >= 0),
  km_retour      integer check (km_retour is null or km_retour >= 0),
  notes          text not null default '',
  created_by     uuid references public.profils (id) default auth.uid(),
  created_at     timestamptz not null default now(),
  check (km_retour is null or km_depart is null or km_retour >= km_depart)
);
create index tournees_livraison_date_idx on public.tournees_livraison (date_tournee desc);

create or replace function public.numeroter_tournee() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.numero := public.prochain_numero('TL-' || to_char(new.date_tournee, 'YYYY') || '-');
  return new;
end $$;
create trigger tournee_numero before insert on public.tournees_livraison for each row execute function public.numeroter_tournee();

create table public.depenses_tournee (
  id            uuid primary key default gen_random_uuid(),
  tournee_id    uuid not null references public.tournees_livraison (id) on delete cascade,
  type_id       uuid not null references public.types_depenses_tournee (id),
  montant_gnf   bigint not null check (montant_gnf > 0),
  reference     text not null default '',
  created_at    timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Bons de livraison : rattachement à une tournée et preuve de remise
-- -----------------------------------------------------------------------------
alter table public.livraisons
  add column tournee_id          uuid references public.tournees_livraison (id),
  add column ordre               integer not null default 0,
  add column statut_remise       text not null default 'a_livrer' check (statut_remise in ('a_livrer', 'livree', 'partielle', 'refusee')),
  add column remise_le           timestamptz,
  add column remis_par           uuid references public.profils (id),
  add column receptionnaire      text not null default '',
  add column signature_chemin    text,
  add column photo_chemin        text,
  add column latitude            double precision,
  add column longitude           double precision,
  add column precision_m         numeric(8, 1),
  add column commentaire_remise  text not null default '';
create index livraisons_tournee_idx on public.livraisons (tournee_id);

-- Paquets rapportés à l'usine (refus total ou partiel du client).
alter table public.lignes_livraison add column paquets_retournes integer not null default 0;
alter table public.lignes_livraison add constraint lignes_livraison_retour_ck check (paquets_retournes between 0 and paquets);

-- Reste à livrer : les paquets rapportés restent à livrer.
create or replace view public.reste_a_livrer with (security_invoker = true) as
select l.piece_id as commande_id, l.conditionnement_id,
       sum(l.paquets) - coalesce((select sum(ll.paquets - ll.paquets_retournes) from public.lignes_livraison ll join public.livraisons lv on lv.id = ll.livraison_id
                                   where lv.commande_id = l.piece_id and lv.statut = 'validee' and ll.conditionnement_id = l.conditionnement_id), 0) as paquets_restants,
       sum(l.paquets) as paquets_commandes
from public.lignes_piece l
group by l.piece_id, l.conditionnement_id;

-- -----------------------------------------------------------------------------
-- Opérations (fonctions atomiques ; rôle logistique, ou Direction)
-- -----------------------------------------------------------------------------
create or replace function public.exiger_logistique() returns void language plpgsql stable set search_path = '' as $$
begin
  if not public.a_un_role('logistique') then
    raise exception 'Vous n''avez pas les droits sur les tournées.' using errcode = '42501';
  end if;
end $$;

-- Ajoute un BL validé, non encore livré, à une tournée planifiée (contrôle de la capacité du véhicule).
create or replace function public.affecter_livraison(p_tournee uuid, p_livraison uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_t public.tournees_livraison%rowtype;
  v_l public.livraisons%rowtype;
  v_capacite integer;
  v_colis numeric;
begin
  perform public.exiger_logistique();
  select * into v_t from public.tournees_livraison where id = p_tournee for update;
  if v_t.statut <> 'planifiee' then raise exception 'On ne modifie le chargement que d''une tournée planifiée.' using errcode = '22023'; end if;
  select * into v_l from public.livraisons where id = p_livraison for update;
  if v_l.statut <> 'validee' then raise exception 'Seul un bon de livraison validé peut partir en tournée.' using errcode = '22023'; end if;
  if v_l.tournee_id is not null and v_l.tournee_id <> p_tournee then
    raise exception 'Ce bon de livraison est déjà dans une autre tournée.' using errcode = '22023';
  end if;
  if v_l.statut_remise <> 'a_livrer' then raise exception 'Ce bon de livraison a déjà été remis.' using errcode = '22023'; end if;
  update public.livraisons set tournee_id = p_tournee,
         ordre = coalesce((select max(ordre) from public.livraisons where tournee_id = p_tournee), 0) + 1
   where id = p_livraison;
  -- Capacité : colis (paquets ÷ paquets du conditionnement) de toute la tournée.
  select v.capacite_colis into v_capacite from public.vehicules v where v.id = v_t.vehicule_id;
  if v_capacite is not null then
    select coalesce(sum(ll.paquets::numeric / c.paquets_par_colis), 0) into v_colis
    from public.livraisons lv join public.lignes_livraison ll on ll.livraison_id = lv.id
    join public.conditionnements c on c.id = ll.conditionnement_id
    where lv.tournee_id = p_tournee;
    if v_colis > v_capacite then
      raise exception 'Capacité du véhicule dépassée : % colis pour % au maximum.', public.nombre_fr(ceil(v_colis)), public.nombre_fr(v_capacite) using errcode = '22023';
    end if;
  end if;
end $$;

create or replace function public.retirer_livraison(p_livraison uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.exiger_logistique();
  update public.livraisons lv set tournee_id = null, ordre = 0
   where lv.id = p_livraison and lv.statut_remise = 'a_livrer'
     and exists (select 1 from public.tournees_livraison t where t.id = lv.tournee_id and t.statut = 'planifiee');
  if not found then raise exception 'On ne retire un bon que d''une tournée planifiée.' using errcode = '22023'; end if;
end $$;

-- Départ : chargement terminé, compteur kilométrique relevé.
create or replace function public.demarrer_tournee(p_tournee uuid, p_km integer)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.exiger_logistique();
  if not exists (select 1 from public.livraisons where tournee_id = p_tournee) then
    raise exception 'Ajoutez au moins un bon de livraison avant le départ.' using errcode = '22023';
  end if;
  update public.tournees_livraison set statut = 'en_cours', depart_le = now(), km_depart = p_km
   where id = p_tournee and statut = 'planifiee';
  if not found then raise exception 'Seule une tournée planifiée peut démarrer.' using errcode = '22023'; end if;
end $$;

-- Remise chez le client : preuve (réceptionnaire, signature, photo, position) et retours éventuels.
-- p_retours : [{"ligne_id": "...", "paquets": 10}, …] pour une livraison partielle ; refus = tout revient.
create or replace function public.enregistrer_remise(
  p_livraison uuid, p_statut text, p_receptionnaire text,
  p_signature text default null, p_photo text default null,
  p_latitude double precision default null, p_longitude double precision default null, p_precision numeric default null,
  p_commentaire text default '', p_retours jsonb default '[]'::jsonb
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_l public.livraisons%rowtype;
  v_r jsonb;
  v_nb integer;
begin
  perform public.exiger_logistique();
  if p_statut not in ('livree', 'partielle', 'refusee') then raise exception 'Statut de remise invalide.' using errcode = '22023'; end if;
  select * into v_l from public.livraisons where id = p_livraison for update;
  if v_l.tournee_id is null or not exists (select 1 from public.tournees_livraison where id = v_l.tournee_id and statut = 'en_cours') then
    raise exception 'La remise se saisit pendant une tournée en cours.' using errcode = '22023';
  end if;
  if v_l.statut_remise <> 'a_livrer' then raise exception 'Remise déjà enregistrée pour ce bon.' using errcode = '22023'; end if;
  if p_statut <> 'refusee' and length(trim(coalesce(p_receptionnaire, ''))) = 0 then
    raise exception 'Indiquez le nom de la personne qui a réceptionné.' using errcode = '22023';
  end if;
  if p_statut <> 'refusee' and p_signature is null then
    raise exception 'La signature du client est obligatoire.' using errcode = '22023';
  end if;
  if p_statut = 'refusee' and length(trim(coalesce(p_commentaire, ''))) = 0 then
    raise exception 'Indiquez le motif du refus.' using errcode = '22023';
  end if;

  if p_statut = 'refusee' then
    update public.lignes_livraison set paquets_retournes = paquets where livraison_id = p_livraison;
  elsif p_statut = 'partielle' then
    for v_r in select * from jsonb_array_elements(p_retours) loop
      update public.lignes_livraison set paquets_retournes = (v_r ->> 'paquets')::integer
       where id = (v_r ->> 'ligne_id')::uuid and livraison_id = p_livraison;
    end loop;
    select count(*) into v_nb from public.lignes_livraison where livraison_id = p_livraison and paquets_retournes > 0;
    if v_nb = 0 then raise exception 'Livraison partielle : indiquez les paquets rapportés.' using errcode = '22023'; end if;
  end if;

  -- Retour en stock des paquets rapportés.
  insert into public.mouvements_stock (type, article_id, quantite, unite, motif, document_type, document_id, auteur_id)
  select 'retour', a.id, ll.paquets_retournes, 'paquet', 'Retour de livraison ' || v_l.numero, 'livraison', p_livraison, auth.uid()
  from public.lignes_livraison ll join public.articles a on a.conditionnement_id = ll.conditionnement_id
  where ll.livraison_id = p_livraison and ll.paquets_retournes > 0;

  update public.livraisons set statut_remise = p_statut, remise_le = now(), remis_par = auth.uid(),
         receptionnaire = trim(coalesce(p_receptionnaire, '')), signature_chemin = p_signature, photo_chemin = p_photo,
         latitude = p_latitude, longitude = p_longitude, precision_m = p_precision, commentaire_remise = coalesce(p_commentaire, '')
   where id = p_livraison;
end $$;

-- Retour à l'usine : toutes les remises saisies, compteur relevé.
create or replace function public.terminer_tournee(p_tournee uuid, p_km integer)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_t public.tournees_livraison%rowtype;
begin
  perform public.exiger_logistique();
  select * into v_t from public.tournees_livraison where id = p_tournee for update;
  if v_t.statut <> 'en_cours' then raise exception 'Seule une tournée en cours peut être terminée.' using errcode = '22023'; end if;
  if exists (select 1 from public.livraisons where tournee_id = p_tournee and statut_remise = 'a_livrer') then
    raise exception 'Saisissez la remise (livrée, partielle ou refusée) de chaque bon avant de clôturer.' using errcode = '22023';
  end if;
  if p_km is not null and v_t.km_depart is not null and p_km < v_t.km_depart then
    raise exception 'Le kilométrage de retour (%) est inférieur à celui du départ (%).', public.nombre_fr(p_km), public.nombre_fr(v_t.km_depart) using errcode = '22023';
  end if;
  update public.tournees_livraison set statut = 'terminee', retour_le = now(), km_retour = p_km where id = p_tournee;
end $$;

-- Un BL validé est figé pour les utilisateurs : tournée, remise et retours ne changent que par les fonctions ci-dessus
-- (qui s'exécutent avec les droits du propriétaire, d'où le test sur current_user).
create or replace function public.livraison_validee_figee() returns trigger language plpgsql set search_path = '' as $$
begin
  if old.statut = 'validee' and current_user in ('authenticated', 'anon') then
    raise exception 'Bon de livraison validé : modification impossible.' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger livraison_figee before update on public.livraisons for each row execute function public.livraison_validee_figee();

-- -----------------------------------------------------------------------------
-- Vue de synthèse des tournées
-- -----------------------------------------------------------------------------
create view public.tournees_livraison_etat with (security_invoker = true) as
select t.*, v.immatriculation, v.capacite_colis, ch.nom as chauffeur_nom, ch.profil_id as chauffeur_profil_id,
       (select count(*) from public.livraisons l where l.tournee_id = t.id) as nb_livraisons,
       (select count(*) from public.livraisons l where l.tournee_id = t.id and l.statut_remise <> 'a_livrer') as nb_remises,
       (select count(*) from public.livraisons l where l.tournee_id = t.id and l.statut_remise = 'livree') as nb_livrees,
       (select count(*) from public.livraisons l where l.tournee_id = t.id and l.statut_remise = 'partielle') as nb_partielles,
       (select count(*) from public.livraisons l where l.tournee_id = t.id and l.statut_remise = 'refusee') as nb_refusees,
       (select coalesce(sum(ll.paquets), 0) from public.livraisons l join public.lignes_livraison ll on ll.livraison_id = l.id where l.tournee_id = t.id)::bigint as paquets_charges,
       (select coalesce(sum(ll.paquets - ll.paquets_retournes), 0) from public.livraisons l join public.lignes_livraison ll on ll.livraison_id = l.id where l.tournee_id = t.id)::bigint as paquets_livres,
       (select coalesce(sum(floor(ll.paquets::numeric / c.paquets_par_colis)), 0) from public.livraisons l join public.lignes_livraison ll on ll.livraison_id = l.id
          join public.conditionnements c on c.id = ll.conditionnement_id where l.tournee_id = t.id)::bigint as colis_charges,
       (select coalesce(sum(floor((ll.paquets - ll.paquets_retournes)::numeric / c.paquets_par_colis)), 0) from public.livraisons l join public.lignes_livraison ll on ll.livraison_id = l.id
          join public.conditionnements c on c.id = ll.conditionnement_id where l.tournee_id = t.id)::bigint as colis_livres,
       (select coalesce(sum(d.montant_gnf), 0) from public.depenses_tournee d where d.tournee_id = t.id)::bigint as depenses_gnf,
       case when t.km_retour is not null and t.km_depart is not null then t.km_retour - t.km_depart end as km_parcourus
from public.tournees_livraison t
join public.vehicules v on v.id = t.vehicule_id
join public.chauffeurs ch on ch.id = t.chauffeur_id;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.vehicules enable row level security;
alter table public.chauffeurs enable row level security;
alter table public.types_depenses_tournee enable row level security;
alter table public.tournees_livraison enable row level security;
alter table public.depenses_tournee enable row level security;

create policy vehicules_lecture on public.vehicules for select to authenticated using (public.est_actif());
create policy vehicules_ecriture on public.vehicules for all to authenticated
  using (public.est_admin() or public.a_un_role('logistique')) with check (public.est_admin() or public.a_un_role('logistique'));
create policy chauffeurs_lecture on public.chauffeurs for select to authenticated using (public.est_actif());
create policy chauffeurs_ecriture on public.chauffeurs for all to authenticated
  using (public.est_admin() or public.a_un_role('logistique')) with check (public.est_admin() or public.a_un_role('logistique'));
create policy types_depenses_lecture on public.types_depenses_tournee for select to authenticated using (public.est_actif());
create policy types_depenses_ecriture on public.types_depenses_tournee for all to authenticated
  using (public.est_admin() or public.a_un_role('logistique')) with check (public.est_admin() or public.a_un_role('logistique'));

-- La logistique voit les comptes ayant le rôle logistique (rattachement d'un chauffeur à son compte).
create or replace function public.utilisateur_a_role(p_utilisateur uuid, p_role public.role_code)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.utilisateur_roles where utilisateur_id = p_utilisateur and role = p_role);
$$;
create policy profils_logistique on public.profils for select to authenticated
  using (public.a_un_role('logistique') and public.utilisateur_a_role(id, 'logistique'));

-- Tournées : la logistique gère ; ventes et magasin consultent (suivi des livraisons clients).
create policy tournees_lecture on public.tournees_livraison for select to authenticated
  using (public.a_un_role('logistique', 'finance', 'responsable_commercial', 'magasin'));
create policy tournees_ajout on public.tournees_livraison for insert to authenticated with check (public.a_un_role('logistique') and statut = 'planifiee');
-- Modification directe limitée aux tournées planifiées (véhicule, chauffeur, date, notes) ou à l'annulation ;
-- départ et clôture passent par les fonctions.
create policy tournees_modif on public.tournees_livraison for update to authenticated
  using (public.a_un_role('logistique') and statut = 'planifiee')
  with check (public.a_un_role('logistique') and statut in ('planifiee', 'annulee'));

create policy depenses_lecture on public.depenses_tournee for select to authenticated
  using (public.a_un_role('logistique', 'finance'));
create policy depenses_ecriture on public.depenses_tournee for all to authenticated
  using (public.a_un_role('logistique')) with check (public.a_un_role('logistique'));

-- Annuler une tournée libère ses bons de livraison.
create or replace function public.liberer_livraisons_tournee() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.statut = 'annulee' and old.statut <> 'annulee' then
    update public.livraisons set tournee_id = null, ordre = 0 where tournee_id = new.id and statut_remise = 'a_livrer';
  end if;
  return new;
end $$;
create trigger tournee_annulation after update of statut on public.tournees_livraison for each row execute function public.liberer_livraisons_tournee();

-- -----------------------------------------------------------------------------
-- Preuves de livraison : Storage privé « preuves-livraison/<livraison>/… »
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('preuves-livraison', 'preuves-livraison', false, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy preuves_ajout on storage.objects for insert to authenticated
  with check (bucket_id = 'preuves-livraison' and public.a_un_role('logistique'));
create policy preuves_lecture on storage.objects for select to authenticated
  using (bucket_id = 'preuves-livraison' and public.a_un_role('logistique', 'finance', 'responsable_commercial'));

revoke execute on function public.numeroter_tournee() from public, anon, authenticated;
revoke execute on function public.liberer_livraisons_tournee() from public, anon, authenticated;

select public.activer_audit('public.vehicules');
select public.activer_audit('public.chauffeurs');
select public.activer_audit('public.types_depenses_tournee');
select public.activer_audit('public.tournees_livraison');
select public.activer_audit('public.depenses_tournee');
