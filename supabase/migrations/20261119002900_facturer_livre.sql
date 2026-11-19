-- =============================================================================
-- Facturer ce qui a été livré : une commande livrée en plusieurs fois se facture livraison par livraison,
-- au prix de la commande, sans ressaisie. Contrôle en base : jamais plus que commandé.
-- =============================================================================

-- Reste à facturer par ligne de commande : livré (moins rapporté) − facturé (moins crédité par avoir).
create or replace view public.reste_a_facturer with (security_invoker = true) as
select c.id as commande_id, c.client_id, c.numero, lc.conditionnement_id,
       min(lc.prix_paquet_gnf) as prix_paquet_gnf,
       coalesce((select sum(ll.paquets - ll.paquets_retournes) from public.lignes_livraison ll join public.livraisons lv on lv.id = ll.livraison_id
                 where lv.commande_id = c.id and lv.statut = 'validee' and ll.conditionnement_id = lc.conditionnement_id), 0)
       - coalesce((select sum(lf.paquets) from public.lignes_piece lf join public.pieces_vente f on f.id = lf.piece_id
                   where f.origine_id = c.id and f.type_piece = 'facture' and f.statut = 'valide' and lf.conditionnement_id = lc.conditionnement_id), 0)
       -- Paquets rapportés à la livraison et crédités par un avoir : déjà retirés du livré, à ne pas compter deux fois.
       + coalesce((select sum(la.retour_livraison_paquets) from public.lignes_piece la join public.pieces_vente a on a.id = la.piece_id and a.type_piece = 'avoir' and a.statut = 'valide'
                   join public.pieces_vente f on f.id = a.origine_id
                   where f.origine_id = c.id and la.conditionnement_id = lc.conditionnement_id), 0)
         as paquets_a_facturer
from public.pieces_vente c
join public.lignes_piece lc on lc.piece_id = c.id
where c.type_piece = 'commande' and c.statut = 'valide'
group by c.id, c.client_id, c.numero, lc.conditionnement_id;
comment on view public.reste_a_facturer is
  'Par commande et produit : livré (moins rapporté) − facturé + rapporté déjà crédité par avoir. Négatif = un avoir est à faire.';

-- Commandes à facturer : une ligne par commande ayant des colis livrés non facturés (comptabilité, ventes).
create or replace view public.commandes_a_facturer with (security_invoker = true) as
select r.commande_id, r.numero, r.client_id, cl.nom as client_nom,
       sum(r.paquets_a_facturer)::bigint as paquets_a_facturer,
       sum(r.paquets_a_facturer * r.prix_paquet_gnf)::bigint as montant_ht_gnf,
       (select max(lv.date_livraison) from public.livraisons lv where lv.commande_id = r.commande_id and lv.statut = 'validee') as derniere_livraison,
       exists (select 1 from public.pieces_vente f where f.origine_id = r.commande_id and f.type_piece = 'facture' and f.statut = 'brouillon') as facture_en_cours
from public.reste_a_facturer r
join public.clients cl on cl.id = r.client_id
where r.paquets_a_facturer > 0
group by r.commande_id, r.numero, r.client_id, cl.nom;

