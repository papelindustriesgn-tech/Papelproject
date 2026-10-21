-- =============================================================================
-- Chaque service règle lui-même son application (rien n'est figé dans le code) :
-- 1) l'entrée de l'application : phrase d'accueil, boutons (le 1er = bouton principal), étapes du parcours,
--    liste « À faire aujourd'hui » (indicateurs choisis, libellés, urgence, seuil d'affichage) ;
-- 2) les paramètres de calcul de son domaine (seuils d'alerte…), sans passer par l'administrateur.
-- Les valeurs ci-dessous ne sont qu'un point de départ, modifiable dans l'interface.
-- =============================================================================

-- Qui règle quel espace : la Direction et l'administrateur partout, sinon les rôles qui utilisent l'espace.
create or replace function public.peut_regler_espace(p_espace text)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.est_actif() and (public.est_admin() or case p_espace
    when 'direction'   then public.a_un_role('direction')
    when 'magasin'     then public.a_un_role('magasin')
    when 'production'  then public.a_un_role('production')
    when 'ventes'      then public.a_un_role('finance', 'responsable_commercial')
    when 'commercial'  then public.a_un_role('responsable_commercial')
    when 'terrain'     then public.a_un_role('responsable_commercial')
    when 'achats'      then public.a_un_role('achats')
    when 'logistique'  then public.a_un_role('logistique')
    when 'qualite'     then public.a_un_role('qualite')
    when 'maintenance' then public.a_un_role('maintenance')
    when 'finance'     then public.a_un_role('finance')
    else public.a_un_role('direction')
  end);
$$;
grant execute on function public.peut_regler_espace(text) to authenticated;

-- Paramètres : chaque catégorie appartient à un espace ; ce service peut modifier ses propres paramètres.
create or replace function public.espace_de_categorie(p_categorie text)
returns text language sql immutable set search_path = '' as $$
  select case p_categorie
    when 'stock' then 'magasin'
    when 'production' then 'production'
    when 'ventes' then 'ventes'
    when 'terrain' then 'terrain'
    when 'qualite' then 'qualite'
    when 'maintenance' then 'maintenance'
    when 'logistique' then 'logistique'
    when 'achats' then 'achats'
    when 'comptabilite' then 'finance'
    when 'finance' then 'finance'
    else 'direction'
  end;
$$;

alter policy parametres_modif on public.parametres
  using (public.peut_regler_espace(public.espace_de_categorie(categorie)))
  with check (public.peut_regler_espace(public.espace_de_categorie(categorie)));

-- Seuils jusqu'ici écrits dans le code : désormais des paramètres.
insert into public.parametres (cle, valeur, libelle, description, categorie, type_valeur, unite) values
  ('alerte_impaye_jours', '30', 'Impayé à signaler', 'Une facture en retard depuis plus de ce nombre de jours est signalée (tableau de bord, impayés)', 'ventes', 'entier', 'jours'),
  ('alerte_impaye_critique_jours', '60', 'Impayé critique', 'Au-delà de ce retard, l''impayé devient une alerte critique', 'ventes', 'entier', 'jours'),
  ('alerte_taux_rupture', '0.15', 'Alerte taux de rupture', 'Part des visites où le point de vente n''a plus de produits Papel, au-delà de laquelle on alerte', 'terrain', 'pourcentage', null),
  ('alerte_taux_hors_zone', '0.15', 'Alerte visites hors zone', 'Part des visites enregistrées loin du point de vente, au-delà de laquelle on alerte', 'terrain', 'pourcentage', null),
  ('terrain_jours_a_visiter', '7', 'Point de vente « à visiter »', 'Un point de vente non visité depuis ce nombre de jours apparaît « à visiter » sur le téléphone', 'terrain', 'entier', 'jours'),
  ('alerte_livraison_jours', '2', 'Livraison en retard', 'Un bon de livraison validé et non remis depuis ce nombre de jours est signalé', 'logistique', 'entier', 'jours'),
  ('alerte_dette_jours', '30', 'Dette fournisseur à signaler', 'Une facture fournisseur en retard depuis plus de ce nombre de jours est signalée', 'comptabilite', 'entier', 'jours')
on conflict (cle) do nothing;

-- -----------------------------------------------------------------------------
-- Entrée des applications
-- -----------------------------------------------------------------------------
create table public.accueil_espaces (
  espace     text primary key check (espace ~ '^[a-z]+$'),
  promesse   text not null default '' check (length(promesse) <= 300),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profils (id) default auth.uid()
);
comment on table public.accueil_espaces is 'Phrase d''accueil de chaque application (à quoi elle sert), réglée par le service.';

-- Un élément de l'entrée : bouton d'action, étape du parcours ou ligne « À faire ».
create table public.accueil_elements (
  id          uuid primary key default gen_random_uuid(),
  espace      text not null check (espace ~ '^[a-z]+$'),
  genre       text not null check (genre in ('action', 'etape', 'tache')),
  libelle     text not null check (length(trim(libelle)) between 1 and 80),
  description text not null default '' check (length(description) <= 120),
  -- Écran ouvert par l'élément (chemin interne de l'ERP).
  ecran       text not null check (ecran ~ '^/[a-z0-9/_?=&.-]*$'),
  icone       text not null default '',
  -- Tâche : code de l'indicateur calculé (catalogue dans le code), urgence et seuil d'affichage.
  indicateur  text,
  urgent      boolean not null default false,
  seuil       integer not null default 1 check (seuil >= 1),
  ordre       integer not null default 0,
  actif       boolean not null default true,
  created_at  timestamptz not null default now(),
  check (genre <> 'tache' or indicateur is not null)
);
create index accueil_elements_espace_idx on public.accueil_elements (espace, genre, ordre);
comment on table public.accueil_elements is 'Boutons, étapes et lignes « À faire » de l''entrée de chaque application ; le 1er bouton actif est le bouton principal.';

