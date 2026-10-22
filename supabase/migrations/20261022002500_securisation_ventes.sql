-- =============================================================================
-- Papel ERP — Migration 25 : sécurisation des ventes, encaissements et retours (correctif d'audit)
--
-- 1. Pièce validée VERROUILLÉE en base : aucune écriture directe (API) ne la remet en brouillon, ne change son
--    contenu ni ses liens ; une pièce ne se crée qu'en brouillon ; seules les fonctions prévues la font évoluer.
-- 2. Retour physique ≠ avoir financier : chaque ligne d'avoir est rattachée à sa ligne de facture ; les paquets
--    déjà revenus à la livraison (refus, remise partielle) sont rattachés automatiquement et ne rentrent pas une
--    2e fois en stock ; un nouveau retour à l'usine est une quantité explicite, plafonnée à ce que le client détient.
-- 3. Encaissement : un seul chemin (enregistrer_paiement), contrôles répétés par un trigger quel que soit le chemin,
--    verrou de la facture (paiements concurrents), clé d'idempotence (double clic) sans bloquer deux règlements égaux.
-- 4. Avoir sur facture payée : permis dans la limite des montants et quantités restant à créditer ; la part qui
--    dépasse le reste dû devient un CRÉDIT CLIENT explicite ; le remboursement est une opération distincte, saisie.
-- 5. Un seul circuit de validation des avoirs : valider_piece applique les contrôles de l'avoir (valider_avoir
--    n'est plus qu'un alias), sans récursion.
-- Données existantes : aucune modification (colonnes ajoutées avec valeurs par défaut neutres).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Écriture « directe » = requête de l'API (rôles authenticated / anon / service_role).
--    Les fonctions security definer s'exécutent avec le rôle propriétaire : elles ne sont pas « directes ».
-- -----------------------------------------------------------------------------
create or replace function public.est_acces_api()
returns boolean language sql stable set search_path = '' as $$
  select current_user in ('authenticated', 'anon', 'service_role');
$$;

