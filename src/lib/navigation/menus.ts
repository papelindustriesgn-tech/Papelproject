/**
 * Menus des applications (à la Odoo) : chaque espace a sa barre de menus horizontale,
 * avec des groupes déroulants (ex. « Configuration »). Données pures, partagées serveur / navigateur.
 */

export interface LienMenu {
  href: string;
  libelle: string;
  /** Visible seulement pour l'administrateur. */
  adminSeulement?: boolean;
}

export interface EntreeMenu {
  libelle: string;
  /** Lien direct… */
  href?: string;
  /** …ou groupe déroulant. */
  enfants?: LienMenu[];
  /** Visible seulement pour l'administrateur (ex. réglages des services). */
  adminSeulement?: boolean;
}

export const MENUS: Record<string, EntreeMenu[]> = {
  // Ordre de chaque menu : vue d'ensemble, alertes, le travail de tous les jours, la coordination avec les autres
  // services, puis « Configuration » (roue dentée, repliée) pour ce qu'on règle rarement.
  direction: [
    { libelle: "Tableau de bord", href: "/direction" },
    { libelle: "Alertes", href: "/direction/alertes" },
    { libelle: "Rapport de la semaine", href: "/direction/rapport" },
    { libelle: "Tâches", href: "/direction/taches" },
    { libelle: "Configuration", enfants: [{ href: "/direction/objectifs", libelle: "Objectifs mensuels" }] },
  ],
  magasin: [
    { libelle: "Vue d'ensemble", href: "/magasin" },
    { libelle: "Alertes", href: "/magasin/alertes" },
    { libelle: "Articles en stock", href: "/magasin/articles" },
    { libelle: "Entrées et sorties", href: "/magasin/mouvements" },
    { libelle: "Bobines", href: "/magasin/bobines" },
    { libelle: "Inventaires", href: "/magasin/inventaires" },
    { libelle: "Commandes clients", href: "/magasin/commandes" },
    { libelle: "Demandes d'achat", href: "/magasin/demandes" },
    { libelle: "Tâches", href: "/magasin/taches" },
    {
      libelle: "Configuration",
      enfants: [
        { href: "/magasin/listes", libelle: "Listes de référence" },
        { href: "/magasin/non-conformites", libelle: "Non-conformités" },
        { href: "/magasin/objectifs", libelle: "Objectifs mensuels" },
      ],
    },
  ],
  production: [
    { libelle: "Vue d'ensemble", href: "/production" },
    { libelle: "Alertes", href: "/production/alertes" },
    { libelle: "Fiches de poste", href: "/production/fiches" },
    { libelle: "Ordres de fabrication", href: "/production/ordres" },
    { libelle: "Commandes clients", href: "/production/commandes" },
    { libelle: "Pannes", href: "/production/pannes" },
    { libelle: "Tâches", href: "/production/taches" },
    {
      libelle: "Configuration",
      enfants: [
        { href: "/production/listes", libelle: "Postes, équipes, lignes, cadences…" },
        { href: "/production/non-conformites", libelle: "Non-conformités" },
        { href: "/production/demandes", libelle: "Demandes d'achat" },
        { href: "/production/objectifs", libelle: "Objectifs mensuels" },
      ],
    },
  ],
  ventes: [
    { libelle: "Vue d'ensemble", href: "/ventes" },
    { libelle: "Alertes", href: "/ventes/alertes" },
    { libelle: "Factures", href: "/ventes/pieces?type=facture" },
    { libelle: "Commandes", href: "/ventes/pieces?type=commande" },
    { libelle: "Devis", href: "/ventes/pieces?type=devis" },
    { libelle: "Clients", href: "/ventes/clients" },
    // Argent : encaissements reçus, ce qui reste dû, avoirs (corrections) et dotations à remettre.
    { libelle: "Encaissements", href: "/ventes/encaissements" },
    { libelle: "Impayés", href: "/ventes/impayes" },
    { libelle: "Avoirs", href: "/ventes/pieces?type=avoir" },
    { libelle: "Dotations", href: "/ventes/dotations" },
    { libelle: "Suivi des commandes", href: "/ventes/commandes" },
    { libelle: "Tâches", href: "/ventes/taches" },
    {
      libelle: "Configuration",
      enfants: [
        { href: "/ventes/listes", libelle: "Types de clients, modes de paiement…" },
        { href: "/ventes/objectifs", libelle: "Objectifs mensuels" },
      ],
    },
  ],
  commercial: [
    { libelle: "Carte et chiffres", href: "/commercial" },
    { libelle: "Alertes", href: "/commercial/alertes" },
    { libelle: "Visites", href: "/commercial/visites" },
    { libelle: "Portefeuilles", href: "/commercial/portefeuilles" },
    { libelle: "Tournées et objectifs", href: "/commercial/planification" },
    { libelle: "Suivi des commandes", href: "/commercial/commandes" },
    { libelle: "Réclamations", href: "/commercial/reclamations" },
    { libelle: "Tâches", href: "/commercial/taches" },
    {
      libelle: "Configuration",
      enfants: [
        { href: "/commercial/listes", libelle: "Listes de référence" },
        { href: "/commercial/objectifs", libelle: "Objectifs mensuels" },
      ],
    },
  ],
  achats: [
    { libelle: "Vue d'ensemble", href: "/achats" },
    { libelle: "Alertes", href: "/achats/alertes" },
    { libelle: "Demandes d'achat", href: "/achats/demandes" },
    { libelle: "Bons de commande", href: "/achats/commandes" },
    { libelle: "Conteneurs", href: "/achats/conteneurs" },
    { libelle: "Tâches", href: "/achats/taches" },
    {
      libelle: "Configuration",
      enfants: [
        { href: "/achats/listes", libelle: "Fournisseurs, frais, documents" },
        { href: "/achats/objectifs", libelle: "Objectifs mensuels" },
      ],
    },
  ],
  logistique: [
    { libelle: "Vue d'ensemble", href: "/logistique" },
    { libelle: "Alertes", href: "/logistique/alertes" },
    { libelle: "Tournées", href: "/logistique/tournees" },
    { libelle: "Commandes à livrer", href: "/logistique/commandes" },
    { libelle: "Tâches", href: "/logistique/taches" },
    {
      libelle: "Configuration",
      enfants: [
        { href: "/logistique/listes", libelle: "Véhicules, chauffeurs, dépenses" },
        { href: "/logistique/objectifs", libelle: "Objectifs mensuels" },
      ],
    },
  ],
  qualite: [
    { libelle: "Vue d'ensemble", href: "/qualite" },
    { libelle: "Alertes", href: "/qualite/alertes" },
    { libelle: "Contrôles", href: "/qualite/controles" },
    { libelle: "Non-conformités", href: "/qualite/non-conformites" },
    { libelle: "Traçabilité", href: "/qualite/tracabilite" },
    { libelle: "Tâches", href: "/qualite/taches" },
    {
      libelle: "Configuration",
      enfants: [
        { href: "/qualite/listes", libelle: "Critères et types de NC" },
        { href: "/qualite/objectifs", libelle: "Objectifs mensuels" },
      ],
    },
  ],
  maintenance: [
    { libelle: "Vue d'ensemble", href: "/maintenance" },
    { libelle: "Alertes", href: "/maintenance/alertes" },
    { libelle: "Ordres de travail", href: "/maintenance/interventions" },
    { libelle: "Préventif", href: "/maintenance/preventif" },
    { libelle: "Équipements", href: "/maintenance/equipements" },
    { libelle: "Tâches", href: "/maintenance/taches" },
    {
      libelle: "Configuration",
      enfants: [
        { href: "/maintenance/listes", libelle: "Listes de référence" },
        { href: "/maintenance/objectifs", libelle: "Objectifs mensuels" },
      ],
    },
  ],
  finance: [
    { libelle: "Vue d'ensemble", href: "/finance" },
    { libelle: "Alertes", href: "/finance/alertes" },
    { libelle: "Trésorerie", href: "/finance/tresorerie" },
    { libelle: "Factures fournisseurs", href: "/finance/fournisseurs" },
    { libelle: "Résultat", href: "/finance/resultat" },
    { libelle: "Prévisions", href: "/finance/previsionnel" },
    { libelle: "Tâches", href: "/finance/taches" },
    {
      libelle: "Configuration",
      enfants: [
        { href: "/finance/listes", libelle: "Comptes, catégories, charges fixes" },
        { href: "/finance/exports", libelle: "Exports comptables" },
        { href: "/finance/excel", libelle: "Connexion Excel" },
        { href: "/finance/objectifs", libelle: "Objectifs mensuels" },
      ],
    },
  ],
  rh: [
    { libelle: "Vue d'ensemble", href: "/rh" },
    { libelle: "Alertes", href: "/rh/alertes" },
    { libelle: "Présences", href: "/rh/presences" },
    { libelle: "Congés et absences", href: "/rh/absences" },
    { libelle: "Employés", href: "/rh/employes" },
    { libelle: "Paie", href: "/rh/paie" },
    { libelle: "Tâches", href: "/rh/taches" },
    {
      libelle: "Configuration",
      enfants: [
        { href: "/rh/listes", libelle: "Services, fonctions, contrats, absences, fériés, barème RTS" },
        { href: "/rh/objectifs", libelle: "Objectifs mensuels" },
      ],
    },
  ],
  admin: [
    { libelle: "Mise en route", href: "/admin/mise-en-route" },
    { libelle: "Utilisateurs", href: "/admin/utilisateurs" },
    { libelle: "Produits et prix", href: "/admin/produits" },
    { libelle: "Taux de change", href: "/admin/taux-change" },
    { libelle: "Tâches", href: "/admin/taches" },
    {
      libelle: "Configuration",
      enfants: [
        { href: "/admin/reglages", libelle: "Réglages des services", adminSeulement: true },
        { href: "/admin/parametres", libelle: "Paramètres et seuils" },
        { href: "/admin/listes", libelle: "Listes de référence" },
        { href: "/admin/journal", libelle: "Journal d'audit" },
      ],
    },
  ],
  terrain: [],
};

/** Vrai si le lien correspond à la page affichée (chemin + type de pièce éventuel). */
export function lienActif(href: string, chemin: string, recherche: string): boolean {
  const [cible, requete] = href.split("?");
  if (requete) return chemin === cible && new URLSearchParams(recherche).get("type") === new URLSearchParams(requete).get("type");
  // La racine d'un espace n'est active que sur elle-même.
  if (cible.split("/").length === 2) return chemin === cible;
  return chemin === cible || chemin.startsWith(`${cible}/`);
}