alter table public.accueil_espaces enable row level security;
alter table public.accueil_elements enable row level security;
create policy accueil_espaces_lecture on public.accueil_espaces for select to authenticated using (public.est_actif());
create policy accueil_espaces_ajout on public.accueil_espaces for insert to authenticated with check (public.peut_regler_espace(espace));
create policy accueil_espaces_modif on public.accueil_espaces for update to authenticated using (public.peut_regler_espace(espace)) with check (public.peut_regler_espace(espace));
create policy accueil_elements_lecture on public.accueil_elements for select to authenticated using (public.est_actif());
create policy accueil_elements_ajout on public.accueil_elements for insert to authenticated with check (public.peut_regler_espace(espace));
create policy accueil_elements_modif on public.accueil_elements for update to authenticated using (public.peut_regler_espace(espace)) with check (public.peut_regler_espace(espace));
create policy accueil_elements_suppression on public.accueil_elements for delete to authenticated using (public.peut_regler_espace(espace));

create trigger accueil_espaces_updated_at before update on public.accueil_espaces
  for each row execute function public.maj_updated_at();
select public.activer_audit('public.accueil_espaces', 'espace');
select public.activer_audit('public.accueil_elements');

-- Point de départ (modifiable par chaque service).
insert into public.accueil_espaces (espace, promesse) values
  ('direction', 'Toute l''usine sur une page : ventes, production, stock et argent, avec ce qui demande votre attention.'),
  ('magasin', 'Savoir à tout moment ce qu''il y a dans l''usine : chaque entrée et chaque sortie est notée ici.'),
  ('production', 'Noter ce que chaque poste a produit et consommé, et voir tout de suite si le rendement est bon.'),
  ('ventes', 'Facturer les clients, suivre ce qu''ils doivent et enregistrer leurs paiements.'),
  ('commercial', 'Voir le travail des commerciaux sur la carte et leur donner chacun leurs clients.'),
  ('achats', 'Commander aux fournisseurs et suivre les conteneurs jusqu''à l''usine.'),
  ('logistique', 'Livrer les clients : un camion, un chauffeur, des bons de livraison, une signature.'),
  ('qualite', 'Contrôler la matière et la production, et traiter chaque problème jusqu''au bout.'),
  ('maintenance', 'Réparer les pannes vite et entretenir les machines avant qu''elles ne cassent.'),
  ('finance', 'Savoir combien il y a en caisse et en banque, ce qu''on doit et ce qu''on gagne.')
on conflict (espace) do nothing;

