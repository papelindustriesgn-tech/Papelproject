/**
 * Catalogue des indicateurs « À faire » : ce que l'ERP sait compter (le calcul est dans le code,
 * `src/components/coque/entree-appli.tsx`). Chaque service CHOISIT dans sa page de réglages lesquels
 * afficher, avec son propre libellé, son urgence et son seuil d'affichage (table `accueil_elements`).
 * Données pures, partagées serveur / navigateur.
 */

export interface Indicateur {
  code: string;
  /** Ce qui est compté (aide au choix dans les réglages). */
  libelle: string;
  /** Application d'origine (regroupement dans la liste de choix). */
  domaine: string;
  /** Écran proposé par défaut pour traiter. */
  ecran: string;
}

export const INDICATEURS: Indicateur[] = [
  { code: "stock_rupture", libelle: "Articles en rupture de stock", domaine: "Stocks", ecran: "/magasin/articles" },
  { code: "stock_sous_seuil", libelle: "Articles sous le seuil ou à couverture faible", domaine: "Stocks", ecran: "/magasin/demandes" },
  { code: "inventaires_en_cours", libelle: "Inventaires ouverts non validés", domaine: "Stocks", ecran: "/magasin/inventaires" },
  { code: "bobines_bloquees", libelle: "Bobines bloquées par la qualité", domaine: "Stocks", ecran: "/magasin/bobines" },
  { code: "fiches_brouillon", libelle: "Saisies de production non validées", domaine: "Production", ecran: "/production/fiches?statut=brouillon" },
  { code: "of_a_produire", libelle: "Ordres de production prévus ou en cours", domaine: "Production", ecran: "/production/ordres" },
  { code: "pannes_en_cours", libelle: "Pannes signalées non terminées", domaine: "Production", ecran: "/production/pannes" },
  { code: "factures_clients_retard", libelle: "Factures clients en retard de paiement", domaine: "Ventes", ecran: "/ventes/impayes" },
  { code: "commandes_a_livrer", libelle: "Commandes clients avec un reste à livrer", domaine: "Ventes", ecran: "/ventes/pieces?type=commande" },
  { code: "pieces_brouillon", libelle: "Devis, commandes, factures en brouillon", domaine: "Ventes", ecran: "/ventes/pieces?type=facture&statut=brouillon" },
  { code: "reclamations_ouvertes", libelle: "Réclamations clients non clôturées", domaine: "Équipe commerciale", ecran: "/commercial/reclamations" },
  { code: "pva_sans_gps", libelle: "Points de vente sans position GPS", domaine: "Équipe commerciale", ecran: "/commercial/portefeuilles" },
  { code: "demandes_a_approuver", libelle: "Demandes d'achat à approuver", domaine: "Achats", ecran: "/achats/demandes" },
  { code: "bc_brouillon", libelle: "Bons de commande non envoyés", domaine: "Achats", ecran: "/achats/commandes" },
  { code: "conteneurs_en_route", libelle: "Conteneurs pas encore livrés", domaine: "Achats", ecran: "/achats/conteneurs" },
  { code: "livraisons_a_planifier", libelle: "Bons de livraison sans tournée", domaine: "Logistique", ecran: "/logistique/tournees/nouvelle" },
  { code: "livraisons_en_retard", libelle: "Bons de livraison non remis depuis plus de N jours (paramètre)", domaine: "Logistique", ecran: "/logistique" },
  { code: "tournees_en_cours", libelle: "Tournées en cours", domaine: "Logistique", ecran: "/logistique/tournees?statut=en_cours" },
  { code: "nc_ouvertes", libelle: "Problèmes qualité en cours", domaine: "Qualité", ecran: "/qualite/non-conformites?statut=ouverte" },
  { code: "nc_critiques", libelle: "Problèmes qualité graves non réglés", domaine: "Qualité", ecran: "/qualite/non-conformites" },
  { code: "actions_en_retard", libelle: "Actions correctives en retard", domaine: "Qualité", ecran: "/qualite/non-conformites?statut=en_traitement" },
  { code: "controles_brouillon", libelle: "Contrôles qualité non validés", domaine: "Qualité", ecran: "/qualite/controles" },
  { code: "ot_demandes", libelle: "Ordres de travail demandés (à prendre en charge)", domaine: "Maintenance", ecran: "/maintenance/interventions?statut=demandee" },
  { code: "ot_en_cours", libelle: "Ordres de travail en cours", domaine: "Maintenance", ecran: "/maintenance/interventions?statut=en_cours" },
  { code: "preventif_en_retard", libelle: "Entretiens préventifs à échéance dépassée", domaine: "Maintenance", ecran: "/maintenance/preventif" },
  { code: "pieces_critiques", libelle: "Pièces de rechange critiques sous le seuil", domaine: "Maintenance", ecran: "/maintenance/equipements" },
  { code: "factures_fournisseurs_retard", libelle: "Factures fournisseurs en retard de paiement", domaine: "Finance", ecran: "/finance/fournisseurs?etat=en_retard" },
  { code: "absences_a_decider", libelle: "Demandes de congé ou d'absence à décider", domaine: "Ressources humaines", ecran: "/rh/absences?statut=demandee" },
  { code: "presences_non_saisies", libelle: "Feuille de présence du jour non remplie (1 si oui)", domaine: "Ressources humaines", ecran: "/rh/presences" },
  { code: "contrats_echeance", libelle: "Contrats qui se terminent dans N jours (paramètre)", domaine: "Ressources humaines", ecran: "/rh/employes?contrat=echeance" },
  { code: "paie_a_valider", libelle: "Paie du mois dernier non validée (1 si oui)", domaine: "Ressources humaines", ecran: "/rh/paie" },
  { code: "absents_du_jour", libelle: "Employés absents aujourd'hui", domaine: "Ressources humaines", ecran: "/rh/presences" },
  { code: "factures_fournisseurs_a_payer", libelle: "Factures fournisseurs à payer", domaine: "Finance", ecran: "/finance/fournisseurs" },
];

