/**
 * Espaces de l'application : chaque rôle ne voit QUE ses espaces.
 * Ce fichier sert aux redirections et au menu. La vraie barrière reste la RLS en base.
 */

export const ROLES = [
  "direction",
  "achats",
  "magasin",
  "production",
  "maintenance",
  "qualite",
  "commercial_terrain",
  "responsable_commercial",
  "logistique",
  "finance",
  "admin",
] as const;

export type Role = (typeof ROLES)[number];

export const LIBELLES_ROLES: Record<Role, string> = {
  direction: "Direction",
  achats: "Achats et approvisionnement",
  magasin: "Magasin",
  production: "Production",
  maintenance: "Maintenance",
  qualite: "Qualité (QHSE)",
  commercial_terrain: "Commercial terrain",
  responsable_commercial: "Responsable commercial",
  logistique: "Logistique et livraison",
  finance: "Comptabilité et finance",
  admin: "Administrateur système",
};

export interface Espace {
  /** Premier segment d'URL, ex. « magasin » → /magasin */
  code: string;
  libelle: string;
  description: string;
  /** Rôles autorisés (la Direction a accès à tout). */
  roles: Role[];
  /** Étape de livraison où l'espace devient fonctionnel. */
  disponibilite: string;
}

export const ESPACES: Espace[] = [
  { code: "direction", libelle: "Tableau de bord", description: "Vue globale et alertes du jour", roles: ["direction"], disponibilite: "Phase 1 – étape 6" },
  { code: "magasin", libelle: "Stocks", description: "Matières premières, emballages, produits finis", roles: ["magasin"], disponibilite: "Phase 1 – étape 2" },
  { code: "production", libelle: "Production", description: "Ordres de fabrication et fiches de poste", roles: ["production"], disponibilite: "Phase 1 – étape 3" },
  { code: "ventes", libelle: "Ventes", description: "Clients, devis, factures, paiements", roles: ["finance", "responsable_commercial"], disponibilite: "Phase 1 – étape 4" },
  { code: "terrain", libelle: "Terrain", description: "Points de vente, visites, devis et factures", roles: ["commercial_terrain"], disponibilite: "Phase 1 – étape 5" },
  { code: "commercial", libelle: "Équipe commerciale", description: "Commerciaux, carte des PVA, visites", roles: ["responsable_commercial"], disponibilite: "Phase 1 – étape 5" },
  { code: "achats", libelle: "Achats", description: "Fournisseurs, commandes, conteneurs", roles: ["achats"], disponibilite: "Phase 2 – étape 1" },
  { code: "logistique", libelle: "Logistique", description: "Tournées, véhicules, preuves de livraison", roles: ["logistique"], disponibilite: "Phase 2 – étape 2" },
  { code: "qualite", libelle: "Qualité", description: "Contrôles, non-conformités, traçabilité", roles: ["qualite"], disponibilite: "Phase 2 – étape 3" },
  { code: "maintenance", libelle: "Maintenance", description: "Équipements, préventif, pannes", roles: ["maintenance"], disponibilite: "Phase 2" },
  { code: "finance", libelle: "Finance", description: "Trésorerie, créances, dettes, résultat", roles: ["finance"], disponibilite: "Phase 3" },
  { code: "admin", libelle: "Administration", description: "Utilisateurs, paramètres, produits, journal", roles: ["admin"], disponibilite: "Disponible" },
];

/** La Direction a accès à tous les espaces ; les autres rôles uniquement aux leurs. */
export function peutAcceder(espace: Espace, roles: readonly string[]): boolean {
  return roles.includes("direction") || espace.roles.some((r) => roles.includes(r));
}

export function espacesAccessibles(roles: readonly string[]): Espace[] {
  return ESPACES.filter((e) => peutAcceder(e, roles));
}

export function espaceDuChemin(chemin: string): Espace | undefined {
  const segment = chemin.split("/")[1] ?? "";
  return ESPACES.find((e) => e.code === segment);
}

/** Page d'accueil d'un utilisateur selon ses rôles (le commercial terrain arrive sur son application). */
export function accueilPour(roles: readonly string[]): string {
  const premier = espacesAccessibles(roles)[0];
  return premier ? `/${premier.code}` : "/acces-refuse";
}
