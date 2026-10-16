-- =============================================================================
-- Papel ERP — Coordination entre les services :
--   1. objectifs mensuels par service (chaque application a les siens, fixés par la Direction) ;
--   2. tâches entre services (une demande d'un service à un autre, suivie jusqu'à « faite ») ;
--   3. commandes passées par les commerciaux depuis le téléphone (série CMD-AAAA-<code>-NNNNN) ;
--   4. commandes à servir : vues par le magasin, la production et la logistique, avec le stock disponible
--      et une estimation du délai de livraison (calcul : src/lib/metier/coordination.ts) ;
--   5. confirmation de la livraison par le commercial une fois la remise faite.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Accès à un espace (miroir de src/lib/auth/espaces.ts ; la Direction accède à tout).
-- -----------------------------------------------------------------------------
create or replace function public.peut_acceder_espace(p_espace text)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.est_actif() and case p_espace
    when 'direction' then public.a_role('direction')
    when 'magasin' then public.a_un_role('magasin')
    when 'production' then public.a_un_role('production')
    when 'ventes' then public.a_un_role('finance', 'responsable_commercial')
    when 'commercial' then public.a_un_role('responsable_commercial')
    when 'terrain' then public.a_un_role('commercial_terrain')
    when 'achats' then public.a_un_role('achats')
    when 'logistique' then public.a_un_role('logistique')
    when 'qualite' then public.a_un_role('qualite')
    when 'maintenance' then public.a_un_role('maintenance')
    when 'finance' then public.a_un_role('finance')
    when 'rh' then public.a_un_role('rh')
    when 'admin' then public.a_un_role('admin')
    else false end;
$$;

