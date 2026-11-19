-- Accueil de chaque service : les gestes du jour en mots simples, dans l'ordre du travail quotidien.
-- On ne modifie QUE les éléments restés à leur valeur de départ (libellé et écran d'origine) : ce que
-- l'administrateur a déjà changé dans « Réglages des services » est conservé tel quel.
-- Nouveaux éléments ajoutés seulement s'ils n'existent pas déjà (même service, même écran).

create or replace function pg_temp.renommer(p_espace text, p_genre text, p_ancien text, p_ancien_ecran text, p_libelle text, p_ecran text, p_description text, p_ordre integer)
returns void language sql as $$
  update public.accueil_elements
     set libelle = p_libelle, ecran = p_ecran, description = coalesce(p_description, description), ordre = coalesce(p_ordre, ordre)
   where espace = p_espace and genre = p_genre and libelle = p_ancien and ecran = p_ancien_ecran;
$$;

create or replace function pg_temp.ajouter(p_espace text, p_genre text, p_libelle text, p_description text, p_ecran text, p_icone text, p_indicateur text, p_urgent boolean, p_ordre integer)
returns void language sql as $$
  insert into public.accueil_elements (espace, genre, libelle, description, ecran, icone, indicateur, urgent, ordre)
  select p_espace, p_genre, p_libelle, p_description, p_ecran, p_icone, p_indicateur, p_urgent, p_ordre
   where not exists (select 1 from public.accueil_elements e where e.espace = p_espace and e.genre = p_genre and split_part(e.ecran, '?', 1) = split_part(p_ecran, '?', 1)
                       and (p_genre = 'action' or e.indicateur = p_indicateur));
$$;

-- Magasin : préparer les commandes, réceptionner, sortir, compter.
select pg_temp.ajouter('magasin', 'action', 'Préparer une commande', 'Commandes clients à servir', '/magasin/commandes', 'livre', null, false, 0);
select pg_temp.renommer('magasin', 'action', 'Réceptionner une bobine', '/magasin/bobines', 'Réceptionner', '/magasin/bobines', 'Arrivée d''une bobine ou de marchandise', 1);
select pg_temp.renommer('magasin', 'action', 'Entrée ou sortie', '/magasin/mouvements/nouveau', 'Sortie ou entrée', '/magasin/mouvements/nouveau', null, 2);
select pg_temp.renommer('magasin', 'action', 'Faire un inventaire', '/magasin/inventaires', 'Compter le stock', '/magasin/inventaires', null, 3);

-- Production : saisir la production, signaler un arrêt ou un défaut, voir le travail à produire.
select pg_temp.renommer('production', 'action', 'Saisir ma fiche de poste', '/production/fiches/nouvelle', 'Saisir la production', '/production/fiches/nouvelle', 'Ce qui a été produit pendant le poste', null);
select pg_temp.renommer('production', 'action', 'Signaler une panne', '/production/pannes', 'Signaler un arrêt ou une panne', '/production/pannes', null, null);
select pg_temp.renommer('production', 'action', 'Signaler un problème qualité', '/production/non-conformites', 'Signaler un défaut', '/production/non-conformites', null, null);
select pg_temp.renommer('production', 'action', 'Ordres de fabrication', '/production/ordres', 'Travail à produire', '/production/ordres', null, null);
select pg_temp.renommer('production', 'tache', 'Fiche(s) de poste à valider', '/production/fiches?statut=brouillon', 'Saisie(s) de production à terminer', '/production/fiches?statut=brouillon', null, null);
select pg_temp.renommer('production', 'tache', 'Ordre(s) de fabrication à produire', '/production/ordres', 'Travail à produire', '/production/ordres', null, null);

-- Ventes : facturer ce qui est livré, prendre une commande, enregistrer l'argent reçu.
select pg_temp.renommer('ventes', 'action', 'Nouvelle facture', '/ventes/pieces/nouvelle?type=facture', 'Facturer une commande', '/ventes/a-facturer', 'Ce qui est livré et pas encore facturé', null);
select pg_temp.renommer('ventes', 'action', 'Nouveau devis', '/ventes/pieces/nouvelle?type=devis', 'Nouvelle commande', '/ventes/pieces/nouvelle?type=commande', 'Un client commande au bureau', null);
select pg_temp.renommer('ventes', 'action', 'Encaisser un paiement', '/ventes/impayes', 'Enregistrer un paiement', '/ventes/impayes', 'Un client paie une facture', null);
select pg_temp.renommer('ventes', 'tache', 'Commande(s) à livrer', '/ventes/pieces?type=commande', 'Commande(s) pas encore livrée(s)', '/ventes/commandes', null, null);
select pg_temp.ajouter('ventes', 'tache', 'Commande(s) livrée(s) à facturer', '', '/ventes/a-facturer', '', 'commandes_a_facturer', true, 0);
select pg_temp.ajouter('ventes', 'tache', 'Commande(s) dont la date de livraison est à confirmer', '', '/ventes/commandes', '', 'commandes_date_a_confirmer', false, 1);

-- Comptabilité : facturer, paiement, dépense, caisse et banque.
select pg_temp.ajouter('finance', 'action', 'Facturer une commande', 'Ce qui est livré et pas encore facturé', '/ventes/a-facturer', 'facture', null, false, -3);
select pg_temp.ajouter('finance', 'action', 'Enregistrer un paiement', 'Un client paie une facture', '/ventes/impayes', 'argent', null, false, -2);
select pg_temp.renommer('finance', 'action', 'Facture fournisseur', '/finance/fournisseurs/nouvelle', 'Enregistrer une dépense', '/finance/fournisseurs/nouvelle', 'Facture d''un fournisseur, achat payé', -1);
select pg_temp.renommer('finance', 'action', 'Trésorerie', '/finance/tresorerie', 'Vérifier la caisse et la banque', '/finance/tresorerie', 'Soldes et derniers mouvements', 0);
select pg_temp.ajouter('finance', 'tache', 'Commande(s) livrée(s) à facturer', '', '/ventes/a-facturer', '', 'commandes_a_facturer', true, 0);

-- Mots simples ailleurs.
select pg_temp.renommer('maintenance', 'action', 'Nouvel ordre de travail', '/maintenance/interventions', 'Nouvelle intervention', '/maintenance/interventions', null, null);
select pg_temp.renommer('qualite', 'tache', 'Non-conformité(s) à analyser', '/qualite/non-conformites?statut=ouverte', 'Problème(s) qualité à analyser', '/qualite/non-conformites?statut=ouverte', null, null);
