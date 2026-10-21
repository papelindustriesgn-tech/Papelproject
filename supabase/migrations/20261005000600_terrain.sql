-- =============================================================================
-- Papel ERP — Migration 6 : commercial terrain (application hors ligne) et supervision
-- Points de vente (PVA) géolocalisés, visites avec check-in GPS contrôlé (PostGIS), photos,
-- prix et concurrence constatés, tournées, objectifs, séries de numérotation par commercial,
-- synchronisation idempotente des opérations saisies hors ligne.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Série de numérotation propre à chaque commercial (ex. « C01 ») : il peut numéroter
-- ses devis et factures hors ligne sans risque de doublon (FA-2026-C01-00012).
-- -----------------------------------------------------------------------------
alter table public.profils add column code_serie text unique check (code_serie ~ '^[A-Z0-9]{2,4}$');
comment on column public.profils.code_serie is 'Code de la série de numérotation des pièces créées hors ligne par ce commercial.';

-- -----------------------------------------------------------------------------
-- Liste modifiable : marques concurrentes
-- -----------------------------------------------------------------------------
create table public.marques_concurrentes (
  id         uuid primary key default gen_random_uuid(),
  libelle    text not null unique check (length(trim(libelle)) > 0),
  actif      boolean not null default true,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Points de vente (PVA). L'identifiant est généré sur le téléphone (création hors ligne).
-- -----------------------------------------------------------------------------
create table public.pva (
  id                    uuid primary key,
  nom                   text not null check (length(trim(nom)) > 0),
  type_client_id        uuid not null references public.types_clients (id),
  responsable           text not null default '',
  telephone             text not null default '',
  quartier_id           uuid references public.quartiers (id),
  repere                text not null default '',
  position              extensions.geography(Point, 4326),
  precision_m           numeric(8, 1),
  potentiel_colis_mois  integer check (potentiel_colis_mois >= 0),
  commercial_id         uuid not null references public.profils (id) default auth.uid(),
  client_id             uuid references public.clients (id),
  notes                 text not null default '',
  actif                 boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index pva_position_idx on public.pva using gist (position);
create index pva_commercial_idx on public.pva (commercial_id);
create trigger pva_updated_at before update on public.pva for each row execute function public.maj_updated_at();

create table public.pva_photos (
  id         uuid primary key,
  pva_id     uuid not null references public.pva (id),
  visite_id  uuid,
  chemin     text not null,
  auteur_id  uuid references public.profils (id) default auth.uid(),
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Visites (check-in GPS horodaté)
-- -----------------------------------------------------------------------------
create table public.visites (
  id                  uuid primary key,
  pva_id              uuid not null references public.pva (id),
  commercial_id       uuid not null references public.profils (id) default auth.uid(),
  -- Heure du check-in sur le téléphone (la visite peut être synchronisée plus tard).
  checkin_at          timestamptz not null,
  position            extensions.geography(Point, 4326),
  precision_m         numeric(8, 1),
  -- Calculés par la base : distance au PVA et validité du check-in.
  distance_m          numeric(10, 1),
  dans_zone           boolean,
  stock_papel_colis   integer check (stock_papel_colis >= 0),
  rupture             boolean not null default false,
  notes               text not null default '',
  synchronise_le      timestamptz not null default now()
);
create index visites_commercial_idx on public.visites (commercial_id, checkin_at desc);
create index visites_pva_idx on public.visites (pva_id, checkin_at desc);

create table public.visite_prix (
  visite_id  uuid not null references public.visites (id) on delete cascade,
  produit_id uuid not null references public.produits (id),
  prix_gnf   bigint not null check (prix_gnf > 0),
  primary key (visite_id, produit_id)
);
comment on table public.visite_prix is 'Prix de vente Papel constaté au point de vente (au paquet).';

create table public.visite_concurrence (
  id         uuid primary key default gen_random_uuid(),
  visite_id  uuid not null references public.visites (id) on delete cascade,
  marque_id  uuid not null references public.marques_concurrentes (id),
  produit    text not null default '',
  prix_gnf   bigint check (prix_gnf > 0)
);

-- Contrôle du check-in : distance au PVA (PostGIS) et précision GPS, selon les paramètres.
-- Un PVA créé sans position reçoit celle de sa première visite précise.
create or replace function public.controler_checkin()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_pva public.pva%rowtype;
  v_rayon numeric := public.parametre_num('gps_rayon_checkin_m', 100);
  v_precision_max numeric := public.parametre_num('gps_precision_max_m', 50);
begin
  select * into v_pva from public.pva where id = new.pva_id;
  if new.position is null then
    new.distance_m := null;
    new.dans_zone := false;
  elsif v_pva.position is null then
    if coalesce(new.precision_m, 9999) <= v_precision_max then
      update public.pva set position = new.position, precision_m = new.precision_m where id = new.pva_id;
      new.distance_m := 0;
      new.dans_zone := true;
    else
      new.dans_zone := false;
    end if;
  else
    new.distance_m := round(extensions.st_distance(v_pva.position, new.position)::numeric, 1);
    new.dans_zone := new.distance_m <= v_rayon and coalesce(new.precision_m, 9999) <= v_precision_max;
  end if;
  return new;
end $$;
create trigger visite_controle before insert on public.visites for each row execute function public.controler_checkin();

-- Visites immuables (preuve de passage).
create or replace function public.visite_immuable()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'Une visite enregistrée ne peut être ni modifiée ni supprimée.' using errcode = '42501';
end $$;
create trigger visite_immuable before update or delete on public.visites for each row execute function public.visite_immuable();

-- -----------------------------------------------------------------------------
-- Tournées et objectifs
-- -----------------------------------------------------------------------------
create table public.tournees (
  id            uuid primary key default gen_random_uuid(),
  commercial_id uuid not null references public.profils (id),
  date_tournee  date not null,
  notes         text not null default '',
  created_by    uuid references public.profils (id) default auth.uid(),
  created_at    timestamptz not null default now(),
  unique (commercial_id, date_tournee)
);

create table public.tournee_etapes (
  tournee_id uuid not null references public.tournees (id) on delete cascade,
  pva_id     uuid not null references public.pva (id),
  ordre      smallint not null default 0,
  primary key (tournee_id, pva_id)
);

create table public.objectifs_commerciaux (
  id                uuid primary key default gen_random_uuid(),
  commercial_id     uuid not null references public.profils (id),
  mois              date not null check (extract(day from mois) = 1),
  visites           integer not null default 0 check (visites >= 0),
  nouveaux_pva      integer not null default 0 check (nouveaux_pva >= 0),
  ca_ht_gnf         bigint not null default 0 check (ca_ht_gnf >= 0),
  colis             integer not null default 0 check (colis >= 0),
  unique (commercial_id, mois)
);

-- -----------------------------------------------------------------------------
-- Numéros des pièces créées sur le terrain : série du commercial obligatoire.
-- -----------------------------------------------------------------------------
create or replace function public.controler_numero_terrain()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_code text;
begin
  if new.numero is null or new.statut <> 'brouillon' then return new; end if;
  if tg_op = 'UPDATE' and new.numero is not distinct from old.numero then return new; end if;
  select code_serie into v_code from public.profils where id = new.commercial_id;
  if v_code is null or new.numero !~ ('^(DEV|FA)-\d{4}-' || v_code || '-\d{5}$')
     or (new.type_piece = 'devis' and new.numero not like 'DEV-%') or (new.type_piece = 'facture' and new.numero not like 'FA-%') then
    raise exception 'Numéro « % » hors de la série du commercial.', new.numero using errcode = '22023';
  end if;
  return new;
end $$;
create trigger piece_numero_terrain before insert or update on public.pieces_vente
  for each row execute function public.controler_numero_terrain();

-- Le commercial ne peut pas modifier un prix : il doit être celui de la grille en vigueur.
create or replace function public.controler_prix_terrain()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_piece public.pieces_vente%rowtype;
  v_niveau text;
  v_prix bigint;
begin
  if public.a_un_role('finance', 'responsable_commercial') or not public.a_role('commercial_terrain') then return new; end if;
  select * into v_piece from public.pieces_vente where id = new.piece_id;
  select t.niveau_prix into v_niveau from public.clients c join public.types_clients t on t.id = c.type_client_id where c.id = v_piece.client_id;
  v_prix := coalesce(
    public.prix_en_vigueur((select produit_id from public.conditionnements where id = new.conditionnement_id), v_niveau, v_piece.date_piece),
    public.prix_en_vigueur((select produit_id from public.conditionnements where id = new.conditionnement_id), 'papel', v_piece.date_piece));
  if new.prix_paquet_gnf is distinct from v_prix then
    raise exception 'Prix différent de la grille en vigueur (% GNF) : synchronisez l''application pour récupérer les prix à jour.', public.nombre_fr(v_prix) using errcode = '22023';
  end if;
  return new;
end $$;
-- S'exécute après le calcul (ordre alphabétique des triggers : « ligne_piece_calcul » < « ligne_prix_terrain »).
create trigger ligne_prix_terrain before insert or update on public.lignes_piece
  for each row execute function public.controler_prix_terrain();

-- -----------------------------------------------------------------------------
-- Synchronisation : applique un lot d'opérations saisies hors ligne. Chaque opération est
-- idempotente (identifiant généré sur le téléphone) et isolée : une erreur n'empêche pas les autres.
-- Exécutée avec les droits de l'appelant (la RLS s'applique).
-- -----------------------------------------------------------------------------
create or replace function public.synchroniser_terrain(p_operations jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_op jsonb;
  v_d jsonb;
  v_resultats jsonb := '[]'::jsonb;
  v_ligne jsonb;
  v_id uuid;
  v_statut text;
begin
  if not public.a_role('commercial_terrain') then
    raise exception 'Synchronisation réservée aux commerciaux terrain.' using errcode = '42501';
  end if;
  for v_op in select * from jsonb_array_elements(p_operations) loop
    v_d := v_op -> 'donnees';
    v_id := (v_d ->> 'id')::uuid;
    begin
      case v_op ->> 'type'
        when 'pva' then
          insert into public.pva (id, nom, type_client_id, responsable, telephone, quartier_id, repere, position, precision_m, potentiel_colis_mois, notes, commercial_id)
          values (v_id, v_d ->> 'nom', (v_d ->> 'type_client_id')::uuid, coalesce(v_d ->> 'responsable', ''), coalesce(v_d ->> 'telephone', ''),
                  nullif(v_d ->> 'quartier_id', '')::uuid, coalesce(v_d ->> 'repere', ''),
                  case when v_d ? 'latitude' and v_d ->> 'latitude' is not null
                       then extensions.st_setsrid(extensions.st_makepoint((v_d ->> 'longitude')::float8, (v_d ->> 'latitude')::float8), 4326)::extensions.geography end,
                  (v_d ->> 'precision_m')::numeric, (v_d ->> 'potentiel_colis_mois')::integer, coalesce(v_d ->> 'notes', ''), auth.uid())
          on conflict (id) do update set
            nom = excluded.nom, type_client_id = excluded.type_client_id, responsable = excluded.responsable, telephone = excluded.telephone,
            quartier_id = excluded.quartier_id, repere = excluded.repere, potentiel_colis_mois = excluded.potentiel_colis_mois, notes = excluded.notes,
            position = coalesce(public.pva.position, excluded.position), precision_m = coalesce(public.pva.precision_m, excluded.precision_m)
          where public.pva.commercial_id = auth.uid();
          v_statut := 'ok';

        when 'visite' then
          if exists (select 1 from public.visites where id = v_id) then
            v_statut := 'deja';
          else
            insert into public.visites (id, pva_id, checkin_at, position, precision_m, stock_papel_colis, rupture, notes, commercial_id)
            values (v_id, (v_d ->> 'pva_id')::uuid, (v_d ->> 'checkin_at')::timestamptz,
                    case when v_d ->> 'latitude' is not null
                         then extensions.st_setsrid(extensions.st_makepoint((v_d ->> 'longitude')::float8, (v_d ->> 'latitude')::float8), 4326)::extensions.geography end,
                    (v_d ->> 'precision_m')::numeric, (v_d ->> 'stock_papel_colis')::integer, coalesce((v_d ->> 'rupture')::boolean, false),
                    coalesce(v_d ->> 'notes', ''), auth.uid());
            insert into public.visite_prix (visite_id, produit_id, prix_gnf)
            select v_id, (p ->> 'produit_id')::uuid, (p ->> 'prix_gnf')::bigint from jsonb_array_elements(coalesce(v_d -> 'prix', '[]')) p;
            insert into public.visite_concurrence (visite_id, marque_id, produit, prix_gnf)
            select v_id, (c ->> 'marque_id')::uuid, coalesce(c ->> 'produit', ''), nullif(c ->> 'prix_gnf', '')::bigint from jsonb_array_elements(coalesce(v_d -> 'concurrence', '[]')) c;
            v_statut := 'ok';
          end if;

        when 'photo' then
          insert into public.pva_photos (id, pva_id, visite_id, chemin)
          values (v_id, (v_d ->> 'pva_id')::uuid, nullif(v_d ->> 'visite_id', '')::uuid, v_d ->> 'chemin')
          on conflict (id) do nothing;
          v_statut := 'ok';

        when 'client' then
          -- Le PVA devient client (pour lui faire des devis et factures).
          insert into public.clients (id, nom, type_client_id, responsable, telephone, quartier_id, commercial_id, condition_paiement)
          values (v_id, v_d ->> 'nom', (v_d ->> 'type_client_id')::uuid, coalesce(v_d ->> 'responsable', ''), coalesce(v_d ->> 'telephone', ''),
                  nullif(v_d ->> 'quartier_id', '')::uuid, auth.uid(), 'comptant')
          on conflict (id) do nothing;
          update public.pva set client_id = v_id where id = (v_d ->> 'pva_id')::uuid and commercial_id = auth.uid();
          v_statut := 'ok';

        when 'piece' then
          if exists (select 1 from public.pieces_vente where id = v_id) then
            v_statut := 'deja';
          else
            insert into public.pieces_vente (id, type_piece, numero, client_id, date_piece, commercial_id, notes)
            values (v_id, (v_d ->> 'type_piece')::public.type_piece, v_d ->> 'numero', (v_d ->> 'client_id')::uuid,
                    (v_d ->> 'date_piece')::date, auth.uid(), coalesce(v_d ->> 'notes', ''));
            for v_ligne in select * from jsonb_array_elements(v_d -> 'lignes') loop
              insert into public.lignes_piece (piece_id, conditionnement_id, quantite_colis, paquets_vrac, paquets, prix_paquet_gnf, montant_ht_gnf)
              values (v_id, (v_ligne ->> 'conditionnement_id')::uuid, (v_ligne ->> 'quantite_colis')::integer, coalesce((v_ligne ->> 'paquets_vrac')::integer, 0),
                      1, (v_ligne ->> 'prix_paquet_gnf')::bigint, 0);
            end loop;
            perform public.valider_piece(v_id);
            v_statut := 'ok';
          end if;

        else
          v_statut := 'type inconnu';
      end case;
      v_resultats := v_resultats || jsonb_build_object('id', v_op ->> 'id', 'statut', v_statut);
    exception when others then
      -- L'opération est annulée seule ; le téléphone la garde et affiche l'erreur.
      v_resultats := v_resultats || jsonb_build_object('id', v_op ->> 'id', 'statut', 'erreur', 'message', sqlerrm);
    end;
  end loop;
  return v_resultats;
end $$;

-- Dernier numéro utilisé par série (pour réinitialiser le compteur d'un téléphone).
create or replace function public.dernier_numero_terrain(p_prefixe text)
returns integer language sql stable set search_path = '' as $$
  select coalesce(max(substring(numero from '(\d{5})$')::integer), 0)
  from public.pieces_vente where numero like p_prefixe || '%';
$$;

-- -----------------------------------------------------------------------------
-- Vue de supervision : visites avec coordonnées lisibles.
-- -----------------------------------------------------------------------------
create view public.visites_carte with (security_invoker = true) as
select v.id, v.pva_id, p.nom as pva_nom, v.commercial_id, pr.prenom || ' ' || pr.nom as commercial_nom, v.checkin_at,
       extensions.st_y(v.position::extensions.geometry) as latitude, extensions.st_x(v.position::extensions.geometry) as longitude,
       v.precision_m, v.distance_m, v.dans_zone, v.rupture, v.stock_papel_colis, v.notes
from public.visites v
join public.pva p on p.id = v.pva_id
join public.profils pr on pr.id = v.commercial_id;

create view public.pva_carte with (security_invoker = true) as
select p.id, p.nom, p.type_client_id, t.libelle as type_libelle, p.responsable, p.telephone, p.quartier_id, q.nom as quartier_nom,
       co.nom as commune_nom, p.repere, p.potentiel_colis_mois, p.commercial_id, pr.prenom || ' ' || pr.nom as commercial_nom,
       p.client_id, p.actif, p.created_at, p.notes,
       extensions.st_y(p.position::extensions.geometry) as latitude, extensions.st_x(p.position::extensions.geometry) as longitude,
       (select max(v.checkin_at) from public.visites v where v.pva_id = p.id) as derniere_visite,
       (select v.rupture from public.visites v where v.pva_id = p.id order by v.checkin_at desc limit 1) as derniere_rupture
from public.pva p
join public.types_clients t on t.id = p.type_client_id
join public.profils pr on pr.id = p.commercial_id
left join public.quartiers q on q.id = p.quartier_id
left join public.communes co on co.id = q.commune_id;

-- -----------------------------------------------------------------------------
-- Stockage des photos (privé) : chaque commercial écrit dans son dossier « <son id>/… ».
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos-terrain', 'photos-terrain', false, 1048576, array['image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy photos_terrain_ajout on storage.objects for insert to authenticated
  with check (bucket_id = 'photos-terrain' and (storage.foldername(name))[1] = (select auth.uid())::text and public.a_role('commercial_terrain'));
create policy photos_terrain_lecture on storage.objects for select to authenticated
  using (bucket_id = 'photos-terrain' and ((storage.foldername(name))[1] = (select auth.uid())::text or public.a_un_role('responsable_commercial')));

-- -----------------------------------------------------------------------------
-- RLS : le commercial ne voit que SES PVA et SES visites ; le responsable commercial voit tout.
-- -----------------------------------------------------------------------------
-- Le responsable commercial et la comptabilité doivent connaître la liste des commerciaux (équipe, affectation des clients).
create policy utilisateur_roles_commerciaux on public.utilisateur_roles for select to authenticated
  using (role = 'commercial_terrain' and public.a_un_role('responsable_commercial', 'finance'));

alter table public.marques_concurrentes enable row level security;
alter table public.pva enable row level security;
alter table public.pva_photos enable row level security;
alter table public.visites enable row level security;
alter table public.visite_prix enable row level security;
alter table public.visite_concurrence enable row level security;
alter table public.tournees enable row level security;
alter table public.tournee_etapes enable row level security;
alter table public.objectifs_commerciaux enable row level security;

create policy marques_lecture on public.marques_concurrentes for select to authenticated using (public.est_actif());
create policy marques_ecriture on public.marques_concurrentes for all to authenticated
  using (public.est_admin() or public.a_un_role('responsable_commercial')) with check (public.est_admin() or public.a_un_role('responsable_commercial'));

create policy pva_lecture on public.pva for select to authenticated
  using (public.a_un_role('responsable_commercial') or (public.a_role('commercial_terrain') and commercial_id = (select auth.uid())));
create policy pva_ajout on public.pva for insert to authenticated
  with check (public.a_un_role('responsable_commercial') or (public.a_role('commercial_terrain') and commercial_id = (select auth.uid())));
create policy pva_modif on public.pva for update to authenticated
  using (public.a_un_role('responsable_commercial') or (public.a_role('commercial_terrain') and commercial_id = (select auth.uid())))
  with check (public.a_un_role('responsable_commercial') or (public.a_role('commercial_terrain') and commercial_id = (select auth.uid())));

create policy pva_photos_lecture on public.pva_photos for select to authenticated
  using (exists (select 1 from public.pva p where p.id = pva_id));
create policy pva_photos_ajout on public.pva_photos for insert to authenticated
  with check (public.a_role('commercial_terrain') and exists (select 1 from public.pva p where p.id = pva_id and p.commercial_id = (select auth.uid())));

create policy visites_lecture on public.visites for select to authenticated
  using (public.a_un_role('responsable_commercial') or (public.a_role('commercial_terrain') and commercial_id = (select auth.uid())));
create policy visites_ajout on public.visites for insert to authenticated
  with check (public.a_role('commercial_terrain') and commercial_id = (select auth.uid())
              and exists (select 1 from public.pva p where p.id = pva_id and p.commercial_id = (select auth.uid())));

create policy visite_prix_lecture on public.visite_prix for select to authenticated using (exists (select 1 from public.visites v where v.id = visite_id));
create policy visite_prix_ajout on public.visite_prix for insert to authenticated
  with check (exists (select 1 from public.visites v where v.id = visite_id and v.commercial_id = (select auth.uid())));
create policy visite_concurrence_lecture on public.visite_concurrence for select to authenticated using (exists (select 1 from public.visites v where v.id = visite_id));
create policy visite_concurrence_ajout on public.visite_concurrence for insert to authenticated
  with check (exists (select 1 from public.visites v where v.id = visite_id and v.commercial_id = (select auth.uid())));

create policy tournees_lecture on public.tournees for select to authenticated
  using (public.a_un_role('responsable_commercial') or commercial_id = (select auth.uid()));
create policy tournees_ecriture on public.tournees for all to authenticated
  using (public.a_un_role('responsable_commercial') or (public.a_role('commercial_terrain') and commercial_id = (select auth.uid())))
  with check (public.a_un_role('responsable_commercial') or (public.a_role('commercial_terrain') and commercial_id = (select auth.uid())));
create policy tournee_etapes_lecture on public.tournee_etapes for select to authenticated using (exists (select 1 from public.tournees t where t.id = tournee_id));
create policy tournee_etapes_ecriture on public.tournee_etapes for all to authenticated
  using (exists (select 1 from public.tournees t where t.id = tournee_id and (public.a_un_role('responsable_commercial') or t.commercial_id = (select auth.uid()))))
  with check (exists (select 1 from public.tournees t where t.id = tournee_id and (public.a_un_role('responsable_commercial') or t.commercial_id = (select auth.uid()))));

create policy objectifs_lecture on public.objectifs_commerciaux for select to authenticated
  using (public.a_un_role('responsable_commercial') or commercial_id = (select auth.uid()));
create policy objectifs_ecriture on public.objectifs_commerciaux for all to authenticated
  using (public.a_un_role('responsable_commercial')) with check (public.a_un_role('responsable_commercial'));

-- Le commercial lit la grille de prix (déjà ouverte à tous) et les soldes de SES clients (alerte plafond hors ligne).
-- (soldes_clients et factures_etat sont en security_invoker : la RLS des clients et pièces s'applique.)

-- -----------------------------------------------------------------------------
-- Audit (les visites sont elles-mêmes une preuve inaltérable)
-- -----------------------------------------------------------------------------
select public.activer_audit('public.marques_concurrentes');
select public.activer_audit('public.pva');
select public.activer_audit('public.pva_photos');
select public.activer_audit('public.tournees');
select public.activer_audit('public.tournee_etapes', 'tournee_id');
select public.activer_audit('public.objectifs_commerciaux');
