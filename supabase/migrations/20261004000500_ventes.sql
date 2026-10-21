-- =============================================================================
-- Papel ERP — Migration 5 : ventes
-- Types de clients et modes de paiement (listes modifiables), clients, numérotation sans trou,
-- pièces de vente (devis → commande → facture, avoirs), livraisons (sorties de stock),
-- paiements saisis au bureau, dotation sur montants encaissés, relances.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Listes de référence
-- -----------------------------------------------------------------------------
create table public.types_clients (
  id          uuid primary key default gen_random_uuid(),
  libelle     text not null unique check (length(trim(libelle)) > 0),
  -- Niveau de prix appliqué à ce type de client (par défaut : prix Papel).
  niveau_prix text not null default 'papel' references public.niveaux_prix (code),
  -- Ce type de client reçoit la dotation (X paquets offerts pour 100 achetés, sur l'encaissé).
  dotation    boolean not null default false,
  ordre       smallint not null default 0,
  actif       boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.modes_paiement (
  id         uuid primary key default gen_random_uuid(),
  libelle    text not null unique check (length(trim(libelle)) > 0),
  ordre      smallint not null default 0,
  actif      boolean not null default true,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Numérotation continue et sans trou (verrou de ligne : deux factures ne peuvent pas avoir le même numéro).
-- -----------------------------------------------------------------------------
create table public.compteurs (
  prefixe text primary key,
  valeur  integer not null default 0
);

create or replace function public.prochain_numero(p_prefixe text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v integer;
begin
  insert into public.compteurs (prefixe, valeur) values (p_prefixe, 1)
  on conflict (prefixe) do update set valeur = public.compteurs.valeur + 1
  returning valeur into v;
  return p_prefixe || lpad(v::text, 5, '0');
end $$;
revoke execute on function public.prochain_numero(text) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Clients
-- -----------------------------------------------------------------------------
create sequence public.clients_seq;

create table public.clients (
  id                  uuid primary key default gen_random_uuid(),
  code                text not null unique default ('CL-' || lpad(nextval('public.clients_seq')::text, 5, '0')),
  nom                 text not null check (length(trim(nom)) > 0),
  type_client_id      uuid not null references public.types_clients (id),
  responsable         text not null default '',
  telephone           text not null default '',
  adresse             text not null default '',
  quartier_id         uuid references public.quartiers (id),
  nif                 text not null default '',
  condition_paiement  text not null default 'comptant' check (condition_paiement in ('comptant', 'credit')),
  delai_paiement_jours integer not null default 0 check (delai_paiement_jours between 0 and 180),
  plafond_credit_gnf  bigint not null default 0 check (plafond_credit_gnf >= 0),
  commercial_id       uuid references public.profils (id),
  notes               text not null default '',
  actif               boolean not null default true,
  created_by          uuid references public.profils (id) default auth.uid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create trigger clients_updated_at before update on public.clients
  for each row execute function public.maj_updated_at();

-- -----------------------------------------------------------------------------
-- Pièces de vente : devis, commande, facture, avoir (une seule table, comme Odoo)
-- -----------------------------------------------------------------------------
create type public.type_piece as enum ('devis', 'commande', 'facture', 'avoir');
create type public.statut_piece as enum ('brouillon', 'valide', 'annule');

create table public.pieces_vente (
  id            uuid primary key default gen_random_uuid(),
  type_piece    public.type_piece not null,
  numero        text unique,
  client_id     uuid not null references public.clients (id),
  date_piece    date not null default public.aujourdhui_conakry(),
  date_echeance date,
  statut        public.statut_piece not null default 'brouillon',
  -- Pièce d'origine : devis → commande → facture ; facture → avoir.
  origine_id    uuid references public.pieces_vente (id),
  commercial_id uuid references public.profils (id),
  tva_taux      numeric(5, 4) not null default 0 check (tva_taux >= 0 and tva_taux < 1),
  total_ht_gnf  bigint not null default 0,
  total_tva_gnf bigint not null default 0,
  total_ttc_gnf bigint not null default 0,
  notes         text not null default '',
  created_by    uuid references public.profils (id) default auth.uid(),
  valide_par    uuid references public.profils (id),
  valide_le     timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index pieces_client_idx on public.pieces_vente (client_id, date_piece desc);
create index pieces_type_date_idx on public.pieces_vente (type_piece, date_piece desc);
create trigger pieces_vente_updated_at before update on public.pieces_vente
  for each row execute function public.maj_updated_at();

create table public.lignes_piece (
  id                 uuid primary key default gen_random_uuid(),
  piece_id           uuid not null references public.pieces_vente (id) on delete cascade,
  conditionnement_id uuid not null references public.conditionnements (id),
  -- Quantité saisie : colis complets + paquets en vrac ; « paquets » = total (unité de référence).
  quantite_colis     integer not null default 0 check (quantite_colis >= 0),
  paquets_vrac       integer not null default 0 check (paquets_vrac >= 0),
  paquets            integer not null check (paquets > 0),
  -- Prix HT au paquet figé à la création (grille en vigueur pour le niveau du client).
  prix_paquet_gnf    bigint not null check (prix_paquet_gnf >= 0),
  montant_ht_gnf     bigint not null,
  created_at         timestamptz not null default now()
);

-- Calcule paquets et montant d'une ligne ; fige le prix de la grille si non fourni.
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
  return new;
end $$;
create trigger ligne_piece_calcul before insert or update on public.lignes_piece
  for each row execute function public.ligne_piece_calcul();

-- Une pièce validée ou annulée est figée (sauf annulation contrôlée par fonction).
create or replace function public.piece_figee()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    if old.statut <> 'brouillon' then raise exception 'Seul un brouillon peut être supprimé.' using errcode = '22023'; end if;
    return old;
  end if;
  if old.statut <> 'brouillon' and (
       new.client_id <> old.client_id or new.type_piece <> old.type_piece or new.total_ttc_gnf <> old.total_ttc_gnf
       or new.date_piece <> old.date_piece or new.numero is distinct from old.numero) then
    raise exception 'Pièce validée : elle ne peut plus être modifiée (faites un avoir).' using errcode = '22023';
  end if;
  return new;
end $$;
create trigger piece_figee before update or delete on public.pieces_vente
  for each row execute function public.piece_figee();

create or replace function public.ligne_piece_modifiable()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_statut public.statut_piece;
begin
  select statut into v_statut from public.pieces_vente where id = coalesce(new.piece_id, old.piece_id);
  if v_statut <> 'brouillon' then raise exception 'Pièce validée : ses lignes ne peuvent plus être modifiées.' using errcode = '22023'; end if;
  return coalesce(new, old);
end $$;
create trigger lignes_piece_modifiable before insert or update or delete on public.lignes_piece
  for each row execute function public.ligne_piece_modifiable();

-- Paramètre booléen / numérique
create or replace function public.parametre_num(p_cle text, p_defaut numeric)
returns numeric language sql stable set search_path = '' as $$
  select coalesce((select case jsonb_typeof(valeur) when 'boolean' then (case when valeur::text = 'true' then 1 else 0 end) else (valeur #>> '{}')::numeric end
                   from public.parametres where cle = p_cle), p_defaut);
$$;

-- Validation d'une pièce : numéro définitif, totaux, TVA, contrôle du plafond de crédit (factures).
create or replace function public.peut_ecrire_piece(p_piece uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.a_un_role('finance', 'responsable_commercial')
      or (public.a_role('commercial_terrain') and exists (
            select 1 from public.pieces_vente p where p.id = p_piece and p.commercial_id = (select auth.uid())));
$$;

-- security definer (numérotation protégée) : les droits sont contrôlés explicitement par peut_ecrire_piece.
create or replace function public.valider_piece(p_piece uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_piece  public.pieces_vente%rowtype;
  v_client public.clients%rowtype;
  v_ht     bigint;
  v_taux   numeric;
  v_tva    bigint;
  v_prefixe text;
  v_encours bigint;
begin
  if not public.peut_ecrire_piece(p_piece) then
    raise exception 'Vous n''avez pas les droits sur cette pièce.' using errcode = '42501';
  end if;
  select * into v_piece from public.pieces_vente where id = p_piece for update;
  if v_piece.id is null then raise exception 'Pièce introuvable.' using errcode = '22023'; end if;
  if v_piece.statut <> 'brouillon' then raise exception 'Cette pièce est déjà validée.' using errcode = '22023'; end if;
  select coalesce(sum(montant_ht_gnf), 0) into v_ht from public.lignes_piece where piece_id = p_piece;
  if v_ht <= 0 then raise exception 'La pièce ne contient aucune ligne.' using errcode = '22023'; end if;
  select * into v_client from public.clients where id = v_piece.client_id;

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

  v_prefixe := case v_piece.type_piece when 'devis' then 'DEV' when 'commande' then 'CMD' when 'facture' then 'FA' else 'AV' end
               || '-' || to_char(v_piece.date_piece, 'YYYY') || '-';
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

-- Crée la pièce suivante (devis → commande, commande → facture, facture → avoir) en recopiant les lignes.
create or replace function public.transformer_piece(p_piece uuid, p_type public.type_piece)
returns uuid language plpgsql set search_path = '' as $$
declare
  v_piece public.pieces_vente%rowtype;
  v_id uuid;
begin
  select * into v_piece from public.pieces_vente where id = p_piece;
  if v_piece.statut <> 'valide' then raise exception 'Validez d''abord la pièce d''origine.' using errcode = '22023'; end if;
  if not ((v_piece.type_piece = 'devis' and p_type = 'commande') or (v_piece.type_piece = 'commande' and p_type = 'facture')
          or (v_piece.type_piece = 'devis' and p_type = 'facture') or (v_piece.type_piece = 'facture' and p_type = 'avoir')) then
    raise exception 'Transformation impossible.' using errcode = '22023';
  end if;
  if p_type <> 'avoir' and exists (select 1 from public.pieces_vente where origine_id = p_piece and type_piece = p_type and statut <> 'annule') then
    raise exception 'Cette pièce a déjà été transformée.' using errcode = '22023';
  end if;
  insert into public.pieces_vente (type_piece, client_id, origine_id, commercial_id, notes)
  values (p_type, v_piece.client_id, p_piece, v_piece.commercial_id, v_piece.notes)
  returning id into v_id;
  -- Prix d'origine conservés (le client a accepté ce prix).
  insert into public.lignes_piece (piece_id, conditionnement_id, quantite_colis, paquets_vrac, paquets, prix_paquet_gnf, montant_ht_gnf)
  select v_id, conditionnement_id, quantite_colis, paquets_vrac, paquets, prix_paquet_gnf, 0
  from public.lignes_piece where piece_id = p_piece
  -- Pour un avoir, on part des lignes de la facture : l'utilisateur ajuste ensuite les quantités retournées.
  ;
  return v_id;
end $$;

-- Annulation d'un devis ou d'une commande validés (une facture s'annule par un avoir).
create or replace function public.annuler_piece(p_piece uuid)
returns void language plpgsql set search_path = '' as $$
declare
  v_piece public.pieces_vente%rowtype;
begin
  select * into v_piece from public.pieces_vente where id = p_piece for update;
  if v_piece.type_piece in ('facture', 'avoir') and v_piece.statut = 'valide' then
    raise exception 'Une facture validée ne s''annule pas : établissez un avoir.' using errcode = '22023';
  end if;
  if exists (select 1 from public.livraisons where commande_id = p_piece and statut = 'validee') then
    raise exception 'Cette commande a déjà été livrée : elle ne peut plus être annulée.' using errcode = '22023';
  end if;
  update public.pieces_vente set statut = 'annule' where id = p_piece;
end $$;

-- -----------------------------------------------------------------------------
-- Livraisons (bons de livraison) : sortie de stock des produits finis
-- -----------------------------------------------------------------------------
create table public.livraisons (
  id            uuid primary key default gen_random_uuid(),
  numero        text unique,
  commande_id   uuid not null references public.pieces_vente (id),
  date_livraison date not null default public.aujourdhui_conakry(),
  statut        text not null default 'brouillon' check (statut in ('brouillon', 'validee')),
  notes         text not null default '',
  created_by    uuid references public.profils (id) default auth.uid(),
  valide_par    uuid references public.profils (id),
  valide_le     timestamptz,
  created_at    timestamptz not null default now()
);

create table public.lignes_livraison (
  id                 uuid primary key default gen_random_uuid(),
  livraison_id       uuid not null references public.livraisons (id) on delete cascade,
  conditionnement_id uuid not null references public.conditionnements (id),
  paquets            integer not null check (paquets > 0)
);

-- Quantités restant à livrer par conditionnement pour une commande.
create view public.reste_a_livrer with (security_invoker = true) as
select l.piece_id as commande_id, l.conditionnement_id,
       sum(l.paquets) - coalesce((select sum(ll.paquets) from public.lignes_livraison ll join public.livraisons lv on lv.id = ll.livraison_id
                                   where lv.commande_id = l.piece_id and lv.statut = 'validee' and ll.conditionnement_id = l.conditionnement_id), 0) as paquets_restants,
       sum(l.paquets) as paquets_commandes
from public.lignes_piece l
group by l.piece_id, l.conditionnement_id;

-- Prépare un bon de livraison avec tout le reste à livrer.
create or replace function public.preparer_livraison(p_commande uuid)
returns uuid language plpgsql set search_path = '' as $$
declare
  v_id uuid;
begin
  if not exists (select 1 from public.pieces_vente where id = p_commande and type_piece = 'commande' and statut = 'valide') then
    raise exception 'Seule une commande validée peut être livrée.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.reste_a_livrer where commande_id = p_commande and paquets_restants > 0) then
    raise exception 'Cette commande est entièrement livrée.' using errcode = '22023';
  end if;
  insert into public.livraisons (commande_id) values (p_commande) returning id into v_id;
  insert into public.lignes_livraison (livraison_id, conditionnement_id, paquets)
  select v_id, conditionnement_id, paquets_restants from public.reste_a_livrer where commande_id = p_commande and paquets_restants > 0;
  return v_id;
end $$;

-- Valide un bon de livraison : sorties de stock « vente » (refusées si stock insuffisant).
-- security definer : les commerciaux et la finance livrent sans avoir les droits du magasin sur tous les mouvements.
create or replace function public.valider_livraison(p_livraison uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_liv public.livraisons%rowtype;
  v_ligne record;
  v_numero text;
begin
  if not public.a_un_role('magasin', 'finance', 'responsable_commercial', 'logistique') then
    raise exception 'Vous n''avez pas les droits pour valider une livraison.' using errcode = '42501';
  end if;
  select * into v_liv from public.livraisons where id = p_livraison for update;
  if v_liv.statut <> 'brouillon' then raise exception 'Livraison déjà validée.' using errcode = '22023'; end if;
  for v_ligne in
    select ll.*, r.paquets_restants from public.lignes_livraison ll
    join public.reste_a_livrer r on r.commande_id = v_liv.commande_id and r.conditionnement_id = ll.conditionnement_id
    where ll.livraison_id = p_livraison
  loop
    if v_ligne.paquets > v_ligne.paquets_restants then
      raise exception 'On ne peut pas livrer plus que la quantité commandée restante (% paquets).', public.nombre_fr(v_ligne.paquets_restants) using errcode = '22023';
    end if;
    insert into public.mouvements_stock (date_operation, type, article_id, quantite, unite, motif, document_type, document_id, auteur_id)
    select v_liv.date_livraison, 'vente', a.id, -v_ligne.paquets, 'paquet', 'Livraison client', 'livraison', p_livraison, auth.uid()
    from public.articles a where a.conditionnement_id = v_ligne.conditionnement_id;
  end loop;
  v_numero := public.prochain_numero('BL-' || to_char(v_liv.date_livraison, 'YYYY') || '-');
  update public.livraisons set statut = 'validee', numero = v_numero, valide_par = auth.uid(), valide_le = now() where id = p_livraison;
  return v_numero;
end $$;

-- -----------------------------------------------------------------------------
-- Paiements (saisis au bureau uniquement — les commerciaux n'encaissent pas)
-- -----------------------------------------------------------------------------
create table public.paiements (
  id             uuid primary key default gen_random_uuid(),
  facture_id     uuid not null references public.pieces_vente (id),
  date_paiement  date not null default public.aujourdhui_conakry(),
  montant_gnf    bigint not null check (montant_gnf > 0),
  mode_id        uuid not null references public.modes_paiement (id),
  reference      text not null default '',
  notes          text not null default '',
  saisi_par      uuid references public.profils (id) default auth.uid(),
  created_at     timestamptz not null default now()
);
create index paiements_facture_idx on public.paiements (facture_id);

-- État de chaque facture : payé, solde, retard.
create view public.factures_etat with (security_invoker = true) as
select f.id, f.numero, f.client_id, c.nom as client_nom, c.code as client_code, f.date_piece, f.date_echeance,
       f.total_ht_gnf, f.total_tva_gnf, f.total_ttc_gnf, f.commercial_id,
       coalesce((select sum(p.montant_gnf) from public.paiements p where p.facture_id = f.id), 0)::bigint as paye_gnf,
       coalesce((select sum(a.total_ttc_gnf) from public.pieces_vente a where a.origine_id = f.id and a.type_piece = 'avoir' and a.statut = 'valide'), 0)::bigint as avoirs_gnf,
       greatest(0, f.total_ttc_gnf
         - coalesce((select sum(p.montant_gnf) from public.paiements p where p.facture_id = f.id), 0)
         - coalesce((select sum(a.total_ttc_gnf) from public.pieces_vente a where a.origine_id = f.id and a.type_piece = 'avoir' and a.statut = 'valide'), 0))::bigint as solde_gnf,
       greatest(0, public.aujourdhui_conakry() - f.date_echeance) as jours_retard
from public.pieces_vente f
join public.clients c on c.id = f.client_id
where f.type_piece = 'facture' and f.statut = 'valide';

-- Enregistre un paiement : refuse un montant supérieur au solde, puis recalcule la dotation.
create or replace function public.enregistrer_paiement(
  p_facture uuid, p_montant bigint, p_mode uuid, p_date date default public.aujourdhui_conakry(), p_reference text default '', p_notes text default ''
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_solde bigint;
  v_id uuid;
begin
  if not public.a_un_role('finance') then
    raise exception 'Seule la comptabilité (ou la direction) enregistre les paiements.' using errcode = '42501';
  end if;
  select solde_gnf into v_solde from public.factures_etat where id = p_facture;
  if v_solde is null then raise exception 'Facture introuvable ou non validée.' using errcode = '22023'; end if;
  if p_montant > v_solde then
    raise exception 'Le montant (% GNF) dépasse le reste à payer (% GNF).', public.nombre_fr(p_montant), public.nombre_fr(v_solde) using errcode = '22023';
  end if;
  insert into public.paiements (facture_id, montant_gnf, mode_id, date_paiement, reference, notes)
  values (p_facture, p_montant, p_mode, p_date, coalesce(p_reference, ''), coalesce(p_notes, '')) returning id into v_id;
  perform public.calculer_dotation_facture(p_facture);
  return v_id;
end $$;

-- -----------------------------------------------------------------------------
-- Dotation : X paquets offerts pour 100 achetés, même produit, sur l'ENCAISSÉ uniquement.
-- Même méthode que src/lib/metier/dotation.ts : dû cumulé = plancher(paquets × part payée × taux).
-- -----------------------------------------------------------------------------
create table public.dotations (
  id             uuid primary key default gen_random_uuid(),
  facture_id     uuid not null references public.pieces_vente (id),
  produit_id     uuid not null references public.produits (id),
  paquets_dus    integer not null default 0 check (paquets_dus >= 0),
  paquets_remis  integer not null default 0 check (paquets_remis >= 0),
  updated_at     timestamptz not null default now(),
  unique (facture_id, produit_id)
);

create or replace function public.calculer_dotation_facture(p_facture uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_f record;
  v_taux numeric := public.parametre_num('taux_dotation', 0.04);
  v_part numeric;
begin
  select fe.*, t.dotation into v_f
  from public.factures_etat fe join public.clients c on c.id = fe.client_id join public.types_clients t on t.id = c.type_client_id
  where fe.id = p_facture;
  if v_f.id is null or not v_f.dotation or v_f.total_ttc_gnf <= 0 then return; end if;
  v_part := least(v_f.paye_gnf, v_f.total_ttc_gnf)::numeric / v_f.total_ttc_gnf;
  insert into public.dotations (facture_id, produit_id, paquets_dus)
  select p_facture, c.produit_id, floor(sum(l.paquets) * v_part * v_taux + 1e-9)::integer
  from public.lignes_piece l join public.conditionnements c on c.id = l.conditionnement_id
  where l.piece_id = p_facture
  group by c.produit_id
  on conflict (facture_id, produit_id) do update set paquets_dus = excluded.paquets_dus, updated_at = now();
end $$;
revoke execute on function public.calculer_dotation_facture(uuid) from public, anon, authenticated;

-- Remet physiquement une dotation (colis du conditionnement choisi) : sortie de stock « dotation ».
create or replace function public.remettre_dotation(p_dotation uuid, p_conditionnement uuid, p_paquets integer)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_d public.dotations%rowtype;
begin
  if not public.a_un_role('finance', 'magasin', 'responsable_commercial') then
    raise exception 'Vous n''avez pas les droits pour remettre une dotation.' using errcode = '42501';
  end if;
  select * into v_d from public.dotations where id = p_dotation for update;
  if p_paquets <= 0 or p_paquets > v_d.paquets_dus - v_d.paquets_remis then
    raise exception 'Quantité invalide : il reste % paquets de dotation à remettre.', public.nombre_fr(v_d.paquets_dus - v_d.paquets_remis) using errcode = '22023';
  end if;
  if not exists (select 1 from public.conditionnements where id = p_conditionnement and produit_id = v_d.produit_id) then
    raise exception 'La dotation se remet dans le même produit.' using errcode = '22023';
  end if;
  insert into public.mouvements_stock (type, article_id, quantite, unite, motif, document_type, document_id, auteur_id)
  select 'dotation', a.id, -p_paquets, 'paquet', 'Dotation client', 'dotation', p_dotation, auth.uid()
  from public.articles a where a.conditionnement_id = p_conditionnement;
  update public.dotations set paquets_remis = paquets_remis + p_paquets, updated_at = now() where id = p_dotation;
end $$;

-- -----------------------------------------------------------------------------
-- Avoir validé : retour en stock des paquets repris (mouvement « retour »).
-- -----------------------------------------------------------------------------
create or replace function public.valider_avoir(p_avoir uuid, p_retour_stock boolean default true)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_numero text;
  v_avoir public.pieces_vente%rowtype;
  v_facture_ttc bigint;
begin
  if not public.a_un_role('finance', 'responsable_commercial') then
    raise exception 'Vous n''avez pas les droits pour valider un avoir.' using errcode = '42501';
  end if;
  select * into v_avoir from public.pieces_vente where id = p_avoir and type_piece = 'avoir';
  if v_avoir.id is null then raise exception 'Avoir introuvable.' using errcode = '22023'; end if;
  v_numero := public.valider_piece(p_avoir);
  -- Reste dû brut de la facture après cet avoir : il ne peut pas devenir négatif.
  select total_ttc_gnf - paye_gnf - avoirs_gnf into v_facture_ttc from public.factures_etat where id = v_avoir.origine_id;
  if v_facture_ttc < 0 then
    raise exception 'L''avoir dépasse le reste dû sur la facture (% GNF de trop) : réduisez les quantités.', public.nombre_fr(-v_facture_ttc) using errcode = '22023';
  end if;
  if p_retour_stock then
    insert into public.mouvements_stock (type, article_id, quantite, unite, motif, document_type, document_id, auteur_id)
    select 'retour', a.id, l.paquets, 'paquet', 'Retour client (avoir ' || v_numero || ')', 'avoir', p_avoir, auth.uid()
    from public.lignes_piece l join public.articles a on a.conditionnement_id = l.conditionnement_id
    where l.piece_id = p_avoir;
  end if;
  return v_numero;
end $$;

-- -----------------------------------------------------------------------------
-- Relances d'impayés
-- -----------------------------------------------------------------------------
create table public.relances (
  id          uuid primary key default gen_random_uuid(),
  facture_id  uuid not null references public.pieces_vente (id),
  date_relance date not null default public.aujourdhui_conakry(),
  canal       text not null default 'telephone' check (canal in ('telephone', 'visite', 'sms', 'whatsapp', 'courrier', 'email')),
  note        text not null default '',
  promesse_date date,
  auteur_id   uuid references public.profils (id) default auth.uid(),
  created_at  timestamptz not null default now()
);

-- Solde par client (créances).
create view public.soldes_clients with (security_invoker = true) as
select c.id as client_id, c.code, c.nom, c.condition_paiement, c.plafond_credit_gnf, c.commercial_id,
       coalesce(sum(fe.solde_gnf), 0)::bigint as encours_gnf,
       coalesce(sum(fe.solde_gnf) filter (where fe.jours_retard > 0), 0)::bigint as echu_gnf,
       max(fe.jours_retard) as retard_max_jours
from public.clients c
left join public.factures_etat fe on fe.client_id = c.id
group by c.id;

-- -----------------------------------------------------------------------------
-- RLS
-- Ventes (lecture et écriture) : finance, responsable commercial (+ direction).
-- Commercial terrain : uniquement SES clients et SES pièces (devis, factures) — application terrain (étape 5).
-- Magasin et logistique : lecture des commandes et livraisons (préparation).
-- -----------------------------------------------------------------------------
alter table public.types_clients enable row level security;
alter table public.modes_paiement enable row level security;
alter table public.compteurs enable row level security;
alter table public.clients enable row level security;
alter table public.pieces_vente enable row level security;
alter table public.lignes_piece enable row level security;
alter table public.livraisons enable row level security;
alter table public.lignes_livraison enable row level security;
alter table public.paiements enable row level security;
alter table public.dotations enable row level security;
alter table public.relances enable row level security;

create policy types_clients_lecture on public.types_clients for select to authenticated using (public.est_actif());
create policy types_clients_ecriture on public.types_clients for all to authenticated
  using (public.est_admin() or public.a_un_role('responsable_commercial')) with check (public.est_admin() or public.a_un_role('responsable_commercial'));
create policy modes_paiement_lecture on public.modes_paiement for select to authenticated using (public.est_actif());
create policy modes_paiement_ecriture on public.modes_paiement for all to authenticated
  using (public.est_admin() or public.a_un_role('finance')) with check (public.est_admin() or public.a_un_role('finance'));

-- Clients
create policy clients_lecture on public.clients for select to authenticated using (
  public.a_un_role('finance', 'responsable_commercial', 'magasin', 'logistique')
  or (public.a_role('commercial_terrain') and commercial_id = (select auth.uid())));
create policy clients_ajout on public.clients for insert to authenticated with check (
  public.a_un_role('finance', 'responsable_commercial')
  or (public.a_role('commercial_terrain') and commercial_id = (select auth.uid())));
create policy clients_modif on public.clients for update to authenticated
  using (public.a_un_role('finance', 'responsable_commercial') or (public.a_role('commercial_terrain') and commercial_id = (select auth.uid())))
  with check (public.a_un_role('finance', 'responsable_commercial') or (public.a_role('commercial_terrain') and commercial_id = (select auth.uid())));

-- Pièces : le commercial ne voit et ne crée que les siennes, pour ses clients.
create policy pieces_lecture on public.pieces_vente for select to authenticated using (
  public.a_un_role('finance', 'responsable_commercial', 'magasin', 'logistique')
  or (public.a_role('commercial_terrain') and commercial_id = (select auth.uid())));
create policy pieces_ajout on public.pieces_vente for insert to authenticated with check (
  public.a_un_role('finance', 'responsable_commercial')
  or (public.a_role('commercial_terrain') and commercial_id = (select auth.uid()) and type_piece in ('devis', 'facture')
      and exists (select 1 from public.clients c where c.id = client_id and c.commercial_id = (select auth.uid()))));
create policy pieces_modif on public.pieces_vente for update to authenticated
  using (public.a_un_role('finance', 'responsable_commercial') or (public.a_role('commercial_terrain') and commercial_id = (select auth.uid())))
  with check (public.a_un_role('finance', 'responsable_commercial') or (public.a_role('commercial_terrain') and commercial_id = (select auth.uid())));
create policy pieces_suppr on public.pieces_vente for delete to authenticated
  using (public.a_un_role('finance', 'responsable_commercial') or (public.a_role('commercial_terrain') and commercial_id = (select auth.uid())));

create policy lignes_piece_lecture on public.lignes_piece for select to authenticated
  using (exists (select 1 from public.pieces_vente p where p.id = piece_id));
create policy lignes_piece_ajout on public.lignes_piece for insert to authenticated with check (public.peut_ecrire_piece(piece_id));
create policy lignes_piece_modif on public.lignes_piece for update to authenticated
  using (public.peut_ecrire_piece(piece_id)) with check (public.peut_ecrire_piece(piece_id));
create policy lignes_piece_suppr on public.lignes_piece for delete to authenticated using (public.peut_ecrire_piece(piece_id));

create policy livraisons_lecture on public.livraisons for select to authenticated
  using (public.a_un_role('finance', 'responsable_commercial', 'magasin', 'logistique'));
create policy livraisons_ecriture on public.livraisons for all to authenticated
  using (public.a_un_role('finance', 'responsable_commercial', 'magasin', 'logistique'))
  with check (public.a_un_role('finance', 'responsable_commercial', 'magasin', 'logistique'));
create policy lignes_livraison_lecture on public.lignes_livraison for select to authenticated
  using (exists (select 1 from public.livraisons l where l.id = livraison_id));
create policy lignes_livraison_ecriture on public.lignes_livraison for all to authenticated
  using (exists (select 1 from public.livraisons l where l.id = livraison_id and l.statut = 'brouillon'))
  with check (exists (select 1 from public.livraisons l where l.id = livraison_id and l.statut = 'brouillon'));

-- Paiements : saisis par la finance (via enregistrer_paiement) ; lisibles par le responsable commercial.
create policy paiements_lecture on public.paiements for select to authenticated using (public.a_un_role('finance', 'responsable_commercial'));
create policy paiements_ajout on public.paiements for insert to authenticated with check (public.a_un_role('finance'));
revoke update, delete on public.paiements from anon, authenticated;

create policy dotations_lecture on public.dotations for select to authenticated
  using (public.a_un_role('finance', 'responsable_commercial', 'magasin'));
revoke insert, update, delete on public.dotations from anon, authenticated;

create policy relances_lecture on public.relances for select to authenticated using (public.a_un_role('finance', 'responsable_commercial'));
create policy relances_ajout on public.relances for insert to authenticated with check (public.a_un_role('finance', 'responsable_commercial'));

revoke all on public.compteurs from anon, authenticated;

-- -----------------------------------------------------------------------------
-- Audit
-- -----------------------------------------------------------------------------
select public.activer_audit('public.types_clients');
select public.activer_audit('public.modes_paiement');
select public.activer_audit('public.clients');
select public.activer_audit('public.pieces_vente');
select public.activer_audit('public.lignes_piece');
select public.activer_audit('public.livraisons');
select public.activer_audit('public.lignes_livraison');
select public.activer_audit('public.paiements');
select public.activer_audit('public.dotations');
select public.activer_audit('public.relances');