-- Prépare la facture de ce qui a été livré et pas encore facturé (reprend une facture en préparation s'il y en a une).
create or replace function public.facturer_livre(p_commande uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_c public.pieces_vente%rowtype;
  v_id uuid;
begin
  if not public.a_un_role('finance', 'responsable_commercial') then
    raise exception 'Seuls la comptabilité et les ventes établissent une facture.' using errcode = '42501';
  end if;
  select * into v_c from public.pieces_vente where id = p_commande for update;
  if v_c.id is null or v_c.type_piece <> 'commande' or v_c.statut <> 'valide' then
    raise exception 'Seule une commande validée se facture.' using errcode = '22023';
  end if;
  select id into v_id from public.pieces_vente where origine_id = p_commande and type_piece = 'facture' and statut = 'brouillon' limit 1;
  if v_id is not null then return v_id; end if;
  if not exists (select 1 from public.reste_a_facturer where commande_id = p_commande and paquets_a_facturer > 0) then
    raise exception 'Rien à facturer pour le moment : aucun colis livré qui ne soit déjà facturé.' using errcode = '22023';
  end if;
  insert into public.pieces_vente (type_piece, client_id, origine_id, commercial_id, notes)
  values ('facture', v_c.client_id, p_commande, v_c.commercial_id, v_c.notes)
  returning id into v_id;
  insert into public.lignes_piece (piece_id, conditionnement_id, quantite_colis, paquets_vrac, paquets, prix_paquet_gnf, montant_ht_gnf)
  select v_id, r.conditionnement_id, r.paquets_a_facturer / k.paquets_par_colis, r.paquets_a_facturer % k.paquets_par_colis, 1, r.prix_paquet_gnf, 0
  from public.reste_a_facturer r join public.conditionnements k on k.id = r.conditionnement_id
  where r.commande_id = p_commande and r.paquets_a_facturer > 0;
  return v_id;
end $$;
revoke execute on function public.facturer_livre(uuid) from anon, public;
grant execute on function public.facturer_livre(uuid) to authenticated;

-- Validation unique : identique, sauf la facture issue d'une commande (plusieurs factures, quantités plafonnées).
create or replace function public.valider_piece(p_piece uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_piece  public.pieces_vente%rowtype;
  v_client public.clients%rowtype;
  v_origine public.pieces_vente%rowtype;
  v_ht     bigint;
  v_taux   numeric;
  v_tva    bigint;
  v_prefixe text;
  v_encours bigint;
  v_analyse jsonb;
  v_numero text;
begin
  if not public.peut_ecrire_piece(p_piece) then
    raise exception 'Vous n''avez pas les droits sur cette pièce.' using errcode = '42501';
  end if;
  select * into v_piece from public.pieces_vente where id = p_piece for update;
  if v_piece.id is null then raise exception 'Pièce introuvable.' using errcode = '22023'; end if;
  if v_piece.statut <> 'brouillon' then raise exception 'Cette pièce est déjà validée.' using errcode = '22023'; end if;
  select * into v_client from public.clients where id = v_piece.client_id;

  -- Pièce d'origine : cohérente (même client, bon enchaînement) et non transformée deux fois.
  if v_piece.origine_id is not null then
    select * into v_origine from public.pieces_vente where id = v_piece.origine_id;
    if v_origine.id is null or v_origine.statut <> 'valide' or v_origine.client_id <> v_piece.client_id
       or not ((v_origine.type_piece = 'devis' and v_piece.type_piece in ('commande', 'facture'))
               or (v_origine.type_piece = 'commande' and v_piece.type_piece = 'facture')
               or (v_origine.type_piece = 'facture' and v_piece.type_piece = 'avoir')) then
      raise exception 'Pièce d''origine incohérente.' using errcode = '22023';
    end if;
    if v_origine.type_piece = 'commande' and v_piece.type_piece = 'facture' then
      -- Facturation par livraison : plusieurs factures par commande, jamais au-delà des quantités commandées.
      perform 1 from public.pieces_vente where id = v_piece.origine_id for update;
      if exists (
        select 1 from public.lignes_piece l
        where l.piece_id = p_piece
          and (select coalesce(sum(lf.paquets), 0) from public.lignes_piece lf join public.pieces_vente f on f.id = lf.piece_id
               where f.origine_id = v_piece.origine_id and f.type_piece = 'facture' and f.statut = 'valide' and lf.conditionnement_id = l.conditionnement_id)
            + (select coalesce(sum(x.paquets), 0) from public.lignes_piece x where x.piece_id = p_piece and x.conditionnement_id = l.conditionnement_id)
            > (select coalesce(sum(lc.paquets), 0) from public.lignes_piece lc where lc.piece_id = v_piece.origine_id and lc.conditionnement_id = l.conditionnement_id)) then
        raise exception 'Cette facture dépasse ce qui reste à facturer sur la commande.' using errcode = '22023';
      end if;
    elsif v_piece.type_piece <> 'avoir' and exists (select 1 from public.pieces_vente where origine_id = v_piece.origine_id
         and type_piece = v_piece.type_piece and statut = 'valide' and id <> p_piece) then
      raise exception 'La pièce d''origine a déjà été transformée.' using errcode = '22023';
    end if;
  elsif v_piece.type_piece = 'avoir' then
    raise exception 'Un avoir se crée depuis la facture qu''il corrige.' using errcode = '22023';
  end if;

  v_prefixe := case v_piece.type_piece when 'devis' then 'DEV' when 'commande' then 'CMD' when 'facture' then 'FA' else 'AV' end
               || '-' || to_char(v_piece.date_piece, 'YYYY') || '-';

  if v_piece.type_piece = 'avoir' then
    -- ---------------- Avoir ----------------
    if not public.a_un_role('finance', 'responsable_commercial') then
      raise exception 'Vous n''avez pas les droits pour valider un avoir.' using errcode = '42501';
    end if;
    -- Verrou de la facture : avoirs, paiements et remboursements concurrents sont sérialisés.
    perform 1 from public.pieces_vente where id = v_piece.origine_id for update;
    v_analyse := public.analyser_avoir(p_piece);
    if jsonb_array_length(v_analyse -> 'erreurs') > 0 then
      raise exception '%', (select string_agg(e, ' ') from jsonb_array_elements_text(v_analyse -> 'erreurs') e) using errcode = '22023';
    end if;
    -- Rattachement des paquets déjà revenus à la livraison (calculé par la base, pas saisi).
    update public.lignes_piece l set retour_livraison_paquets = (x ->> 'retour_livraison')::integer
      from jsonb_array_elements(v_analyse -> 'lignes') x
     where l.id = (x ->> 'ligne_id')::uuid;
    v_numero := coalesce(v_piece.numero, public.prochain_numero(v_prefixe));
    -- Nouveau retour physique à l'usine : une entrée de stock par article (index unique : jamais deux fois).
    insert into public.mouvements_stock (type, article_id, quantite, unite, motif, document_type, document_id, auteur_id)
    select 'retour', a.id, sum(l.retour_stock_paquets), 'paquet', 'Retour client (avoir ' || v_numero || ')', 'avoir', p_piece, auth.uid()
    from public.lignes_piece l join public.articles a on a.conditionnement_id = l.conditionnement_id
    where l.piece_id = p_piece and l.retour_stock_paquets > 0
    group by a.id;
    update public.pieces_vente set
      statut = 'valide', numero = v_numero,
      tva_taux = (v_analyse ->> 'tva_taux')::numeric,
      total_ht_gnf = (v_analyse ->> 'total_ht_gnf')::bigint, total_tva_gnf = (v_analyse ->> 'total_tva_gnf')::bigint,
      total_ttc_gnf = (v_analyse ->> 'total_ttc_gnf')::bigint,
      avoir_reduction_creance_gnf = (v_analyse ->> 'reduction_creance_gnf')::bigint,
      avoir_credit_client_gnf = (v_analyse ->> 'credit_client_gnf')::bigint,
      date_echeance = null, valide_par = auth.uid(), valide_le = now()
    where id = p_piece;
    return v_numero;
  end if;

  -- ---------------- Devis, commande, facture ----------------
  select coalesce(sum(montant_ht_gnf), 0) into v_ht from public.lignes_piece where piece_id = p_piece;
  if v_ht <= 0 then raise exception 'La pièce ne contient aucune ligne.' using errcode = '22023'; end if;
  v_taux := case when public.parametre_num('tva_applicable', 1) = 1 then public.parametre_num('tva_taux', 0.18) else 0 end;
  -- TVA calculée sur le total HT, un seul arrondi (même règle que src/lib/metier/tva.ts).
  v_tva := round(v_ht * v_taux);

  -- Plafond de crédit : une facture ne peut pas faire dépasser l'encours autorisé d'un client à crédit.
  if v_piece.type_piece = 'facture' and v_client.condition_paiement = 'credit' and v_client.plafond_credit_gnf > 0 then
    select coalesce(sum(solde_gnf), 0) into v_encours from public.factures_etat where client_id = v_client.id;
    if v_encours + v_ht + v_tva > v_client.plafond_credit_gnf then
      raise exception 'Plafond de crédit dépassé pour « % » : encours % GNF + facture % GNF > plafond % GNF.',
        v_client.nom, public.nombre_fr(v_encours), public.nombre_fr(v_ht + v_tva), public.nombre_fr(v_client.plafond_credit_gnf) using errcode = '22023';
    end if;
  end if;

  update public.pieces_vente set
    statut = 'valide',
    numero = coalesce(v_piece.numero, public.prochain_numero(v_prefixe)),
    tva_taux = v_taux, total_ht_gnf = v_ht, total_tva_gnf = v_tva, total_ttc_gnf = v_ht + v_tva,
    date_echeance = case when v_piece.type_piece = 'facture'
                         then coalesce(v_piece.date_echeance, v_piece.date_piece + v_client.delai_paiement_jours) end,
    valide_par = auth.uid(), valide_le = now()
  where id = p_piece;
  return (select numero from public.pieces_vente where id = p_piece);
end $$;