-- -----------------------------------------------------------------------------
-- 1. Objectifs mensuels par service : une valeur par (service × indicateur × mois).
--    Catalogue des indicateurs et calcul du réel : src/lib/objectifs/catalogue.ts.
-- -----------------------------------------------------------------------------
create table public.objectifs_services (
  id          uuid primary key default gen_random_uuid(),
  espace      text not null check (espace in ('direction', 'magasin', 'production', 'ventes', 'commercial', 'achats', 'logistique', 'qualite', 'maintenance', 'finance', 'rh')),
  indicateur  text not null check (indicateur ~ '^[a-z0-9_]+$'),
  -- Premier jour du mois visé.
  mois        date not null check (extract(day from mois) = 1),
  -- Dans l'unité de l'indicateur (GNF, paquets, kg, jours…) ; un pourcentage est stocké en fraction (95 % → 0,95).
  valeur      numeric(18, 4) not null check (valeur >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profils (id) default auth.uid(),
  unique (espace, indicateur, mois)
);
create trigger objectifs_services_updated_at before update on public.objectifs_services
  for each row execute function public.maj_updated_at();

alter table public.objectifs_services enable row level security;
-- Lecture : tout compte actif ; les objectifs se fixent par la Direction (ou l'administrateur).
create policy objectifs_services_lecture on public.objectifs_services for select to authenticated using (public.est_actif());
create policy objectifs_services_ecriture on public.objectifs_services for all to authenticated
  using (public.est_actif() and (public.a_role('direction') or public.est_admin()))
  with check (public.est_actif() and (public.a_role('direction') or public.est_admin()));
select public.activer_audit('public.objectifs_services');

-- Reprise des objectifs du business plan (déjà saisis) : CA, paquets et papier pour la Direction, les Ventes et la Production.
insert into public.objectifs_services (espace, indicateur, mois, valeur)
select x.espace, x.indicateur, o.mois, x.valeur
from public.objectifs_mensuels o
cross join lateral (values
  ('direction', 'ca_ttc', o.ca_ttc_gnf::numeric), ('direction', 'paquets_produits', o.paquets::numeric), ('direction', 'papier_kg', o.production_kg),
  ('ventes', 'ca_ttc', o.ca_ttc_gnf::numeric), ('production', 'paquets_produits', o.paquets::numeric), ('production', 'papier_kg', o.production_kg)
) as x(espace, indicateur, valeur)
where o.actif and x.valeur > 0
on conflict (espace, indicateur, mois) do nothing;

-- -----------------------------------------------------------------------------
-- 2. Tâches entre services : un service demande quelque chose à un autre (ex. la Production demande
--    au Magasin de préparer des cartons). Suivi : à faire → en cours → faite (ou annulée par l'émetteur).
-- -----------------------------------------------------------------------------
create table public.taches (
  id                   uuid primary key default gen_random_uuid(),
  titre                text not null check (length(trim(titre)) between 3 and 200),
  description          text not null default '',
  espace_emetteur      text not null check (espace_emetteur in ('direction', 'magasin', 'production', 'ventes', 'commercial', 'achats', 'logistique', 'qualite', 'maintenance', 'finance', 'rh', 'admin')),
  espace_destinataire  text not null check (espace_destinataire in ('direction', 'magasin', 'production', 'ventes', 'commercial', 'achats', 'logistique', 'qualite', 'maintenance', 'finance', 'rh', 'admin')),
  priorite             text not null default 'normale' check (priorite in ('normale', 'urgente')),
  echeance             date,
  -- Écran de l'ERP concerné (facultatif), ex. /ventes/pieces/<id>.
  lien                 text not null default '' check (lien = '' or lien ~ '^/[A-Za-z0-9/_?=&.%-]*$'),
  statut               text not null default 'a_faire' check (statut in ('a_faire', 'en_cours', 'faite', 'annulee')),
  cree_par             uuid references public.profils (id) default auth.uid(),
  pris_par             uuid references public.profils (id),
  termine_par          uuid references public.profils (id),
  termine_le           timestamptz,
  compte_rendu         text not null default '',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index taches_destinataire_idx on public.taches (espace_destinataire, statut);
create index taches_emetteur_idx on public.taches (espace_emetteur, statut);
create trigger taches_updated_at before update on public.taches for each row execute function public.maj_updated_at();

-- Règles de suivi : une tâche faite ou annulée est figée ; seul l'émetteur annule ou modifie la demande ;
-- le service destinataire la prend en charge puis la termine.
create or replace function public.controler_tache() returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.statut := 'a_faire';
    new.cree_par := auth.uid();
    new.pris_par := null; new.termine_par := null; new.termine_le := null;
    return new;
  end if;
  if old.statut in ('faite', 'annulee') then
    raise exception 'Tâche terminée : modification impossible.' using errcode = '42501';
  end if;
  if new.espace_emetteur is distinct from old.espace_emetteur or new.cree_par is distinct from old.cree_par or new.created_at is distinct from old.created_at then
    raise exception 'L''émetteur d''une tâche ne change pas.' using errcode = '42501';
  end if;
  if (new.titre, new.description, new.espace_destinataire, new.priorite, new.echeance, new.lien)
     is distinct from (old.titre, old.description, old.espace_destinataire, old.priorite, old.echeance, old.lien)
     and old.cree_par is distinct from auth.uid() then
    raise exception 'Seul l''auteur de la demande peut la modifier.' using errcode = '42501';
  end if;
  if new.statut = 'annulee' and old.cree_par is distinct from auth.uid() and not public.a_role('direction') then
    raise exception 'Seul l''auteur de la demande peut l''annuler.' using errcode = '42501';
  end if;
  if new.statut in ('en_cours', 'faite') and new.statut <> old.statut and not public.peut_acceder_espace(old.espace_destinataire) then
    raise exception 'Seul le service destinataire traite la tâche.' using errcode = '42501';
  end if;
  if new.statut = 'en_cours' and old.statut <> 'en_cours' then new.pris_par := auth.uid(); end if;
  if new.statut in ('faite', 'annulee') then
    new.termine_par := auth.uid();
    new.termine_le := now();
  end if;
  return new;
end $$;
create trigger taches_controle before insert or update on public.taches for each row execute function public.controler_tache();

alter table public.taches enable row level security;
create policy taches_lecture on public.taches for select to authenticated using (
  public.est_actif() and (cree_par = (select auth.uid()) or public.peut_acceder_espace(espace_destinataire) or public.peut_acceder_espace(espace_emetteur)));
create policy taches_ajout on public.taches for insert to authenticated
  with check (public.est_actif() and public.peut_acceder_espace(espace_emetteur));
create policy taches_modif on public.taches for update to authenticated
  using (public.est_actif() and (cree_par = (select auth.uid()) or public.peut_acceder_espace(espace_destinataire)))
  with check (public.est_actif() and (cree_par = (select auth.uid()) or public.peut_acceder_espace(espace_destinataire)));
revoke delete on public.taches from anon, authenticated;
select public.activer_audit('public.taches');

-- Nom d'un collègue (les profils ne sont pas lisibles par tous) : pour savoir qui a demandé et qui traite.
create or replace function public.nom_profil(p_id uuid)
returns text language sql stable security definer set search_path = '' as $$
  select case when public.est_actif() then (select trim(prenom || ' ' || nom) from public.profils where id = p_id) end;
$$;
create view public.taches_etat with (security_invoker = true) as
select t.*, public.nom_profil(t.cree_par) as cree_par_nom, public.nom_profil(t.pris_par) as pris_par_nom, public.nom_profil(t.termine_par) as termine_par_nom
from public.taches t;

-- -----------------------------------------------------------------------------
-- 3. Commandes passées depuis le téléphone du commercial (en plus des devis et factures).
-- -----------------------------------------------------------------------------
create policy pieces_ajout_commande_terrain on public.pieces_vente for insert to authenticated with check (
  public.a_role('commercial_terrain') and commercial_id = (select auth.uid()) and type_piece = 'commande'
  and exists (select 1 from public.clients c where c.id = client_id and c.commercial_id = (select auth.uid())));

create or replace function public.controler_numero_terrain()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_code text;
begin
  if new.numero is null or new.statut <> 'brouillon' then return new; end if;
  if tg_op = 'UPDATE' and new.numero is not distinct from old.numero then return new; end if;
  select code_serie into v_code from public.profils where id = new.commercial_id;
  if v_code is null or new.numero !~ ('^(DEV|CMD|FA)-\d{4}-' || v_code || '-\d{5}$')
     or (new.type_piece = 'devis' and new.numero not like 'DEV-%') or (new.type_piece = 'facture' and new.numero not like 'FA-%')
     or (new.type_piece = 'commande' and new.numero not like 'CMD-%') or new.type_piece = 'avoir' then
    raise exception 'Numéro « % » hors de la série du commercial.', new.numero using errcode = '22023';
  end if;
  return new;
end $$;

-- -----------------------------------------------------------------------------
-- 5. Confirmation de la livraison par le commercial (après la remise saisie par la logistique).
-- -----------------------------------------------------------------------------
alter table public.livraisons
  add column confirmation       text check (confirmation in ('conforme', 'probleme')),
  add column confirmee_le       timestamptz,
  add column confirmee_par      uuid references public.profils (id),
  add column confirmation_note  text not null default '';

-- Le commercial voit les livraisons de SES commandes (pour les confirmer depuis son téléphone).
create policy livraisons_lecture_commercial on public.livraisons for select to authenticated using (
  public.a_role('commercial_terrain')
  and exists (select 1 from public.pieces_vente p where p.id = commande_id and p.commercial_id = (select auth.uid())));

-- Renvoie « ok », ou « deja » si la livraison était déjà confirmée (renvoi depuis le téléphone sans doublon).
create or replace function public.confirmer_livraison(p_livraison uuid, p_confirmation text, p_note text default '')
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_l public.livraisons%rowtype;
  v_commercial uuid;
begin
  select * into v_l from public.livraisons where id = p_livraison for update;
  if v_l.id is null then raise exception 'Bon de livraison introuvable.' using errcode = '22023'; end if;
  select commercial_id into v_commercial from public.pieces_vente where id = v_l.commande_id;
  if not (public.a_un_role('responsable_commercial') or (public.a_role('commercial_terrain') and v_commercial = auth.uid())) then
    raise exception 'Seul le commercial de la commande confirme sa livraison.' using errcode = '42501';
  end if;
  if v_l.confirmation is not null then return 'deja'; end if;
  if v_l.statut <> 'validee' or v_l.statut_remise = 'a_livrer' then
    raise exception 'La livraison n''a pas encore été remise au client.' using errcode = '22023';
  end if;
  if p_confirmation not in ('conforme', 'probleme') then raise exception 'Confirmation invalide.' using errcode = '22023'; end if;
  if p_confirmation = 'probleme' and length(trim(coalesce(p_note, ''))) = 0 then
    raise exception 'Décrivez le problème signalé par le client.' using errcode = '22023';
  end if;
  update public.livraisons set confirmation = p_confirmation, confirmee_le = now(), confirmee_par = auth.uid(),
         confirmation_note = trim(coalesce(p_note, ''))
   where id = p_livraison;
  return 'ok';
end $$;

-- Synchronisation du téléphone : ajoute la confirmation de livraison (type « confirmation »).
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
          -- Le PVA devient client (pour lui faire des devis, commandes et factures).
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

        when 'confirmation' then
          v_statut := public.confirmer_livraison((v_d ->> 'livraison_id')::uuid, v_d ->> 'confirmation', coalesce(v_d ->> 'note', ''));

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

-- -----------------------------------------------------------------------------
-- 4. Commandes à servir : restes à livrer des commandes validées, stock de produits finis, rythme de
--    production et ordres de fabrication en cours. Le magasin et la production n'ont pas accès aux
--    pièces de vente : cette fonction leur donne seulement ce qu'il faut pour se coordonner.
--    Le commercial terrain ne reçoit que ses commandes. L'estimation est calculée dans le code.
-- -----------------------------------------------------------------------------
insert into public.parametres (cle, valeur, libelle, description, categorie, type_valeur, unite) values
  ('coordination_delai_livraison_jours', '1', 'Délai de livraison depuis le stock', 'Jours entre la disponibilité des colis à l''usine et la livraison chez le client (préparation + tournée)', 'logistique', 'entier', 'jours'),
  ('coordination_jours_reference', '30', 'Rythme de production de référence', 'Le rythme de production d''un conditionnement est la moyenne des paquets produits sur ce nombre de jours', 'production', 'entier', 'jours')
on conflict (cle) do nothing;

create or replace function public.coordination_commandes()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_tout boolean := public.a_un_role('magasin', 'production', 'logistique', 'finance', 'responsable_commercial');
  v_ref integer := greatest(1, public.parametre_num('coordination_jours_reference', 30)::integer);
  v_jour date := public.aujourdhui_conakry();
begin
  if not (v_tout or public.a_role('commercial_terrain')) then
    raise exception 'Vous n''avez pas accès aux commandes clients.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'jour', v_jour,
    'delai_livraison_jours', greatest(0, public.parametre_num('coordination_delai_livraison_jours', 1)),
    'jours_reference', v_ref,
    'lignes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'commande_id', p.id, 'numero', p.numero, 'date_piece', p.date_piece, 'client_id', c.id, 'client_nom', c.nom,
               'commercial_id', p.commercial_id, 'commercial_nom', coalesce(trim(pr.prenom || ' ' || pr.nom), ''),
               'conditionnement_id', r.conditionnement_id, 'paquets_restants', r.paquets_restants, 'paquets_commandes', r.paquets_commandes)
             order by p.date_piece, p.numero, r.conditionnement_id)
      from public.reste_a_livrer r
      join public.pieces_vente p on p.id = r.commande_id
      join public.clients c on c.id = p.client_id
      left join public.profils pr on pr.id = p.commercial_id
      where p.type_piece = 'commande' and p.statut = 'valide' and r.paquets_restants > 0
        and (v_tout or p.commercial_id = auth.uid())), '[]'::jsonb),
    'conditionnements', coalesce((
      select jsonb_agg(jsonb_build_object('id', k.id, 'libelle', k.libelle, 'produit_id', k.produit_id, 'produit', pd.libelle, 'paquets_par_colis', k.paquets_par_colis)
             order by pd.ordre, k.paquets_par_colis)
      from public.conditionnements k join public.produits pd on pd.id = k.produit_id), '[]'::jsonb),
    'stocks', coalesce((
      select jsonb_agg(jsonb_build_object('conditionnement_id', x.conditionnement_id, 'paquets', x.quantite))
      from (select a.conditionnement_id, sum(coalesce(s.quantite, 0)) as quantite
            from public.articles a left join public.stocks_articles s on s.article_id = a.id
            where a.conditionnement_id is not null group by a.conditionnement_id) x), '[]'::jsonb),
    -- Rythme réel : paquets produits (fiches validées) sur les derniers jours, ramenés à une journée.
    'rythmes', coalesce((
      select jsonb_agg(jsonb_build_object('conditionnement_id', x.conditionnement_id, 'paquets_jour', round(x.paquets::numeric / v_ref, 1)))
      from (select fp.conditionnement_id, sum(fp.paquets) as paquets
            from public.fiche_productions fp join public.fiches_production f on f.id = fp.fiche_id
            where f.statut = 'validee' and f.date_production > v_jour - v_ref and f.date_production <= v_jour
            group by fp.conditionnement_id) x where x.paquets > 0), '[]'::jsonb),
    -- Rythme théorique (sans historique) : meilleure cadence nominale du produit × heures d'ouverture par jour.
    'cadences', coalesce((
      select jsonb_agg(jsonb_build_object('produit_id', x.produit_id, 'paquets_jour', round(x.paquets_minute * 60 * public.parametre_num('maintenance_heures_ouverture_jour', 16), 0)))
      from (select produit_id, max(paquets_minute) as paquets_minute from public.cadences_nominales group by produit_id) x), '[]'::jsonb),
    -- Ordres de fabrication planifiés ou en cours : reste à produire et date de fin prévue.
    'ordres', coalesce((
      select jsonb_agg(jsonb_build_object('numero', o.numero, 'conditionnement_id', o.conditionnement_id, 'date_fin_prevue', o.date_fin_prevue,
               'paquets_restants', greatest(0, o.quantite_colis * k.paquets_par_colis - coalesce((
                  select sum(fp.paquets) from public.fiche_productions fp join public.fiches_production f on f.id = fp.fiche_id
                  where f.of_id = o.id and f.statut = 'validee' and fp.conditionnement_id = o.conditionnement_id), 0)))
             order by o.date_fin_prevue)
      from public.ordres_fabrication o join public.conditionnements k on k.id = o.conditionnement_id
      where o.statut in ('planifie', 'en_cours')), '[]'::jsonb)
  );
end $$;
revoke execute on function public.coordination_commandes() from anon;
