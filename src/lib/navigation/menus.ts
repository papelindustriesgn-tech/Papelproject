/**
 * Menus des applications (à la Odoo) : chaque espace a sa barre de menus horizontale,
 * avec des groupes déroulants (ex. « Configuration »). Données pures, partagées serveur / navigateur.
 */

export interface LienMenu {
  href: string;
  libelle: string;
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
  direction: [
    { libelle: "Tableau de bord", href: "/direction" },
    { libelle: "Alertes", href: "/direction/alertes" },
    { libelle: "Tâches", href: "/direction/taches" },
    { libelle: "Objectifs mensuels", href: "/direction/objectifs" },
    { libelle: "Rapport hebdomadaire", href: "/direction/rapport" },
  ],
  magasin: [
    { libelle: "Vue d'ensemble", href: "/magasin" },
    { libelle: "Alertes", href: "/magasin/alertes" },
    { libelle: "Tâches", href: "/magasin/taches" },
    { libelle: "Commandes clients", href: "/magasin/commandes" },
    { libelle: "Objectifs mensuels", href: "/magasin/objectifs" },
    {
      libelle: "Opérations",
      enfants: [
        { href: "/magasin/mouvements", libelle: "Mouvements de stock" },
        { href: "/magasin/mouvements/nouveau", libelle: "Nouveau mouvement" },
        { href: "/magasin/inventaires", libelle: "Inventaires" },
        { href: "/magasin/demandes", libelle: "Demandes d'achat" },
      ],
    },
    {
      libelle: "Produits",
      enfants: [
        { href: "/magasin/articles", libelle: "Articles" },
        { href: "/magasin/bobines", libelle: "Bobines (lots)" },
      ],
    },
    { libelle: "Non-conformités", href: "/magasin/non-conformites" },
    { libelle: "Configuration", enfants: [{ href: "/magasin/listes", libelle: "Listes de référence" }] },
  ],
  production: [
    { libelle: "Vue d'ensemble", href: "/production" },
    { libelle: "Alertes", href: "/production/alertes" },
    { libelle: "Tâches", href: "/production/taches" },
    { libelle: "Commandes clients", href: "/production/commandes" },
    { libelle: "Objectifs mensuels", href: "/production/objectifs" },
    {
      libelle: "Opérations",
      enfants: [
        { href: "/production/ordres", libelle: "Ordres de fabrication" },
        { href: "/production/fiches", libelle: "Fiches de poste" },
        { href: "/production/fiches/nouvelle", libelle: "Nouvelle fiche de poste" },
      ],
    },
    {
      libelle: "Signalements",
      enfants: [
        { href: "/production/pannes", libelle: "Pannes" },
        { href: "/production/non-conformites", libelle: "Non-conformités" },
        { href: "/production/demandes", libelle: "Demandes d'achat" },
      ],
    },
    { libelle: "Configuration", enfants: [{ href: "/production/listes", libelle: "Postes, équipes, lignes, causes d'arrêt…" }] },
  ],
  ventes: [
    { libelle: "Vue d'ensemble", href: "/ventes" },
    { libelle: "Alertes", href: "/ventes/alertes" },
    { libelle: "Tâches", href: "/ventes/taches" },
    { libelle: "Commandes clients", href: "/ventes/commandes" },
    { libelle: "Objectifs mensuels", href: "/ventes/objectifs" },
    {
      libelle: "Commandes",
      enfants: [
        { href: "/ventes/pieces?type=devis", libelle: "Devis" },
        { href: "/ventes/pieces?type=commande", libelle: "Bons de commande" },
        { href: "/ventes/clients", libelle: "Clients" },
      ],
    },
    {
      libelle: "Facturation",
      enfants: [
        { href: "/ventes/pieces?type=facture", libelle: "Factures" },
        { href: "/ventes/pieces?type=avoir", libelle: "Avoirs" },
        { href: "/ventes/impayes", libelle: "Impayés et relances" },
        { href: "/ventes/dotations", libelle: "Dotations" },
      ],
    },
    { libelle: "Configuration", enfants: [{ href: "/ventes/listes", libelle: "Types de clients, modes de paiement…" }] },
  ],
  commercial: [
    { libelle: "Carte et indicateurs", href: "/commercial" },
    { libelle: "Alertes", href: "/commercial/alertes" },
    { libelle: "Tâches", href: "/commercial/taches" },
    { libelle: "Commandes clients", href: "/commercial/commandes" },
    { libelle: "Objectifs mensuels", href: "/commercial/objectifs" },
    { libelle: "Portefeuilles", href: "/commercial/portefeuilles" },
    { libelle: "Visites", href: "/commercial/visites" },
    { libelle: "Tournées et objectifs", href: "/commercial/planification" },
    { libelle: "Réclamations", href: "/commercial/reclamations" },
    { libelle: "Configuration", enfants: [{ href: "/commercial/listes", libelle: "Listes de référence" }] },
  ],
  achats: [
    { libelle: "Vue d'ensemble", href: "/achats" },
    { libelle: "Alertes", href: "/achats/alertes" },
    { libelle: "Tâches", href: "/achats/taches" },
    { libelle: "Objectifs mensuels", href: "/achats/objectifs" },
    {
      libelle: "Achats",
      enfants: [
        { href: "/achats/demandes", libelle: "Demandes d'achat" },
        { href: "/achats/commandes", libelle: "Bons de commande" },
        { href: "/achats/commandes/nouveau", libelle: "Nouveau bon de commande" },
      ],
    },
    { libelle: "Conteneurs", href: "/achats/conteneurs" },
    { libelle: "Configuration", enfants: [{ href: "/achats/listes", libelle: "Fournisseurs, frais, documents" }] },
  ],
  logistique: [
    { libelle: "Vue d'ensemble", href: "/logistique" },
    { libelle: "Alertes", href: "/logistique/alertes" },
    { libelle: "Tâches", href: "/logistique/taches" },
    { libelle: "Commandes clients", href: "/logistique/commandes" },
    { libelle: "Objectifs mensuels", href: "/logistique/objectifs" },
    {
      libelle: "Tournées",
      enfants: [
        { href: "/logistique/tournees", libelle: "Toutes les tournées" },
        { href: "/logistique/tournees/nouvelle", libelle: "Nouvelle tournée" },
      ],
    },
    { libelle: "Configuration", enfants: [{ href: "/logistique/listes", libelle: "Véhicules, chauffeurs, dépenses" }] },
  ],
  qualite: [
    { libelle: "Vue d'ensemble", href: "/qualite" },
    { libelle: "Alertes", href: "/qualite/alertes" },
    { libelle: "Tâches", href: "/qualite/taches" },
    { libelle: "Objectifs mensuels", href: "/qualite/objectifs" },
    { libelle: "Contrôles", href: "/qualite/controles" },
    { libelle: "Non-conformités", href: "/qualite/non-conformites" },
    { libelle: "Traçabilité", href: "/qualite/tracabilite" },
    { libelle: "Configuration", enfants: [{ href: "/qualite/listes", libelle: "Critères et types de NC" }] },
  ],
  maintenance: [
    { libelle: "Vue d'ensemble", href: "/maintenance" },
    { libelle: "Alertes", href: "/maintenance/alertes" },
    { libelle: "Tâches", href: "/maintenance/taches" },
    { libelle: "Objectifs mensuels", href: "/maintenance/objectifs" },
    { libelle: "Ordres de travail", href: "/maintenance/interventions" },
    { libelle: "Préventif", href: "/maintenance/preventif" },
    { libelle: "Équipements", href: "/maintenance/equipements" },
    { libelle: "Configuration", enfants: [{ href: "/maintenance/listes", libelle: "Listes de référence" }] },
  ],
  finance: [
    { libelle: "Vue d'ensemble", href: "/finance" },
    { libelle: "Alertes", href: "/finance/alertes" },
    { libelle: "Tâches", href: "/finance/taches" },
    { libelle: "Objectifs mensuels", href: "/finance/objectifs" },
    { libelle: "Trésorerie", href: "/finance/tresorerie" },
    {
      libelle: "Fournisseurs",
      enfants: [
        { href: "/finance/fournisseurs", libelle: "Factures fournisseurs et charges" },
        { href: "/finance/fournisseurs/nouvelle", libelle: "Nouvelle facture fournisseur" },
      ],
    },
    {
      libelle: "Analyse",
      enfants: [
        { href: "/finance/resultat", libelle: "Résultat de gestion" },
        { href: "/finance/previsionnel", libelle: "Trésorerie prévisionnelle" },
        { href: "/finance/exports", libelle: "Exports comptables" },
        { href: "/finance/excel", libelle: "Connexion Excel" },
      ],
    },
    { libelle: "Configuration", enfants: [{ href: "/finance/listes", libelle: "Comptes, catégories, charges fixes" }] },
  ],
  rh: [
    { libelle: "Vue d'ensemble", href: "/rh" },
    { libelle: "Alertes", href: "/rh/alertes" },
    { libelle: "Tâches", href: "/rh/taches" },
    { libelle: "Objectifs mensuels", href: "/rh/objectifs" },
    { libelle: "Employés", href: "/rh/employes" },
    { libelle: "Présences", href: "/rh/presences" },
    { libelle: "Congés et absences", href: "/rh/absences" },
    { libelle: "Paie", href: "/rh/paie" },
    { libelle: "Configuration", enfants: [{ href: "/rh/listes", libelle: "Services, fonctions, contrats, absences, fériés, barème RTS" }] },
  ],
  admin: [
    { libelle: "Mise en route", href: "/admin/mise-en-route" },
    { libelle: "Tâches", href: "/admin/taches" },
    { libelle: "Utilisateurs", href: "/admin/utilisateurs" },
    { libelle: "Réglages des services", href: "/admin/reglages", adminSeulement: true },
    { libelle: "Paramètres", href: "/admin/parametres" },
    { libelle: "Produits et prix", href: "/admin/produits" },
    { libelle: "Taux de change", href: "/admin/taux-change" },
    { libelle: "Listes de référence", href: "/admin/listes" },
    { libelle: "Journal d'audit", href: "/admin/journal" },
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