/** Icônes proposées pour les boutons (le dessin est associé dans le code). */
export const ICONES: { code: string; libelle: string }[] = [
  { code: "facture", libelle: "Facture" },
  { code: "devis", libelle: "Devis" },
  { code: "argent", libelle: "Argent" },
  { code: "client", libelle: "Personne" },
  { code: "stock", libelle: "Entrepôt" },
  { code: "reception", libelle: "Réception" },
  { code: "mouvement", libelle: "Entrée / sortie" },
  { code: "inventaire", libelle: "Liste" },
  { code: "panier", libelle: "Achat" },
  { code: "fiche", libelle: "Fiche" },
  { code: "panne", libelle: "Clé (panne)" },
  { code: "alerte", libelle: "Alerte" },
  { code: "usine", libelle: "Usine" },
  { code: "carte", libelle: "Carte" },
  { code: "calendrier", libelle: "Calendrier" },
  { code: "visite", libelle: "Point GPS" },
  { code: "bateau", libelle: "Bateau" },
  { code: "camion", libelle: "Camion" },
  { code: "controle", libelle: "Contrôle" },
  { code: "recherche", libelle: "Loupe" },
  { code: "export", libelle: "Téléchargement" },
  { code: "excel", libelle: "Tableur" },
  { code: "rapport", libelle: "Rapport" },
  { code: "ventes", libelle: "Reçu" },
  { code: "reglages", libelle: "Réglages" },
  { code: "livre", libelle: "Colis livré" },
];

/** Applications dont l'entrée se règle (l'application terrain est réglée avec l'équipe commerciale). */
export const ESPACES_REGLABLES = ["direction", "magasin", "production", "ventes", "commercial", "achats", "logistique", "qualite", "maintenance", "finance", "rh"];

/** Catégories de paramètres de chaque service (même correspondance que `espace_de_categorie` en SQL). */
export const CATEGORIES_PARAMETRES: Record<string, { code: string; libelle: string }[]> = {
  direction: [
    { code: "entreprise", libelle: "Entreprise (devis et factures)" },
    { code: "direction", libelle: "Rapport hebdomadaire" },
  ],
  magasin: [{ code: "stock", libelle: "Seuils de stock" }],
  production: [{ code: "production", libelle: "Seuils et références de production" }],
  ventes: [{ code: "ventes", libelle: "TVA, dotation et impayés" }],
  commercial: [{ code: "terrain", libelle: "Application terrain et alertes commerciales" }],
  achats: [{ code: "achats", libelle: "Achats" }],
  logistique: [{ code: "logistique", libelle: "Livraisons" }],
  qualite: [{ code: "qualite", libelle: "Qualité" }],
  maintenance: [{ code: "maintenance", libelle: "Maintenance" }],
  rh: [{ code: "rh", libelle: "Congés, heures supplémentaires, CNSS" }],
  finance: [
    { code: "comptabilite", libelle: "Comptes et dettes" },
    { code: "finance", libelle: "Finance" },
  ],
};
