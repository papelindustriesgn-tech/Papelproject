/**
 * « Ne pas faire réfléchir l'utilisateur » : pour chaque application, une promesse en une phrase
 * (à quoi elle sert) et le parcours du travail en quelques étapes, dans l'ordre.
 * Données pures, partagées serveur / navigateur.
 */

export interface EtapeParcours {
  libelle: string;
  href: string;
}

/** Une phrase, affichée à l'entrée de l'application : ce qu'on y fait. */
export const PROMESSES: Record<string, string> = {
  direction: "Toute l'usine sur une page : ventes, production, stock et argent, avec ce qui demande votre attention.",
  magasin: "Savoir à tout moment ce qu'il y a dans l'usine : chaque entrée et chaque sortie est notée ici.",
  production: "Noter ce que chaque poste a produit et consommé, et voir tout de suite si le rendement est bon.",
  ventes: "Facturer les clients, suivre ce qu'ils doivent et enregistrer leurs paiements.",
  commercial: "Voir le travail des commerciaux sur la carte et leur donner chacun leurs clients.",
  achats: "Commander aux fournisseurs et suivre les conteneurs jusqu'à l'usine.",
  logistique: "Livrer les clients : un camion, un chauffeur, des bons de livraison, une signature.",
  qualite: "Contrôler la matière et la production, et traiter chaque problème jusqu'au bout.",
  maintenance: "Réparer les pannes vite et entretenir les machines avant qu'elles ne cassent.",
  finance: "Savoir combien il y a en caisse et en banque, ce qu'on doit et ce qu'on gagne.",
  admin: "Créer les comptes des employés et régler les prix et paramètres de l'entreprise.",
};

/** Le chemin normal du travail, étape par étape (chaque étape mène à son écran). */
export const PARCOURS: Record<string, EtapeParcours[]> = {
  magasin: [
    { libelle: "Recevoir", href: "/magasin/bobines" },
    { libelle: "Sortir", href: "/magasin/mouvements/nouveau" },
    { libelle: "Compter", href: "/magasin/inventaires" },
    { libelle: "Commander ce qui manque", href: "/magasin/demandes" },
  ],
  production: [
    { libelle: "Ordre de fabrication", href: "/production/ordres" },
    { libelle: "Fiche de poste", href: "/production/fiches/nouvelle" },
    { libelle: "Valider la fiche", href: "/production/fiches?statut=brouillon" },
    { libelle: "Voir le rendement", href: "/production" },
  ],
  ventes: [
    { libelle: "Client", href: "/ventes/clients" },
    { libelle: "Devis", href: "/ventes/pieces?type=devis" },
    { libelle: "Facture", href: "/ventes/pieces?type=facture" },
    { libelle: "Livraison", href: "/ventes/pieces?type=commande" },
    { libelle: "Paiement", href: "/ventes/impayes" },
  ],
  commercial: [
    { libelle: "Répartir les clients", href: "/commercial/portefeuilles" },
    { libelle: "Planifier les tournées", href: "/commercial/planification" },
    { libelle: "Suivre les visites", href: "/commercial/visites" },
    { libelle: "Comparer aux objectifs", href: "/commercial" },
  ],
  achats: [
    { libelle: "Demande d'un service", href: "/achats/demandes" },
    { libelle: "Bon de commande", href: "/achats/commandes" },
    { libelle: "Conteneur", href: "/achats/conteneurs" },
    { libelle: "Réception au magasin", href: "/magasin/bobines" },
  ],
  logistique: [
    { libelle: "Préparer la tournée", href: "/logistique/tournees/nouvelle" },
    { libelle: "Démarrer", href: "/logistique/tournees?statut=planifiee" },
    { libelle: "Livrer et faire signer", href: "/logistique/tournees?statut=en_cours" },
    { libelle: "Terminer", href: "/logistique/tournees?statut=en_cours" },
  ],
  qualite: [
    { libelle: "Contrôler", href: "/qualite/controles" },
    { libelle: "Problème ?", href: "/qualite/non-conformites?statut=ouverte" },
    { libelle: "Corriger", href: "/qualite/non-conformites?statut=en_traitement" },
    { libelle: "Clôturer", href: "/qualite/non-conformites" },
  ],
  maintenance: [
    { libelle: "Panne signalée", href: "/maintenance/interventions?statut=demandee" },
    { libelle: "Réparer", href: "/maintenance/interventions?statut=en_cours" },
    { libelle: "Terminer l'ordre", href: "/maintenance/interventions" },
    { libelle: "Préventif", href: "/maintenance/preventif" },
  ],
  finance: [
    { libelle: "Saisir les dépenses", href: "/finance/fournisseurs/nouvelle" },
    { libelle: "Payer", href: "/finance/fournisseurs" },
    { libelle: "Suivre la trésorerie", href: "/finance/tresorerie" },
    { libelle: "Envoyer au comptable", href: "/finance/exports" },
  ],
};