-- -----------------------------------------------------------------------------
-- 1. Nouvelles colonnes (valeurs neutres pour l'existant)
-- -----------------------------------------------------------------------------
alter table public.lignes_piece
  -- Ligne d'avoir → ligne de la facture créditée (prix, produit et quantité maximale en découlent).
  add column origine_ligne_id         uuid references public.lignes_piece (id),
  -- Paquets de la ligne d'avoir qui REVIENNENT à l'usine à la validation (nouvelle entrée en stock).
  add column retour_stock_paquets     integer not null default 0 check (retour_stock_paquets >= 0),
  -- Paquets déjà revenus en stock lors de la livraison (rattachés par la base, sans nouvelle entrée).
  add column retour_livraison_paquets integer not null default 0 check (retour_livraison_paquets >= 0),
  add constraint lignes_piece_retours_max check (retour_stock_paquets + retour_livraison_paquets <= paquets);
create index lignes_piece_origine_idx on public.lignes_piece (origine_ligne_id) where origine_ligne_id is not null;

alter table public.pieces_vente
  -- Avoir validé : part qui réduit la créance de la facture, part qui devient un crédit en faveur du client.
  add column avoir_reduction_creance_gnf bigint check (avoir_reduction_creance_gnf >= 0),
  add column avoir_credit_client_gnf     bigint check (avoir_credit_client_gnf >= 0);
create index pieces_origine_idx on public.pieces_vente (origine_id) where origine_id is not null;

-- Clé d'idempotence : la même soumission (double clic, nouvelle tentative) ne crée qu'un paiement.
alter table public.paiements add column cle_idempotence uuid;
create unique index paiements_cle_idempotence_idx on public.paiements (cle_idempotence) where cle_idempotence is not null;

-- Le quantité « retour en stock » d'une ligne suit sa quantité (une ligne réduite ne garde pas un retour plus grand).
create or replace function public.ligne_piece_calcul()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_ppc integer;
  v_piece public.pieces_vente%rowtype;
  v_niveau text;
begin
  select paquets_par_colis into v_ppc from public.conditionnements where id = new.conditionnement_id;
  new.paquets := new.quantite_colis * v_ppc + new.paquets_vrac;
  if new.prix_paquet_gnf is null then
    select * into v_piece from public.pieces_vente where id = new.piece_id;
    select t.niveau_prix into v_niveau from public.clients c join public.types_clients t on t.id = c.type_client_id where c.id = v_piece.client_id;
    new.prix_paquet_gnf := coalesce(
      public.prix_en_vigueur((select produit_id from public.conditionnements where id = new.conditionnement_id), v_niveau, v_piece.date_piece),
      public.prix_en_vigueur((select produit_id from public.conditionnements where id = new.conditionnement_id), 'papel', v_piece.date_piece));
    if new.prix_paquet_gnf is null then
      raise exception 'Aucun prix en vigueur pour ce produit à cette date : définissez-le dans Administration → Produits et prix.' using errcode = '22023';
    end if;
  end if;
  new.montant_ht_gnf := new.paquets * new.prix_paquet_gnf;
  new.retour_stock_paquets := least(new.retour_stock_paquets, greatest(new.paquets, 0));
  return new;
end $$;

-- -----------------------------------------------------------------------------
-- 2. Verrouillage des pièces
-- -----------------------------------------------------------------------------
-- Une pièce ne naît qu'en brouillon par l'API ; validée ou annulée, elle est figée pour tout le monde,
-- sauf l'annulation contrôlée d'un devis ou d'une commande (annuler_piece). En brouillon, l'API ne touche
-- ni au statut, ni au numéro, ni au type, ni aux liens, ni aux totaux : seules les fonctions le font.
create or replace function public.piece_figee()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_api boolean := public.est_acces_api();
begin
  if tg_op = 'DELETE' then
    if old.statut <> 'brouillon' then raise exception 'Seul un brouillon peut être supprimé.' using errcode = '22023'; end if;
    return old;
  end if;

  if tg_op = 'INSERT' then
    if v_api then
      if new.statut <> 'brouillon' or new.valide_par is not null or new.valide_le is not null
         or new.avoir_reduction_creance_gnf is not null or new.avoir_credit_client_gnf is not null then
        raise exception 'Une pièce se crée en brouillon : seule la validation la rend définitive.' using errcode = '42501';
      end if;
      -- Totaux calculés uniquement par la validation.
      new.total_ht_gnf := 0; new.total_tva_gnf := 0; new.total_ttc_gnf := 0;
      new.date_echeance := null;
    end if;
    return new;
  end if;

  -- UPDATE
  if old.statut <> 'brouillon' then
    if v_api then
      raise exception 'Pièce validée : elle ne peut plus être modifiée (faites un avoir).' using errcode = '42501';
    end if;
    if not (new.statut = old.statut or (old.statut = 'valide' and new.statut = 'annule' and old.type_piece in ('devis', 'commande'))) then
      raise exception 'Pièce validée : changement de statut interdit.' using errcode = '22023';
    end if;
    if (to_jsonb(new) - 'statut' - 'updated_at') is distinct from (to_jsonb(old) - 'statut' - 'updated_at') then
      raise exception 'Pièce validée : elle ne peut plus être modifiée (faites un avoir).' using errcode = '22023';
    end if;
    return new;
  end if;

  -- Brouillon modifié directement : seuls client, date, échéance prévue, commercial et notes.
  if v_api and (new.statut is distinct from old.statut or new.numero is distinct from old.numero
       or new.type_piece is distinct from old.type_piece or new.origine_id is distinct from old.origine_id
       or new.total_ht_gnf is distinct from old.total_ht_gnf or new.total_tva_gnf is distinct from old.total_tva_gnf
       or new.total_ttc_gnf is distinct from old.total_ttc_gnf or new.tva_taux is distinct from old.tva_taux
       or new.valide_par is distinct from old.valide_par or new.valide_le is distinct from old.valide_le
       or new.avoir_reduction_creance_gnf is distinct from old.avoir_reduction_creance_gnf
       or new.avoir_credit_client_gnf is distinct from old.avoir_credit_client_gnf
       or new.created_by is distinct from old.created_by) then
    raise exception 'Ce champ ne se modifie pas directement : utilisez les boutons Valider, Annuler ou Créer un avoir.' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists piece_figee on public.pieces_vente;
create trigger piece_figee before insert or update or delete on public.pieces_vente
  for each row execute function public.piece_figee();

-- Statut et type d'une pièce, avec verrou partagé (une validation concurrente attend, ou est attendue).
create or replace function public.statut_piece_verrouille(p_piece uuid)
returns table (statut public.statut_piece, type_piece public.type_piece)
language sql security definer set search_path = '' as $$
  select p.statut, p.type_piece from public.pieces_vente p where p.id = p_piece for share;
$$;

-- Lignes : modifiables seulement en brouillon (pour tous) ; par l'API, ni prix, ni rattachement, ni retour
-- « livraison » (calculé), et pas d'ajout libre de ligne dans un avoir.
create or replace function public.ligne_piece_modifiable()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_api boolean := public.est_acces_api();
  v_statut public.statut_piece;
  v_type public.type_piece;
begin
  select s.statut, s.type_piece into v_statut, v_type from public.statut_piece_verrouille(coalesce(new.piece_id, old.piece_id)) s;
  if v_statut <> 'brouillon' then raise exception 'Pièce validée : ses lignes ne peuvent plus être modifiées.' using errcode = '22023'; end if;
  if v_api then
    if tg_op = 'INSERT' then
      if v_type = 'avoir' then
        raise exception 'Les lignes d''un avoir viennent de la facture : créez l''avoir depuis la facture.' using errcode = '42501';
      end if;
      if new.origine_ligne_id is not null or new.retour_livraison_paquets <> 0 then
        raise exception 'Rattachement de ligne réservé aux fonctions de la base.' using errcode = '42501';
      end if;
    elsif tg_op = 'UPDATE' then
      if new.piece_id is distinct from old.piece_id or new.origine_ligne_id is distinct from old.origine_ligne_id
         or new.prix_paquet_gnf is distinct from old.prix_paquet_gnf
         or new.retour_livraison_paquets is distinct from old.retour_livraison_paquets
         or (v_type = 'avoir' and new.conditionnement_id is distinct from old.conditionnement_id) then
        raise exception 'Le prix, le produit d''un avoir et le rattachement d''une ligne ne se modifient pas.' using errcode = '42501';
      end if;
    end if;
  end if;
  return coalesce(new, old);
end $$;

-- -----------------------------------------------------------------------------
-- 3. Annulation et transformation : fonctions contrôlées (les écritures directes ne le permettent plus)
-- -----------------------------------------------------------------------------
create or replace function public.annuler_piece(p_piece uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_piece public.pieces_vente%rowtype;
begin
  if not public.peut_ecrire_piece(p_piece) then
    raise exception 'Vous n''avez pas les droits sur cette pièce.' using errcode = '42501';
  end if;
  select * into v_piece from public.pieces_vente where id = p_piece for update;
  if v_piece.id is null then raise exception 'Pièce introuvable.' using errcode = '22023'; end if;
  if v_piece.statut = 'annule' then raise exception 'Cette pièce est déjà annulée.' using errcode = '22023'; end if;
  if v_piece.type_piece in ('facture', 'avoir') and v_piece.statut = 'valide' then
    raise exception 'Une facture validée ne s''annule pas : établissez un avoir.' using errcode = '22023';
  end if;
  if exists (select 1 from public.livraisons where commande_id = p_piece and statut = 'validee') then
    raise exception 'Cette commande a déjà été livrée : elle ne peut plus être annulée.' using errcode = '22023';
  end if;
  update public.pieces_vente set statut = 'annule' where id = p_piece;
end $$;

-- Crée la pièce suivante (devis → commande, commande → facture, devis → facture, facture → avoir).
-- Avoir : une ligne par ligne de facture encore créditable, rattachée à elle, au prix facturé, pour la
-- quantité restant à créditer ; retour en stock à 0 (à indiquer s'il y a un nouveau retour à l'usine).
create or replace function public.transformer_piece(p_piece uuid, p_type public.type_piece)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_piece public.pieces_vente%rowtype;
  v_id uuid;
begin
  if not public.peut_ecrire_piece(p_piece) then
    raise exception 'Vous n''avez pas les droits sur cette pièce.' using errcode = '42501';
  end if;
  if p_type = 'avoir' and not public.a_un_role('finance', 'responsable_commercial') then
    raise exception 'Seuls la comptabilité et le responsable commercial établissent un avoir.' using errcode = '42501';
  end if;
  select * into v_piece from public.pieces_vente where id = p_piece for update;
  if v_piece.id is null or v_piece.statut <> 'valide' then raise exception 'Validez d''abord la pièce d''origine.' using errcode = '22023'; end if;
  if not ((v_piece.type_piece = 'devis' and p_type = 'commande') or (v_piece.type_piece = 'commande' and p_type = 'facture')
          or (v_piece.type_piece = 'devis' and p_type = 'facture') or (v_piece.type_piece = 'facture' and p_type = 'avoir')) then
    raise exception 'Transformation impossible.' using errcode = '22023';
  end if;
  if p_type <> 'avoir' and exists (select 1 from public.pieces_vente where origine_id = p_piece and type_piece = p_type and statut <> 'annule') then
    raise exception 'Cette pièce a déjà été transformée.' using errcode = '22023';
  end if;
  if p_type = 'avoir' and not exists (
       select 1 from public.lignes_piece l
       where l.piece_id = p_piece
         and l.paquets > coalesce((select sum(la.paquets) from public.lignes_piece la join public.pieces_vente a on a.id = la.piece_id
                                   where la.origine_ligne_id = l.id and a.statut = 'valide'), 0)) then
    raise exception 'Cette facture est déjà entièrement créditée.' using errcode = '22023';
  end if;

  insert into public.pieces_vente (type_piece, client_id, origine_id, commercial_id, notes)
  values (p_type, v_piece.client_id, p_piece, v_piece.commercial_id, v_piece.notes)
  returning id into v_id;

  if p_type = 'avoir' then
    insert into public.lignes_piece (piece_id, conditionnement_id, quantite_colis, paquets_vrac, paquets, prix_paquet_gnf, montant_ht_gnf, origine_ligne_id)
    select v_id, x.conditionnement_id, x.reste / x.ppc, x.reste % x.ppc, 1, x.prix_paquet_gnf, 0, x.id
    from (select l.id, l.conditionnement_id, l.prix_paquet_gnf, k.paquets_par_colis as ppc,
                 l.paquets - coalesce((select sum(la.paquets) from public.lignes_piece la join public.pieces_vente a on a.id = la.piece_id
                                       where la.origine_ligne_id = l.id and a.statut = 'valide'), 0) as reste, l.created_at
          from public.lignes_piece l join public.conditionnements k on k.id = l.conditionnement_id
          where l.piece_id = p_piece) x
    where x.reste > 0
    order by x.created_at;
  else
    -- Prix d'origine conservés (le client a accepté ce prix).
    insert into public.lignes_piece (piece_id, conditionnement_id, quantite_colis, paquets_vrac, paquets, prix_paquet_gnf, montant_ht_gnf)
    select v_id, conditionnement_id, quantite_colis, paquets_vrac, paquets, prix_paquet_gnf, 0
    from public.lignes_piece where piece_id = p_piece
    order by created_at;
  end if;
  return v_id;
end $$;

-- -----------------------------------------------------------------------------
-- 4. Remboursements clients (crédit client rendu en argent : saisi, jamais automatique)
-- -----------------------------------------------------------------------------
create table public.remboursements_clients (
  id                 uuid primary key default gen_random_uuid(),
  facture_id         uuid not null references public.pieces_vente (id),
  date_remboursement date not null default public.aujourdhui_conakry(),
  montant_gnf        bigint not null check (montant_gnf > 0),
  mode_id            uuid not null references public.modes_paiement (id),
  reference          text not null default '',
  notes              text not null default '',
  cle_idempotence    uuid unique,
  saisi_par          uuid references public.profils (id) default auth.uid(),
  created_at         timestamptz not null default now()
);
create index remboursements_facture_idx on public.remboursements_clients (facture_id);
alter table public.remboursements_clients enable row level security;
create policy remboursements_lecture on public.remboursements_clients for select to authenticated
  using (public.a_un_role('finance', 'responsable_commercial'));
revoke insert, update, delete on public.remboursements_clients from anon, authenticated;
select public.activer_audit('public.remboursements_clients');

alter table public.mouvements_tresorerie add column remboursement_id uuid unique references public.remboursements_clients (id);

-- -----------------------------------------------------------------------------
-- 5. État des factures : reste dû et crédit client explicites (le crédit n'est plus masqué par un solde à zéro)
--    Encaissé net = paiements − remboursements ; dû net = TTC − avoirs.
-- -----------------------------------------------------------------------------
create or replace view public.factures_etat with (security_invoker = true) as
select f.id, f.numero, f.client_id, c.nom as client_nom, c.code as client_code, f.date_piece, f.date_echeance,
       f.total_ht_gnf, f.total_tva_gnf, f.total_ttc_gnf, f.commercial_id,
       x.paye_gnf, x.avoirs_gnf,
       greatest(0, f.total_ttc_gnf - x.avoirs_gnf - (x.paye_gnf - x.rembourse_gnf))::bigint as solde_gnf,
       greatest(0, public.aujourdhui_conakry() - f.date_echeance) as jours_retard,
       x.rembourse_gnf,
       greatest(0, (x.paye_gnf - x.rembourse_gnf) - (f.total_ttc_gnf - x.avoirs_gnf))::bigint as credit_client_gnf
from public.pieces_vente f
join public.clients c on c.id = f.client_id
cross join lateral (
  select coalesce((select sum(p.montant_gnf) from public.paiements p where p.facture_id = f.id), 0)::bigint as paye_gnf,
         coalesce((select sum(a.total_ttc_gnf) from public.pieces_vente a where a.origine_id = f.id and a.type_piece = 'avoir' and a.statut = 'valide'), 0)::bigint as avoirs_gnf,
         coalesce((select sum(r.montant_gnf) from public.remboursements_clients r where r.facture_id = f.id), 0)::bigint as rembourse_gnf
) x
where f.type_piece = 'facture' and f.statut = 'valide';

create or replace view public.soldes_clients with (security_invoker = true) as
select c.id as client_id, c.code, c.nom, c.condition_paiement, c.plafond_credit_gnf, c.commercial_id,
       coalesce(sum(fe.solde_gnf), 0)::bigint as encours_gnf,
       coalesce(sum(fe.solde_gnf) filter (where fe.jours_retard > 0), 0)::bigint as echu_gnf,
       max(fe.jours_retard) as retard_max_jours,
       coalesce(sum(fe.credit_client_gnf), 0)::bigint as credit_client_gnf
from public.clients c
left join public.factures_etat fe on fe.client_id = c.id
group by c.id;

-- Montants d'une facture lus sous verrou (paiements, avoirs, remboursements concurrents sérialisés).
create or replace function public.montants_facture(p_facture uuid, out ttc bigint, out paye bigint, out avoirs bigint, out rembourse bigint)
language plpgsql security definer set search_path = '' as $$
begin
  select f.total_ttc_gnf into ttc from public.pieces_vente f
   where f.id = p_facture and f.type_piece = 'facture' and f.statut = 'valide' for update;
  if ttc is null then raise exception 'Facture introuvable ou non validée.' using errcode = '22023'; end if;
  paye := coalesce((select sum(montant_gnf) from public.paiements where facture_id = p_facture), 0);
  avoirs := coalesce((select sum(total_ttc_gnf) from public.pieces_vente where origine_id = p_facture and type_piece = 'avoir' and statut = 'valide'), 0);
  rembourse := coalesce((select sum(montant_gnf) from public.remboursements_clients where facture_id = p_facture), 0);
end $$;
revoke execute on function public.montants_facture(uuid) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 6. Retours : ce qui reste à livrer déduit les paquets rapportés crédités par un avoir (on ne les relivre pas)
-- -----------------------------------------------------------------------------
create or replace view public.reste_a_livrer with (security_invoker = true) as
select l.piece_id as commande_id, l.conditionnement_id,
       sum(l.paquets)
         - coalesce((select sum(ll.paquets - ll.paquets_retournes) from public.lignes_livraison ll join public.livraisons lv on lv.id = ll.livraison_id
                     where lv.commande_id = l.piece_id and lv.statut = 'validee' and ll.conditionnement_id = l.conditionnement_id), 0)
         - coalesce((select sum(la.retour_livraison_paquets) from public.lignes_piece la
                     join public.pieces_vente a on a.id = la.piece_id and a.type_piece = 'avoir' and a.statut = 'valide'
                     join public.pieces_vente f on f.id = a.origine_id
                     where f.origine_id = l.piece_id and la.conditionnement_id = l.conditionnement_id), 0) as paquets_restants,
       sum(l.paquets) as paquets_commandes
from public.lignes_piece l
group by l.piece_id, l.conditionnement_id;

-- Une seule entrée de stock par (document, article) pour les retours : un retour physique n'est compté qu'une fois.
create unique index mouvements_stock_retour_unique on public.mouvements_stock (document_type, document_id, article_id)
  where type = 'retour' and document_type in ('avoir', 'livraison');

-- Remise : identique, avec retours regroupés par article (une seule entrée par article et par bon).
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

  -- Retour en stock des paquets rapportés (une entrée par article).
  insert into public.mouvements_stock (type, article_id, quantite, unite, motif, document_type, document_id, auteur_id)
  select 'retour', a.id, sum(ll.paquets_retournes), 'paquet', 'Retour de livraison ' || v_l.numero, 'livraison', p_livraison, auth.uid()
  from public.lignes_livraison ll join public.articles a on a.conditionnement_id = ll.conditionnement_id
  where ll.livraison_id = p_livraison and ll.paquets_retournes > 0
  group by a.id;

  update public.livraisons set statut_remise = p_statut, remise_le = now(), remis_par = auth.uid(),
         receptionnaire = trim(coalesce(p_receptionnaire, '')), signature_chemin = p_signature, photo_chemin = p_photo,
         latitude = p_latitude, longitude = p_longitude, precision_m = p_precision, commentaire_remise = coalesce(p_commentaire, '')
   where id = p_livraison;
end $$;

-- -----------------------------------------------------------------------------
-- 7. Analyse d'un avoir (même calcul pour l'aperçu à l'écran et pour la validation)
--    Par conditionnement, à partir de la commande facturée et de ses bons de livraison validés :
--      déjà revenus disponibles = min(paquets rapportés non encore crédités, reste à livrer) → rattachés d'office ;
--      détenus par le client    = livrés − rapportés − déjà repris par avoir → plafond d'un nouveau retour en stock.
--    Sans commande livrée (facture directe, facture terrain), rien n'est sorti du stock : pas de retour possible.
-- -----------------------------------------------------------------------------
create or replace function public.analyser_avoir(p_avoir uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_a public.pieces_vente%rowtype;
  v_f public.pieces_vente%rowtype;
  v_commande uuid;
  v_ligne record;
  v_pool_liv jsonb := '{}'::jsonb;
  v_pool_stock jsonb := '{}'::jsonb;
  v_lignes jsonb := '[]'::jsonb;
  v_erreurs jsonb := '[]'::jsonb;
  v_liv integer; v_stock_max integer; v_max integer;
  v_ht bigint := 0; v_tva bigint; v_ttc bigint;
  v_prev_ht bigint; v_prev_tva bigint; v_prev_ttc bigint;
  v_fact_paquets bigint; v_credites bigint; v_ces_paquets bigint := 0;
  v_paye bigint; v_rembourse bigint; v_reste_du bigint; v_credit_avant bigint; v_reduction bigint;
  v_nb_retour integer := 0; v_nb_deja integer := 0;
begin
  if not public.a_un_role('finance', 'responsable_commercial') then
    raise exception 'Vous n''avez pas les droits pour établir un avoir.' using errcode = '42501';
  end if;
  select * into v_a from public.pieces_vente where id = p_avoir and type_piece = 'avoir';
  if v_a.id is null then raise exception 'Avoir introuvable.' using errcode = '22023'; end if;
  select * into v_f from public.pieces_vente where id = v_a.origine_id;
  if v_f.id is null or v_f.type_piece <> 'facture' or v_f.statut <> 'valide' then
    v_erreurs := v_erreurs || to_jsonb('L''avoir doit porter sur une facture validée.'::text);
    return jsonb_build_object('erreurs', v_erreurs, 'lignes', v_lignes);
  end if;
  if v_f.client_id <> v_a.client_id then
    v_erreurs := v_erreurs || to_jsonb('L''avoir et la facture doivent concerner le même client.'::text);
  end if;
  select id into v_commande from public.pieces_vente where id = v_f.origine_id and type_piece = 'commande';

  -- Réserves par conditionnement (clé = id du conditionnement).
  if v_commande is not null then
    select coalesce(jsonb_object_agg(k.cid, greatest(0, least(k.rapportes - k.attribues, k.reste))), '{}'::jsonb),
           coalesce(jsonb_object_agg(k.cid, greatest(0, k.livres - k.rapportes - k.repris)), '{}'::jsonb)
      into v_pool_liv, v_pool_stock
    from (
      select c.cid,
             coalesce((select sum(ll.paquets) from public.lignes_livraison ll join public.livraisons lv on lv.id = ll.livraison_id
                       where lv.commande_id = v_commande and lv.statut = 'validee' and ll.conditionnement_id = c.cid), 0) as livres,
             coalesce((select sum(ll.paquets_retournes) from public.lignes_livraison ll join public.livraisons lv on lv.id = ll.livraison_id
                       where lv.commande_id = v_commande and lv.statut = 'validee' and ll.conditionnement_id = c.cid), 0) as rapportes,
             coalesce((select sum(la.retour_livraison_paquets) from public.lignes_piece la join public.pieces_vente a on a.id = la.piece_id
                       where a.origine_id = v_f.id and a.type_piece = 'avoir' and a.statut = 'valide' and la.conditionnement_id = c.cid), 0) as attribues,
             coalesce((select sum(la.retour_stock_paquets) from public.lignes_piece la join public.pieces_vente a on a.id = la.piece_id
                       where a.origine_id = v_f.id and a.type_piece = 'avoir' and a.statut = 'valide' and la.conditionnement_id = c.cid), 0) as repris,
             coalesce((select r.paquets_restants from public.reste_a_livrer r where r.commande_id = v_commande and r.conditionnement_id = c.cid), 0) as reste
      from (select distinct conditionnement_id as cid from public.lignes_piece where piece_id = p_avoir) c
    ) k;
  end if;

  for v_ligne in
    select l.*, o.piece_id as o_piece, o.conditionnement_id as o_cond, o.prix_paquet_gnf as o_prix, o.paquets as o_paquets,
           k.libelle as cond_libelle, pr.libelle as produit_libelle,
           coalesce((select sum(la.paquets) from public.lignes_piece la join public.pieces_vente a on a.id = la.piece_id
                     where la.origine_ligne_id = l.origine_ligne_id and a.statut = 'valide'), 0) as deja_credites
    from public.lignes_piece l
    left join public.lignes_piece o on o.id = l.origine_ligne_id
    join public.conditionnements k on k.id = l.conditionnement_id
    join public.produits pr on pr.id = k.produit_id
    where l.piece_id = p_avoir
    order by l.created_at, l.id
  loop
    v_max := greatest(0, coalesce(v_ligne.o_paquets, 0) - v_ligne.deja_credites);
    if v_ligne.o_piece is distinct from v_f.id then
      v_erreurs := v_erreurs || to_jsonb(format('%s – %s : ligne sans rattachement à la facture (recréez l''avoir depuis la facture).', v_ligne.produit_libelle, v_ligne.cond_libelle));
    elsif v_ligne.o_cond <> v_ligne.conditionnement_id or v_ligne.o_prix <> v_ligne.prix_paquet_gnf then
      v_erreurs := v_erreurs || to_jsonb(format('%s – %s : le produit et le prix doivent être ceux de la facture.', v_ligne.produit_libelle, v_ligne.cond_libelle));
    elsif v_ligne.paquets > v_max then
      v_erreurs := v_erreurs || to_jsonb(format('%s – %s : %s paquets à créditer au plus (déjà crédités : %s).', v_ligne.produit_libelle, v_ligne.cond_libelle,
                                               public.nombre_fr(v_max), public.nombre_fr(v_ligne.deja_credites)));
    end if;
    v_liv := least(v_ligne.paquets, coalesce((v_pool_liv ->> v_ligne.conditionnement_id::text)::integer, 0));
    v_pool_liv := jsonb_set(v_pool_liv, array[v_ligne.conditionnement_id::text], to_jsonb(coalesce((v_pool_liv ->> v_ligne.conditionnement_id::text)::integer, 0) - v_liv));
    v_stock_max := least(v_ligne.paquets - v_liv, coalesce((v_pool_stock ->> v_ligne.conditionnement_id::text)::integer, 0));
    if v_ligne.retour_stock_paquets > v_stock_max then
      v_erreurs := v_erreurs || to_jsonb(format('%s – %s : retour en stock de %s paquets impossible, %s au plus%s.', v_ligne.produit_libelle, v_ligne.cond_libelle,
        public.nombre_fr(v_ligne.retour_stock_paquets), public.nombre_fr(v_stock_max),
        case when v_liv > 0 then format(' (%s paquets sont déjà revenus en stock à la livraison)', public.nombre_fr(v_liv))
             when v_commande is null then ' (aucune livraison enregistrée pour cette facture)' else '' end));
    else
      v_pool_stock := jsonb_set(v_pool_stock, array[v_ligne.conditionnement_id::text], to_jsonb(coalesce((v_pool_stock ->> v_ligne.conditionnement_id::text)::integer, 0) - v_ligne.retour_stock_paquets));
    end if;
    v_nb_deja := v_nb_deja + v_liv;
    v_nb_retour := v_nb_retour + least(v_ligne.retour_stock_paquets, v_stock_max);
    v_ces_paquets := v_ces_paquets + v_ligne.paquets;
    v_ht := v_ht + v_ligne.montant_ht_gnf;
    v_lignes := v_lignes || jsonb_build_object(
      'ligne_id', v_ligne.id, 'conditionnement_id', v_ligne.conditionnement_id, 'paquets', v_ligne.paquets,
      'max_creditable', v_max, 'retour_livraison', v_liv, 'retour_stock', v_ligne.retour_stock_paquets, 'retour_stock_max', v_stock_max);
  end loop;
  if jsonb_array_length(v_lignes) = 0 then v_erreurs := v_erreurs || to_jsonb('L''avoir ne contient aucune ligne.'::text); end if;

  -- Totaux : TVA de la facture ; l'avoir qui termine de tout créditer reprend exactement le reste (pas d'écart d'arrondi).
  select coalesce(sum(total_ht_gnf), 0), coalesce(sum(total_tva_gnf), 0), coalesce(sum(total_ttc_gnf), 0)
    into v_prev_ht, v_prev_tva, v_prev_ttc
  from public.pieces_vente where origine_id = v_f.id and type_piece = 'avoir' and statut = 'valide' and id <> p_avoir;
  select coalesce(sum(paquets), 0) into v_fact_paquets from public.lignes_piece where piece_id = v_f.id;
  select coalesce(sum(la.paquets), 0) into v_credites from public.lignes_piece la join public.pieces_vente a on a.id = la.piece_id
   where a.origine_id = v_f.id and a.type_piece = 'avoir' and a.statut = 'valide' and a.id <> p_avoir;
  if v_credites + v_ces_paquets = v_fact_paquets and jsonb_array_length(v_erreurs) = 0 then
    v_ht := v_f.total_ht_gnf - v_prev_ht;
    v_tva := v_f.total_tva_gnf - v_prev_tva;
  else
    v_tva := round(v_ht * v_f.tva_taux);
  end if;
  v_ttc := v_ht + v_tva;
  if v_prev_ttc + v_ttc > v_f.total_ttc_gnf then
    v_erreurs := v_erreurs || to_jsonb(format('L''avoir (%s GNF) dépasse le montant encore créditable de la facture (%s GNF).',
      public.nombre_fr(v_ttc), public.nombre_fr(v_f.total_ttc_gnf - v_prev_ttc)));
  end if;

  -- Conséquences financières : réduction de la créance d'abord, le reste devient un crédit client.
  v_paye := coalesce((select sum(montant_gnf) from public.paiements where facture_id = v_f.id), 0);
  v_rembourse := coalesce((select sum(montant_gnf) from public.remboursements_clients where facture_id = v_f.id), 0);
  v_reste_du := greatest(0, v_f.total_ttc_gnf - v_prev_ttc - (v_paye - v_rembourse));
  v_credit_avant := greatest(0, (v_paye - v_rembourse) - (v_f.total_ttc_gnf - v_prev_ttc));
  v_reduction := least(greatest(v_ttc, 0), v_reste_du);

  return jsonb_build_object(
    'facture_id', v_f.id, 'facture_numero', v_f.numero, 'commande_id', v_commande,
    'lignes', v_lignes, 'erreurs', v_erreurs,
    'total_ht_gnf', v_ht, 'total_tva_gnf', v_tva, 'total_ttc_gnf', v_ttc, 'tva_taux', v_f.tva_taux,
    'reste_du_avant_gnf', v_reste_du, 'credit_client_avant_gnf', v_credit_avant,
    'reduction_creance_gnf', v_reduction, 'credit_client_gnf', greatest(v_ttc, 0) - v_reduction,
    'paquets_retour_stock', v_nb_retour, 'paquets_deja_revenus', v_nb_deja);
end $$;

-- -----------------------------------------------------------------------------
-- 8. Validation unique (devis, commande, facture, AVOIR) : numéro définitif, totaux, contrôles
-- -----------------------------------------------------------------------------
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
    if v_piece.type_piece <> 'avoir' and exists (select 1 from public.pieces_vente where origine_id = v_piece.origine_id
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

-- Ancien point d'entrée des avoirs : même circuit. p_retour_stock = false annule tout nouveau retour en stock
-- (avoir purement financier) ; true ne force plus rien : le retour se saisit ligne par ligne.
create or replace function public.valider_avoir(p_avoir uuid, p_retour_stock boolean default true)
returns text language plpgsql security definer set search_path = '' as $$
begin
  if not public.a_un_role('finance', 'responsable_commercial') then
    raise exception 'Vous n''avez pas les droits pour valider un avoir.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.pieces_vente where id = p_avoir and type_piece = 'avoir') then
    raise exception 'Avoir introuvable.' using errcode = '22023';
  end if;
  if p_retour_stock is false then
    update public.lignes_piece set retour_stock_paquets = 0
     where piece_id = p_avoir and retour_stock_paquets <> 0
       and exists (select 1 from public.pieces_vente where id = p_avoir and statut = 'brouillon');
  end if;
  return public.valider_piece(p_avoir);
end $$;

-- -----------------------------------------------------------------------------
-- 9. Encaissements : un seul chemin, contrôles en base quel que soit le chemin, concurrence et idempotence
-- -----------------------------------------------------------------------------
drop policy if exists paiements_ajout on public.paiements;
revoke insert, update, delete on public.paiements from anon, authenticated, service_role;

create or replace function public.controler_paiement()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_m record;
  v_reste bigint;
begin
  if public.est_acces_api() then
    raise exception 'Un paiement s''enregistre par la fonction prévue (Ventes → facture → Enregistrer un paiement).' using errcode = '42501';
  end if;
  if new.montant_gnf is null or new.montant_gnf <= 0 then
    raise exception 'Le montant doit être strictement positif.' using errcode = '22023';
  end if;
  select * into v_m from public.montants_facture(new.facture_id);
  v_reste := v_m.ttc - v_m.avoirs - (v_m.paye - v_m.rembourse);
  if new.montant_gnf > v_reste then
    raise exception 'Le montant (% GNF) dépasse le reste à payer (% GNF).', public.nombre_fr(new.montant_gnf), public.nombre_fr(greatest(v_reste, 0)) using errcode = '22023';
  end if;
  new.saisi_par := coalesce(new.saisi_par, auth.uid());
  return new;
end $$;
create trigger paiements_controle before insert on public.paiements for each row execute function public.controler_paiement();

create or replace function public.interdire_modification()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'Enregistrement inaltérable : passez une opération inverse (avoir, remboursement).' using errcode = '42501';
end $$;
create trigger paiements_inalterables before update or delete on public.paiements for each row execute function public.interdire_modification();
create trigger remboursements_inalterables before update or delete on public.remboursements_clients for each row execute function public.interdire_modification();

drop function if exists public.enregistrer_paiement(uuid, bigint, uuid, date, text, text);
create function public.enregistrer_paiement(
  p_facture uuid, p_montant bigint, p_mode uuid, p_date date default public.aujourdhui_conakry(),
  p_reference text default '', p_notes text default '', p_cle uuid default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_existant public.paiements%rowtype;
  v_id uuid;
begin
  if not public.a_un_role('finance') then
    raise exception 'Seule la comptabilité (ou la direction) enregistre les paiements.' using errcode = '42501';
  end if;
  if p_montant is null or p_montant <= 0 then raise exception 'Le montant doit être strictement positif.' using errcode = '22023'; end if;
  if not exists (select 1 from public.modes_paiement where id = p_mode and actif) then
    raise exception 'Mode de paiement inconnu ou archivé.' using errcode = '22023';
  end if;
  -- Verrou de la facture d'abord : deux saisies simultanées passent l'une après l'autre.
  perform public.montants_facture(p_facture);
  if p_cle is not null then
    select * into v_existant from public.paiements where cle_idempotence = p_cle;
    if v_existant.id is not null then
      if v_existant.facture_id <> p_facture or v_existant.montant_gnf <> p_montant then
        raise exception 'Cette saisie a déjà servi pour un autre paiement : rechargez la page.' using errcode = '22023';
      end if;
      return v_existant.id; -- même soumission renvoyée : pas de doublon
    end if;
  end if;
  insert into public.paiements (facture_id, montant_gnf, mode_id, date_paiement, reference, notes, cle_idempotence, saisi_par)
  values (p_facture, p_montant, p_mode, coalesce(p_date, public.aujourdhui_conakry()), coalesce(p_reference, ''), coalesce(p_notes, ''), p_cle, auth.uid())
  returning id into v_id;
  perform public.calculer_dotation_facture(p_facture);
  return v_id;
end $$;
revoke execute on function public.enregistrer_paiement(uuid, bigint, uuid, date, text, text, uuid) from public, anon;
grant execute on function public.enregistrer_paiement(uuid, bigint, uuid, date, text, text, uuid) to authenticated;

-- Trésorerie : l'encaissement va sur le compte du mode de paiement (à défaut, la première caisse GNF).
-- Sans compte de trésorerie, l'encaissement est refusé (sinon la trésorerie ne refléterait pas l'argent reçu).
create or replace function public.compte_du_mode(p_mode uuid)
returns uuid language sql stable set search_path = '' as $$
  select coalesce(m.compte_id, (select id from public.comptes_tresorerie where type_compte = 'caisse' and devise = 'GNF' and actif order by ordre limit 1))
  from public.modes_paiement m where m.id = p_mode;
$$;

create or replace function public.paiement_vers_tresorerie() returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_compte uuid := public.compte_du_mode(new.mode_id);
  v_facture text;
  v_client text;
begin
  if v_compte is null then
    raise exception 'Aucun compte de trésorerie pour ce mode de paiement : paramétrez-le dans Finance → Configuration.' using errcode = '22023';
  end if;
  select f.numero, c.nom into v_facture, v_client from public.pieces_vente f join public.clients c on c.id = f.client_id where f.id = new.facture_id;
  insert into public.mouvements_tresorerie (compte_id, date_operation, sens, montant, taux_change, montant_gnf, origine, paiement_id, libelle, reference, saisi_par)
  select v_compte, new.date_paiement, 'entree', cv.montant, cv.taux, new.montant_gnf, 'client', new.id,
         'Encaissement ' || coalesce(v_facture, '') || ' – ' || coalesce(v_client, ''), new.reference, new.saisi_par
  from public.convertir_pour_compte(v_compte, new.montant_gnf, new.date_paiement) cv;
  return new;
end $$;

-- -----------------------------------------------------------------------------
-- 10. Remboursement d'un crédit client (opération saisie, sortie de trésorerie)
-- -----------------------------------------------------------------------------
create or replace function public.enregistrer_remboursement(
  p_facture uuid, p_montant bigint, p_mode uuid, p_date date default public.aujourdhui_conakry(),
  p_reference text default '', p_notes text default '', p_cle uuid default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_m record;
  v_credit bigint;
  v_existant public.remboursements_clients%rowtype;
  v_id uuid;
begin
  if not public.a_un_role('finance') then
    raise exception 'Seule la comptabilité (ou la direction) enregistre un remboursement.' using errcode = '42501';
  end if;
  if p_montant is null or p_montant <= 0 then raise exception 'Le montant doit être strictement positif.' using errcode = '22023'; end if;
  if not exists (select 1 from public.modes_paiement where id = p_mode and actif) then
    raise exception 'Mode de paiement inconnu ou archivé.' using errcode = '22023';
  end if;
  select * into v_m from public.montants_facture(p_facture);
  if p_cle is not null then
    select * into v_existant from public.remboursements_clients where cle_idempotence = p_cle;
    if v_existant.id is not null then
      if v_existant.facture_id <> p_facture or v_existant.montant_gnf <> p_montant then
        raise exception 'Cette saisie a déjà servi pour un autre remboursement : rechargez la page.' using errcode = '22023';
      end if;
      return v_existant.id;
    end if;
  end if;
  v_credit := (v_m.paye - v_m.rembourse) - (v_m.ttc - v_m.avoirs);
  if p_montant > v_credit then
    raise exception 'Le remboursement (% GNF) dépasse le crédit du client sur cette facture (% GNF).', public.nombre_fr(p_montant), public.nombre_fr(greatest(v_credit, 0)) using errcode = '22023';
  end if;
  insert into public.remboursements_clients (facture_id, montant_gnf, mode_id, date_remboursement, reference, notes, cle_idempotence, saisi_par)
  values (p_facture, p_montant, p_mode, coalesce(p_date, public.aujourdhui_conakry()), coalesce(p_reference, ''), coalesce(p_notes, ''), p_cle, auth.uid())
  returning id into v_id;
  return v_id;
end $$;
revoke execute on function public.enregistrer_remboursement(uuid, bigint, uuid, date, text, text, uuid) from public, anon;

create or replace function public.remboursement_vers_tresorerie() returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_compte uuid := public.compte_du_mode(new.mode_id);
  v_facture text;
  v_client text;
begin
  if v_compte is null then
    raise exception 'Aucun compte de trésorerie pour ce mode de paiement : paramétrez-le dans Finance → Configuration.' using errcode = '22023';
  end if;
  select f.numero, c.nom into v_facture, v_client from public.pieces_vente f join public.clients c on c.id = f.client_id where f.id = new.facture_id;
  insert into public.mouvements_tresorerie (compte_id, date_operation, sens, montant, taux_change, montant_gnf, origine, remboursement_id, libelle, reference, saisi_par)
  select v_compte, new.date_remboursement, 'sortie', cv.montant, cv.taux, new.montant_gnf, 'client', new.id,
         'Remboursement ' || coalesce(v_facture, '') || ' – ' || coalesce(v_client, ''), new.reference, new.saisi_par
  from public.convertir_pour_compte(v_compte, new.montant_gnf, new.date_remboursement) cv;
  return new;
end $$;
create trigger remboursement_tresorerie after insert on public.remboursements_clients for each row execute function public.remboursement_vers_tresorerie();
revoke execute on function public.remboursement_vers_tresorerie() from public, anon, authenticated;
revoke execute on function public.paiement_vers_tresorerie() from public, anon, authenticated;
revoke execute on function public.controler_paiement() from public, anon, authenticated;
