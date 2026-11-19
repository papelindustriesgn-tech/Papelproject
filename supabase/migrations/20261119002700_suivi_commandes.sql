-- =============================================================================
-- Suivi des commandes : date de livraison souhaitée par le client, puis date confirmée par l'usine.
-- Une commande validée est figée (trigger piece_figee) : le suivi vit dans une table à part, sans
-- jamais modifier la pièce ; chaque changement est tracé dans le journal d'audit.
-- =============================================================================

create table public.suivi_commandes (
  commande_id     uuid primary key references public.pieces_vente (id),
  date_souhaitee  date,
  date_confirmee  date,
  confirmee_par   uuid references public.profils (id),
  confirmee_le    timestamptz,
  note            text not null default '' check (length(note) <= 300),
  updated_at      timestamptz not null default now()
);
comment on table public.suivi_commandes is
  'Dates de livraison d''une commande client : souhaitée (saisie avec la commande) et confirmée (par l''usine). La pièce reste figée.';

alter table public.suivi_commandes enable row level security;

-- Lecture : les services qui préparent, livrent, facturent ou suivent les ventes ; le commercial, pour ses commandes.
create policy suivi_commandes_lecture on public.suivi_commandes for select to authenticated using (
  public.a_un_role('magasin', 'production', 'logistique', 'finance', 'responsable_commercial')
  or (public.a_role('commercial_terrain')
      and exists (select 1 from public.pieces_vente p where p.id = commande_id and p.commercial_id = auth.uid()))
);
-- Écriture : uniquement par les fonctions ci-dessous (aucune politique d'ajout ou de modification).

select public.activer_audit('public.suivi_commandes');

-- Date souhaitée, enregistrée avec la commande (téléphone ou bureau), par le commercial de la commande
-- ou par les ventes. Une date déjà confirmée par l'usine n'est pas touchée.
create or replace function public.enregistrer_date_souhaitee(p_commande uuid, p_date date)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_p public.pieces_vente%rowtype;
begin
  select * into v_p from public.pieces_vente where id = p_commande;
  if v_p.id is null or v_p.type_piece <> 'commande' then raise exception 'Commande introuvable.' using errcode = '22023'; end if;
  if not (public.a_un_role('finance', 'responsable_commercial') or (public.a_role('commercial_terrain') and v_p.commercial_id = auth.uid())) then
    raise exception 'Vous ne pouvez pas modifier cette commande.' using errcode = '42501';
  end if;
  if p_date is not null and p_date < v_p.date_piece then
    raise exception 'La date de livraison souhaitée ne peut pas être avant la date de la commande.' using errcode = '22023';
  end if;
  insert into public.suivi_commandes (commande_id, date_souhaitee) values (p_commande, p_date)
  on conflict (commande_id) do update set date_souhaitee = excluded.date_souhaitee, updated_at = now();
end $$;

-- Date confirmée par l'usine (ventes, magasin ou logistique) : c'est la date promise au client,
-- utilisée par le suivi des livraisons à temps.
create or replace function public.confirmer_date_livraison(p_commande uuid, p_date date, p_note text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_p public.pieces_vente%rowtype;
begin
  if not public.a_un_role('finance', 'responsable_commercial', 'magasin', 'logistique') then
    raise exception 'Seuls les ventes, le magasin et la logistique confirment une date de livraison.' using errcode = '42501';
  end if;
  select * into v_p from public.pieces_vente where id = p_commande;
  if v_p.id is null or v_p.type_piece <> 'commande' or v_p.statut <> 'valide' then
    raise exception 'Seule une commande validée reçoit une date de livraison.' using errcode = '22023';
  end if;
  if p_date is null or p_date < v_p.date_piece then
    raise exception 'Choisissez une date de livraison à partir du jour de la commande.' using errcode = '22023';
  end if;
  insert into public.suivi_commandes (commande_id, date_confirmee, confirmee_par, confirmee_le, note)
  values (p_commande, p_date, auth.uid(), now(), trim(coalesce(p_note, '')))
  on conflict (commande_id) do update set date_confirmee = excluded.date_confirmee, confirmee_par = excluded.confirmee_par,
    confirmee_le = excluded.confirmee_le, note = excluded.note, updated_at = now();
end $$;

revoke execute on function public.enregistrer_date_souhaitee(uuid, date) from anon, public;
revoke execute on function public.confirmer_date_livraison(uuid, date, text) from anon, public;
grant execute on function public.enregistrer_date_souhaitee(uuid, date) to authenticated;
grant execute on function public.confirmer_date_livraison(uuid, date, text) to authenticated;

-- Synchronisation du téléphone : identique, plus la date souhaitée d'une commande (champ facultatif
-- « date_livraison_souhaitee » de l'opération « piece »). Renvoyer la même opération reste sans effet (« deja »).
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
          -- Nouveau client : depuis un point de vente, ou directement pendant une commande (sans point de vente).
          insert into public.clients (id, nom, type_client_id, responsable, telephone, quartier_id, commercial_id, condition_paiement)
          values (v_id, v_d ->> 'nom', (v_d ->> 'type_client_id')::uuid, coalesce(v_d ->> 'responsable', ''), coalesce(v_d ->> 'telephone', ''),
                  nullif(v_d ->> 'quartier_id', '')::uuid, auth.uid(), 'comptant')
          on conflict (id) do nothing;
          update public.pva set client_id = v_id where id = nullif(v_d ->> 'pva_id', '')::uuid and commercial_id = auth.uid();
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
            if v_d ->> 'type_piece' = 'commande' and nullif(v_d ->> 'date_livraison_souhaitee', '') is not null then
              perform public.enregistrer_date_souhaitee(v_id, (v_d ->> 'date_livraison_souhaitee')::date);
            end if;
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