insert into public.accueil_elements (espace, genre, libelle, description, ecran, icone, indicateur, urgent, ordre) values
  -- Boutons (le premier = bouton principal)
  ('direction', 'action', 'Rapport de la semaine', 'Résumé imprimable', '/direction/rapport', 'rapport', null, false, 1),
  ('direction', 'action', 'Ventes', 'Factures, impayés', '/ventes', 'ventes', null, false, 2),
  ('direction', 'action', 'Stocks', 'Matières et produits finis', '/magasin', 'stock', null, false, 3),
  ('direction', 'action', 'Finance', 'Trésorerie et résultat', '/finance', 'argent', null, false, 4),
  ('magasin', 'action', 'Entrée ou sortie', 'Emballages, pièces, corrections', '/magasin/mouvements/nouveau', 'mouvement', null, false, 1),
  ('magasin', 'action', 'Réceptionner une bobine', 'Arrivée d''une bobine jumbo', '/magasin/bobines', 'reception', null, false, 2),
  ('magasin', 'action', 'Faire un inventaire', 'Compter le stock réel', '/magasin/inventaires', 'inventaire', null, false, 3),
  ('magasin', 'action', 'Demander un achat', 'Il va manquer quelque chose', '/magasin/demandes', 'panier', null, false, 4),
  ('production', 'action', 'Saisir ma fiche de poste', 'Production, bobines, arrêts', '/production/fiches/nouvelle', 'fiche', null, false, 1),
  ('production', 'action', 'Signaler une panne', 'Prévenir la maintenance', '/production/pannes', 'panne', null, false, 2),
  ('production', 'action', 'Signaler un problème qualité', 'Défaut, matière non conforme', '/production/non-conformites', 'alerte', null, false, 3),
  ('production', 'action', 'Ordres de fabrication', 'Ce qu''il faut produire', '/production/ordres', 'usine', null, false, 4),
  ('ventes', 'action', 'Nouvelle facture', 'Facturer un client', '/ventes/pieces/nouvelle?type=facture', 'facture', null, false, 1),
  ('ventes', 'action', 'Nouveau devis', 'Proposer un prix', '/ventes/pieces/nouvelle?type=devis', 'devis', null, false, 2),
  ('ventes', 'action', 'Encaisser un paiement', 'Factures à payer', '/ventes/impayes', 'argent', null, false, 3),
  ('ventes', 'action', 'Nouveau client', 'Créer la fiche', '/ventes/clients/nouveau', 'client', null, false, 4),
  ('commercial', 'action', 'Planifier une tournée', 'Tournées et objectifs', '/commercial/planification', 'calendrier', null, false, 1),
  ('commercial', 'action', 'Répartir les clients', 'Un client = un commercial', '/commercial/portefeuilles', 'client', null, false, 2),
  ('commercial', 'action', 'Visites', 'Ce qui a été fait', '/commercial/visites', 'visite', null, false, 3),
  ('commercial', 'action', 'Réclamation client', 'Enregistrer un problème', '/commercial/reclamations', 'alerte', null, false, 4),
  ('achats', 'action', 'Nouveau bon de commande', 'Commander à un fournisseur', '/achats/commandes/nouveau', 'panier', null, false, 1),
  ('achats', 'action', 'Demandes à traiter', 'Besoins des services', '/achats/demandes', 'fiche', null, false, 2),
  ('achats', 'action', 'Suivre les conteneurs', 'En mer, au port, livrés', '/achats/conteneurs', 'bateau', null, false, 3),
  ('logistique', 'action', 'Préparer une tournée', 'Camion, chauffeur, livraisons', '/logistique/tournees/nouvelle', 'camion', null, false, 1),
  ('logistique', 'action', 'Tournées', 'En cours et terminées', '/logistique/tournees', 'calendrier', null, false, 2),
  ('qualite', 'action', 'Nouveau contrôle', 'Bobine ou production', '/qualite/controles', 'controle', null, false, 1),
  ('qualite', 'action', 'Problèmes ouverts', 'Non-conformités à traiter', '/qualite/non-conformites?statut=ouverte', 'alerte', null, false, 2),
  ('qualite', 'action', 'Retrouver un lot', 'Traçabilité', '/qualite/tracabilite', 'recherche', null, false, 3),
  ('maintenance', 'action', 'Nouvel ordre de travail', 'Panne ou intervention', '/maintenance/interventions', 'panne', null, false, 1),
  ('maintenance', 'action', 'Préventif à faire', 'Entretiens prévus', '/maintenance/preventif', 'calendrier', null, false, 2),
  ('maintenance', 'action', 'Équipements', 'Machines et pièces', '/maintenance/equipements', 'usine', null, false, 3),
  ('finance', 'action', 'Facture fournisseur', 'Saisir une dépense', '/finance/fournisseurs/nouvelle', 'facture', null, false, 1),
  ('finance', 'action', 'Trésorerie', 'Caisse, banque, mobile money', '/finance/tresorerie', 'argent', null, false, 2),
  ('finance', 'action', 'Exports comptables', 'Pour le comptable', '/finance/exports', 'export', null, false, 3),
  ('finance', 'action', 'Connexion Excel', 'Données à jour dans Excel', '/finance/excel', 'excel', null, false, 4),
  -- Parcours
  ('magasin', 'etape', 'Recevoir', '', '/magasin/bobines', '', null, false, 1),
  ('magasin', 'etape', 'Sortir', '', '/magasin/mouvements/nouveau', '', null, false, 2),
  ('magasin', 'etape', 'Compter', '', '/magasin/inventaires', '', null, false, 3),
  ('magasin', 'etape', 'Commander ce qui manque', '', '/magasin/demandes', '', null, false, 4),
  ('production', 'etape', 'Ordre de fabrication', '', '/production/ordres', '', null, false, 1),
  ('production', 'etape', 'Fiche de poste', '', '/production/fiches/nouvelle', '', null, false, 2),
  ('production', 'etape', 'Valider la fiche', '', '/production/fiches?statut=brouillon', '', null, false, 3),
  ('production', 'etape', 'Voir le rendement', '', '/production', '', null, false, 4),
  ('ventes', 'etape', 'Client', '', '/ventes/clients', '', null, false, 1),
  ('ventes', 'etape', 'Devis', '', '/ventes/pieces?type=devis', '', null, false, 2),
  ('ventes', 'etape', 'Facture', '', '/ventes/pieces?type=facture', '', null, false, 3),
  ('ventes', 'etape', 'Livraison', '', '/ventes/pieces?type=commande', '', null, false, 4),
  ('ventes', 'etape', 'Paiement', '', '/ventes/impayes', '', null, false, 5),
  ('commercial', 'etape', 'Répartir les clients', '', '/commercial/portefeuilles', '', null, false, 1),
  ('commercial', 'etape', 'Planifier les tournées', '', '/commercial/planification', '', null, false, 2),
  ('commercial', 'etape', 'Suivre les visites', '', '/commercial/visites', '', null, false, 3),
  ('commercial', 'etape', 'Comparer aux objectifs', '', '/commercial', '', null, false, 4),
  ('achats', 'etape', 'Demande d''un service', '', '/achats/demandes', '', null, false, 1),
  ('achats', 'etape', 'Bon de commande', '', '/achats/commandes', '', null, false, 2),
  ('achats', 'etape', 'Conteneur', '', '/achats/conteneurs', '', null, false, 3),
  ('achats', 'etape', 'Réception au magasin', '', '/magasin/bobines', '', null, false, 4),
  ('logistique', 'etape', 'Préparer la tournée', '', '/logistique/tournees/nouvelle', '', null, false, 1),
  ('logistique', 'etape', 'Démarrer', '', '/logistique/tournees?statut=planifiee', '', null, false, 2),
  ('logistique', 'etape', 'Livrer et faire signer', '', '/logistique/tournees?statut=en_cours', '', null, false, 3),
  ('logistique', 'etape', 'Terminer', '', '/logistique/tournees?statut=en_cours', '', null, false, 4),
  ('qualite', 'etape', 'Contrôler', '', '/qualite/controles', '', null, false, 1),
  ('qualite', 'etape', 'Problème ?', '', '/qualite/non-conformites?statut=ouverte', '', null, false, 2),
  ('qualite', 'etape', 'Corriger', '', '/qualite/non-conformites?statut=en_traitement', '', null, false, 3),
  ('qualite', 'etape', 'Clôturer', '', '/qualite/non-conformites', '', null, false, 4),
  ('maintenance', 'etape', 'Panne signalée', '', '/maintenance/interventions?statut=demandee', '', null, false, 1),
  ('maintenance', 'etape', 'Réparer', '', '/maintenance/interventions?statut=en_cours', '', null, false, 2),
  ('maintenance', 'etape', 'Terminer l''ordre', '', '/maintenance/interventions', '', null, false, 3),
  ('maintenance', 'etape', 'Préventif', '', '/maintenance/preventif', '', null, false, 4),
  ('finance', 'etape', 'Saisir les dépenses', '', '/finance/fournisseurs/nouvelle', '', null, false, 1),
  ('finance', 'etape', 'Payer', '', '/finance/fournisseurs', '', null, false, 2),
  ('finance', 'etape', 'Suivre la trésorerie', '', '/finance/tresorerie', '', null, false, 3),
  ('finance', 'etape', 'Envoyer au comptable', '', '/finance/exports', '', null, false, 4),
  -- À faire aujourd'hui
  ('magasin', 'tache', 'Article(s) en rupture', '', '/magasin/articles', '', 'stock_rupture', true, 1),
  ('magasin', 'tache', 'Article(s) bientôt en rupture : demander un achat', '', '/magasin/demandes', '', 'stock_sous_seuil', false, 2),
  ('magasin', 'tache', 'Inventaire(s) à terminer', '', '/magasin/inventaires', '', 'inventaires_en_cours', false, 3),
  ('production', 'tache', 'Fiche(s) de poste à valider', '', '/production/fiches?statut=brouillon', '', 'fiches_brouillon', true, 1),
  ('production', 'tache', 'Ordre(s) de fabrication à produire', '', '/production/ordres', '', 'of_a_produire', false, 2),
  ('production', 'tache', 'Panne(s) en cours de réparation', '', '/production/pannes', '', 'pannes_en_cours', false, 3),
  ('ventes', 'tache', 'Facture(s) en retard de paiement : relancer', '', '/ventes/impayes', '', 'factures_clients_retard', true, 1),
  ('ventes', 'tache', 'Commande(s) à livrer', '', '/ventes/pieces?type=commande', '', 'commandes_a_livrer', false, 2),
  ('ventes', 'tache', 'Brouillon(s) à valider (devis, factures…)', '', '/ventes/pieces?type=facture&statut=brouillon', '', 'pieces_brouillon', false, 3),
  ('commercial', 'tache', 'Réclamation(s) client à suivre', '', '/commercial/reclamations', '', 'reclamations_ouvertes', true, 1),
  ('commercial', 'tache', 'Point(s) de vente sans position GPS', '', '/commercial/portefeuilles', '', 'pva_sans_gps', false, 2),
  ('achats', 'tache', 'Demande(s) d''achat à approuver', '', '/achats/demandes', '', 'demandes_a_approuver', true, 1),
  ('achats', 'tache', 'Bon(s) de commande à envoyer', '', '/achats/commandes', '', 'bc_brouillon', false, 2),
  ('logistique', 'tache', 'Livraison(s) à mettre dans une tournée', '', '/logistique/tournees/nouvelle', '', 'livraisons_a_planifier', true, 1),
  ('logistique', 'tache', 'Tournée(s) en cours à terminer', '', '/logistique/tournees?statut=en_cours', '', 'tournees_en_cours', false, 2),
  ('qualite', 'tache', 'Non-conformité(s) à analyser', '', '/qualite/non-conformites?statut=ouverte', '', 'nc_ouvertes', true, 1),
  ('qualite', 'tache', 'Action(s) corrective(s) en retard', '', '/qualite/non-conformites?statut=en_traitement', '', 'actions_en_retard', true, 2),
  ('qualite', 'tache', 'Contrôle(s) à terminer', '', '/qualite/controles', '', 'controles_brouillon', false, 3),
  ('maintenance', 'tache', 'Panne(s) ou demande(s) à prendre en charge', '', '/maintenance/interventions?statut=demandee', '', 'ot_demandes', true, 1),
  ('maintenance', 'tache', 'Entretien(s) préventif(s) en retard', '', '/maintenance/preventif', '', 'preventif_en_retard', true, 2),
  ('maintenance', 'tache', 'Intervention(s) en cours à terminer', '', '/maintenance/interventions?statut=en_cours', '', 'ot_en_cours', false, 3),
  ('finance', 'tache', 'Facture(s) fournisseur en retard : payer', '', '/finance/fournisseurs?etat=en_retard', '', 'factures_fournisseurs_retard', true, 1),
  ('finance', 'tache', 'Facture(s) client en retard : relancer', '', '/ventes/impayes', '', 'factures_clients_retard', false, 2);
