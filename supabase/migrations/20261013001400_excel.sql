-- =============================================================================
-- Connexion Excel / outils comptables : clés de lecture personnelles et jeux de données publiés.
-- Excel (Données › À partir du Web) appelle /api/excel/<jeu>?cle=… ; la clé n'est stockée que hachée,
-- elle se révoque à tout moment et ne donne qu'un accès en LECTURE aux jeux prévus ici.
-- =============================================================================

create table public.cles_export (
  id                    uuid primary key default gen_random_uuid(),
  libelle               text not null check (length(trim(libelle)) > 0),
  cle_hash              text not null unique,
  debut_cle             text not null,
  actif                 boolean not null default true,
  cree_par              uuid references public.profils (id) default auth.uid(),
  created_at            timestamptz not null default now(),
  derniere_utilisation  timestamptz
);
comment on table public.cles_export is 'Clés de connexion Excel (lecture seule). Seul le hachage SHA-256 est conservé.';

alter table public.cles_export enable row level security;
create policy cles_export_lecture on public.cles_export for select to authenticated using (public.a_un_role('finance', 'admin'));
-- Révocation (actif = false) par la finance ou l'admin ; la création passe par creer_cle_export.
create policy cles_export_modif on public.cles_export for update to authenticated
  using (public.a_un_role('finance', 'admin')) with check (public.a_un_role('finance', 'admin'));
select public.activer_audit('public.cles_export');

-- Crée une clé et la renvoie EN CLAIR une seule fois.
create or replace function public.creer_cle_export(p_libelle text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_cle text := 'xl_' || encode(extensions.gen_random_bytes(24), 'hex');
begin
  if not public.a_un_role('finance', 'admin') then
    raise exception 'Seules la finance et l''administration créent des clés Excel.' using errcode = '42501';
  end if;
  insert into public.cles_export (libelle, cle_hash, debut_cle)
  values (trim(p_libelle), encode(extensions.digest(v_cle, 'sha256'), 'hex'), left(v_cle, 9));
  return v_cle;
end $$;
revoke execute on function public.creer_cle_export(text) from public, anon;
grant execute on function public.creer_cle_export(text) to authenticated;

-- Jeux de données publiés (lignes à plat, colonnes en français, montants en GNF).
create or replace function public.exporter_donnees(p_cle text, p_jeu text, p_du date, p_au date)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  r jsonb;
begin
  select id into v_id from public.cles_export
   where cle_hash = encode(extensions.digest(coalesce(p_cle, ''), 'sha256'), 'hex') and actif;
  if v_id is null then
    raise exception 'Clé Excel inconnue ou révoquée.' using errcode = '28000';
  end if;
  update public.cles_export set derniere_utilisation = now() where id = v_id;

  if p_jeu = 'factures' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'Numéro', f.numero, 'Date', f.date_piece, 'Échéance', f.date_echeance, 'Code client', f.client_code, 'Client', f.client_nom,
      'Total HT', f.total_ht_gnf, 'TVA', f.total_tva_gnf, 'Total TTC', f.total_ttc_gnf, 'Payé', f.paye_gnf, 'Avoirs', f.avoirs_gnf,
      'Reste dû', f.solde_gnf, 'Jours de retard', greatest(f.jours_retard, 0)) order by f.date_piece, f.numero), '[]')
    into r from public.factures_etat f where f.date_piece between p_du and p_au;
  elsif p_jeu = 'paiements' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'Date', pa.date_paiement, 'Facture', pv.numero, 'Client', c.nom, 'Mode', m.libelle, 'Montant', pa.montant_gnf, 'Référence', pa.reference)
      order by pa.date_paiement), '[]')
    into r from public.paiements pa
    join public.pieces_vente pv on pv.id = pa.facture_id
    join public.clients c on c.id = pv.client_id
    left join public.modes_paiement m on m.id = pa.mode_id
    where pa.date_paiement between p_du and p_au;
  elsif p_jeu = 'stock' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'Code', s.code, 'Article', s.libelle, 'Famille', s.famille, 'Unité', s.unite, 'Quantité', s.quantite,
      'Valeur', s.valeur_gnf, 'Coût moyen', s.cmp_gnf, 'Seuil d''alerte', s.seuil_alerte, 'Jours de couverture', s.jours_couverture)
      order by s.famille, s.code), '[]')
    into r from public.etat_stock s where s.actif;
  elsif p_jeu = 'achats' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'Numéro', a.numero, 'Date', a.date_facture, 'Échéance', a.date_echeance, 'Bénéficiaire', a.beneficiaire, 'Libellé', a.libelle,
      'Catégorie', a.categorie_libelle, 'Nature', a.nature, 'Compte', a.compte_charge, 'Devise', a.devise,
      'HT (GNF)', a.montant_ht_gnf, 'TVA (GNF)', a.montant_tva_gnf, 'Total (GNF)', a.total_gnf, 'Payé', a.paye_gnf, 'Reste à payer', a.solde_gnf)
      order by a.date_facture, a.numero), '[]')
    into r from public.factures_fournisseurs_etat a where a.date_facture between p_du and p_au;
  elsif p_jeu = 'tresorerie' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'Date', t.date_operation, 'Compte', c.libelle, 'Sens', t.sens, 'Montant', t.montant, 'Devise', c.devise,
      'Montant (GNF)', t.montant_gnf, 'Origine', t.origine, 'Libellé', t.libelle, 'Référence', t.reference)
      order by t.date_operation, t.created_at), '[]')
    into r from public.mouvements_tresorerie t join public.comptes_tresorerie c on c.id = t.compte_id
    where t.date_operation between p_du and p_au;
  elsif p_jeu = 'production' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'Date', f.date_production, 'Poste', po.libelle, 'Lot', f.code_lot, 'Produit', pr.libelle, 'Conditionnement', co.libelle,
      'Paquets', fp.paquets, 'Colis', fp.paquets / co.paquets_par_colis, 'Rebuts (kg)', fp.rebuts_kg)
      order by f.date_production, po.ordre), '[]')
    into r from public.fiches_production f
    join public.postes po on po.id = f.poste_id
    join public.fiche_productions fp on fp.fiche_id = f.id
    join public.conditionnements co on co.id = fp.conditionnement_id
    join public.produits pr on pr.id = co.produit_id
    where f.statut = 'validee' and f.date_production between p_du and p_au;
  else
    raise exception 'Jeu de données inconnu : %.', p_jeu using errcode = '22023';
  end if;
  return r;
end $$;
revoke execute on function public.exporter_donnees(text, text, date, date) from public;
grant execute on function public.exporter_donnees(text, text, date, date) to anon, authenticated;
