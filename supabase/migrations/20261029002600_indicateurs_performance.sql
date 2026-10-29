-- =============================================================================
-- Papel ERP — Migration 26 : indicateurs de performance (coût de l'énergie par tonne, coût complet par paquet,
-- OTIF et délai commande → livraison). Lecture seule : aucune donnée existante n'est modifiée, sauf le repérage
-- de la catégorie de charges « Énergie » (case à cocher, modifiable ensuite par la finance).
-- =============================================================================

-- Catégories de charges suivies comme « énergie » (électricité, carburant du groupe…) : réglable dans la liste.
alter table public.categories_charges add column energie boolean not null default false;
update public.categories_charges set energie = true
 where libelle ilike 'énergie%' or libelle ilike '%électricité%' or libelle ilike '%carburant%';

-- Délai de livraison promis au client (sert à l'OTIF) : réglable par l'administrateur.
insert into public.parametres (cle, valeur, libelle, description, categorie, type_valeur, unite) values
  ('delai_livraison_promis_jours', '3', 'Délai de livraison promis', 'Une commande est « à temps » si tous ses paquets sont remis au client au plus tard ce nombre de jours après la commande (OTIF)', 'logistique', 'entier', 'jours'),
  ('alerte_otif_min', '0.9', 'Alerte livraisons à temps et complètes', 'En dessous de cette part de commandes livrées à temps et complètes (OTIF), l''indicateur passe « à surveiller »', 'logistique', 'pourcentage', null)
on conflict (cle) do nothing;

-- -----------------------------------------------------------------------------
-- Coûts de la période : énergie, charges fixes et variables, coût matière et volumes des fiches validées.
-- Montants agrégés seulement (aucun détail de facture fournisseur n'est exposé).
-- -----------------------------------------------------------------------------
create or replace function public.indicateurs_couts(p_du date, p_au date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.a_un_role('production', 'finance', 'magasin', 'achats') then
    raise exception 'Vous n''avez pas accès aux coûts de production.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'energie_gnf', coalesce((select sum(f.montant_ht_gnf) from public.factures_fournisseurs f
                             join public.categories_charges c on c.id = f.categorie_id
                             where c.energie and f.statut <> 'annulee' and f.date_facture between p_du and p_au), 0),
    'charges_gnf', coalesce((select sum(f.montant_ht_gnf) from public.factures_fournisseurs f
                             join public.categories_charges c on c.id = f.categorie_id
                             where c.nature in ('variable', 'fixe') and f.statut <> 'annulee' and f.date_facture between p_du and p_au), 0),
    'matiere_gnf', coalesce((select sum(cout_matiere_gnf) from public.fiches_production
                             where statut = 'validee' and date_production between p_du and p_au), 0),
    'paquets', coalesce((select sum(fp.paquets) from public.fiche_productions fp join public.fiches_production f on f.id = fp.fiche_id
                         where f.statut = 'validee' and f.date_production between p_du and p_au), 0),
    'papier_kg', coalesce((select sum(fc.quantite) from public.fiche_consommations fc
                           join public.fiches_production f on f.id = fc.fiche_id
                           join public.articles a on a.id = fc.article_id
                           where f.statut = 'validee' and f.date_production between p_du and p_au
                             and a.famille = 'matiere_premiere' and a.unite = 'kg'), 0)
  );
end $$;
revoke execute on function public.indicateurs_couts(date, date) from public, anon;
grant execute on function public.indicateurs_couts(date, date) to authenticated;

-- -----------------------------------------------------------------------------
-- Livraisons : commandes arrivées à échéance sur la période (date de commande + délai promis, jusqu'à aujourd'hui)
-- et leurs remises au client (paquets laissés = livrés − rapportés). L'OTIF est calculé dans le code (testé).
-- -----------------------------------------------------------------------------
create or replace function public.indicateurs_livraison(p_du date, p_au date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_delai integer := greatest(0, public.parametre_num('delai_livraison_promis_jours', 3)::integer);
begin
  if not public.a_un_role('logistique', 'finance', 'responsable_commercial', 'magasin') then
    raise exception 'Vous n''avez pas accès aux indicateurs de livraison.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'delai_promis_jours', v_delai,
    'commandes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'date_piece', p.date_piece,
               'date_promise', p.date_piece + v_delai,
               'paquets_commandes', (select coalesce(sum(l.paquets), 0) from public.lignes_piece l where l.piece_id = p.id),
               'remises', coalesce((
                  select jsonb_agg(jsonb_build_object('date', (lv.remise_le at time zone 'Africa/Conakry')::date,
                                                      'paquets', (select coalesce(sum(ll.paquets - ll.paquets_retournes), 0)
                                                                  from public.lignes_livraison ll where ll.livraison_id = lv.id)))
                  from public.livraisons lv
                  where lv.commande_id = p.id and lv.statut = 'validee' and lv.statut_remise in ('livree', 'partielle')
                    and lv.remise_le is not null), '[]'::jsonb)))
      from public.pieces_vente p
      where p.type_piece = 'commande' and p.statut = 'valide'
        and p.date_piece + v_delai between p_du and least(p_au, public.aujourdhui_conakry())), '[]'::jsonb)
  );
end $$;
revoke execute on function public.indicateurs_livraison(date, date) from public, anon;
grant execute on function public.indicateurs_livraison(date, date) to authenticated;
