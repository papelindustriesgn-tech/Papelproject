/**
 * Listes de référence éditables dans l'interface (principe « à la Odoo » : rien n'est figé dans le code).
 * Une liste = une table + ses champs. La page générique /<espace>/listes/<code> permet de rechercher,
 * ajouter, modifier, archiver et exporter. Pour ajouter une nouvelle liste : la déclarer ici.
 * Les droits restent contrôlés par la RLS de chaque table.
 */

export type TypeChamp = "texte" | "texte_long" | "entier" | "decimal" | "date" | "heure" | "booleen" | "choix" | "reference";

export interface ChampReferentiel {
  nom: string;
  libelle: string;
  type: TypeChamp;
  requis?: boolean;
  max?: number;
  aide?: string;
  /** Pour « choix » : valeurs fixes. */
  options?: { valeur: string; libelle: string }[];
  /** Pour « reference » : table liée, colonne affichée et clé (« id » par défaut). */
  reference?: { table: string; libelle: string; cle?: string };
  /** Champ non modifiable après création (ex. un code). */
  figeApresCreation?: boolean;
  /** Valeur automatique à la création si vide. */
  regex?: { motif: string; message: string };
}

export interface Referentiel {
  code: string;
  table: string;
  titre: string;
  description: string;
  /** Espaces (codes) dans lesquels la liste apparaît. */
  espaces: string[];
  /** Colonne clé primaire. */
  cle: string;
  champs: ChampReferentiel[];
  /** Colonne de tri. */
  tri: string;
  /** La table a une colonne « actif » : archivage au lieu de suppression. */
  archivable: boolean;
}

export const FAMILLES_ARTICLES = [
  { valeur: "matiere_premiere", libelle: "Matière première" },
  { valeur: "emballage", libelle: "Emballage" },
  { valeur: "produit_fini", libelle: "Produit fini" },
  { valeur: "piece_detachee", libelle: "Pièce détachée" },
  { valeur: "autre", libelle: "Autre" },
];

export const REFERENTIELS: Referentiel[] = [
  {
    code: "niveaux-prix",
    table: "niveaux_prix",
    titre: "Niveaux de prix",
    description: "Niveaux de la grille de prix (prix Papel, prix conseillés de la chaîne de distribution).",
    espaces: ["admin"],
    cle: "code",
    tri: "ordre",
    archivable: true,
    champs: [
      {
        nom: "code",
        libelle: "Code",
        type: "texte",
        requis: true,
        figeApresCreation: true,
        regex: { motif: "^[a-z0-9_]{2,30}$", message: "Code : minuscules sans accent, chiffres ou _ (ex. b2b)." },
      },
      { nom: "libelle", libelle: "Libellé", type: "texte", requis: true, max: 60 },
      { nom: "description", libelle: "Description", type: "texte_long", max: 200 },
      { nom: "ordre", libelle: "Ordre d'affichage", type: "entier" },
    ],
  },
  {
    code: "villes",
    table: "villes",
    titre: "Villes",
    description: "Villes couvertes par les commerciaux.",
    espaces: ["admin", "commercial"],
    cle: "id",
    tri: "nom",
    archivable: false,
    champs: [
      { nom: "nom", libelle: "Nom", type: "texte", requis: true, max: 60 },
      { nom: "prefecture", libelle: "Préfecture", type: "texte", max: 60 },
      { nom: "region", libelle: "Région", type: "texte", max: 60 },
    ],
  },
  {
    code: "communes",
    table: "communes",
    titre: "Communes",
    description: "Communes rattachées à une ville.",
    espaces: ["admin", "commercial"],
    cle: "id",
    tri: "nom",
    archivable: false,
    champs: [
      { nom: "ville_id", libelle: "Ville", type: "reference", requis: true, reference: { table: "villes", libelle: "nom" } },
      { nom: "nom", libelle: "Nom", type: "texte", requis: true, max: 60 },
    ],
  },
  {
    code: "quartiers",
    table: "quartiers",
    titre: "Quartiers",
    description: "Quartiers rattachés à une commune.",
    espaces: ["admin", "commercial"],
    cle: "id",
    tri: "nom",
    archivable: false,
    champs: [
      { nom: "commune_id", libelle: "Commune", type: "reference", requis: true, reference: { table: "communes", libelle: "nom" } },
      { nom: "nom", libelle: "Nom", type: "texte", requis: true, max: 60 },
    ],
  },
  {
    code: "categories-articles",
    table: "categories_articles",
    titre: "Catégories d'articles",
    description: "Sous-familles des articles : bobines, films, sacs, boîtes, cartons, encres…",
    espaces: ["admin", "magasin"],
    cle: "id",
    tri: "libelle",
    archivable: true,
    champs: [
      { nom: "famille", libelle: "Famille", type: "choix", requis: true, options: FAMILLES_ARTICLES },
      { nom: "libelle", libelle: "Libellé", type: "texte", requis: true, max: 60 },
    ],
  },
  {
    code: "fournisseurs",
    table: "fournisseurs",
    titre: "Fournisseurs",
    description: "Fournisseurs de matières premières, emballages et pièces.",
    espaces: ["admin", "magasin", "achats"],
    cle: "id",
    tri: "nom",
    archivable: true,
    champs: [
      { nom: "nom", libelle: "Nom", type: "texte", requis: true, max: 100 },
      { nom: "pays", libelle: "Pays", type: "texte", max: 60 },
      { nom: "contact", libelle: "Contact", type: "texte", max: 100 },
      { nom: "telephone", libelle: "Téléphone", type: "texte", max: 30 },
      { nom: "email", libelle: "E-mail", type: "texte", max: 100 },
      { nom: "notes", libelle: "Notes", type: "texte_long", max: 500 },
    ],
  },
  // --- Production -------------------------------------------------------------
  {
    code: "postes",
    table: "postes",
    titre: "Postes",
    description: "Postes de travail (matin, après-midi, nuit…). Un poste peut passer minuit.",
    espaces: ["production", "admin"],
    cle: "id",
    tri: "ordre",
    archivable: true,
    champs: [
      { nom: "libelle", libelle: "Libellé", type: "texte", requis: true, max: 40 },
      { nom: "heure_debut", libelle: "Début", type: "heure", requis: true },
      { nom: "heure_fin", libelle: "Fin", type: "heure", requis: true },
      { nom: "ordre", libelle: "Ordre", type: "entier" },
    ],
  },
  {
    code: "equipes",
    table: "equipes",
    titre: "Équipes",
    description: "Équipes de production.",
    espaces: ["production", "admin"],
    cle: "id",
    tri: "libelle",
    archivable: true,
    champs: [{ nom: "libelle", libelle: "Libellé", type: "texte", requis: true, max: 40 }],
  },
  {
    code: "operateurs",
    table: "operateurs",
    titre: "Opérateurs",
    description: "Personnel de production (pas besoin de compte informatique).",
    espaces: ["production", "admin"],
    cle: "id",
    tri: "nom",
    archivable: true,
    champs: [
      { nom: "nom", libelle: "Nom", type: "texte", requis: true, max: 60 },
      { nom: "prenom", libelle: "Prénom", type: "texte", max: 60 },
      { nom: "matricule", libelle: "Matricule", type: "texte", max: 20 },
      { nom: "equipe_id", libelle: "Équipe", type: "reference", reference: { table: "equipes", libelle: "libelle" } },
    ],
  },
  {
    code: "lignes-production",
    table: "lignes_production",
    titre: "Lignes de production",
    description: "Lignes de fabrication de l'usine.",
    espaces: ["production", "admin"],
    cle: "id",
    tri: "libelle",
    archivable: true,
    champs: [{ nom: "libelle", libelle: "Libellé", type: "texte", requis: true, max: 60 }],
  },
  {
    code: "cadences",
    table: "cadences_nominales",
    titre: "Cadences nominales",
    description: "Paquets par minute d'une ligne pour un produit, à la vitesse prévue par le constructeur. Indispensable au calcul du TRS.",
    espaces: ["production", "admin"],
    cle: "id",
    tri: "created_at",
    archivable: false,
    champs: [
      { nom: "ligne_id", libelle: "Ligne", type: "reference", requis: true, reference: { table: "lignes_production", libelle: "libelle" } },
      { nom: "produit_id", libelle: "Produit", type: "reference", requis: true, reference: { table: "produits", libelle: "libelle" } },
      { nom: "paquets_minute", libelle: "Paquets / minute", type: "decimal", requis: true },
    ],
  },
  {
    code: "causes-arret",
    table: "causes_arret",
    titre: "Causes d'arrêt",
    description: "Un arrêt planifié (pause, nettoyage prévu) ne pénalise pas la disponibilité ; un arrêt non planifié (panne, coupure…) oui.",
    espaces: ["production", "admin"],
    cle: "id",
    tri: "libelle",
    archivable: true,
    champs: [
      { nom: "libelle", libelle: "Libellé", type: "texte", requis: true, max: 60 },
      {
        nom: "type_arret",
        libelle: "Type",
        type: "choix",
        requis: true,
        options: [
          { valeur: "non_planifie", libelle: "Non planifié" },
          { valeur: "planifie", libelle: "Planifié" },
        ],
      },
    ],
  },
  {
    code: "campagnes",
    table: "campagnes",
    titre: "Campagnes de production",
    description: "Périodes de production regroupant des ordres de fabrication.",
    espaces: ["production", "admin"],
    cle: "id",
    tri: "date_debut",
    archivable: true,
    champs: [
      { nom: "libelle", libelle: "Libellé", type: "texte", requis: true, max: 80 },
      { nom: "date_debut", libelle: "Début", type: "date", requis: true },
      { nom: "date_fin", libelle: "Fin", type: "date", requis: true },
      { nom: "notes", libelle: "Objectif / notes", type: "texte_long", max: 300 },
    ],
  },
  // --- Ventes ----------------------------------------------------------------
  {
    code: "types-clients",
    table: "types_clients",
    titre: "Types de clients",
    description: "Niveau de prix appliqué et droit à la dotation (X paquets offerts pour 100 achetés, sur l'encaissé).",
    espaces: ["ventes", "admin"],
    cle: "id",
    tri: "ordre",
    archivable: true,
    champs: [
      { nom: "libelle", libelle: "Libellé", type: "texte", requis: true, max: 40 },
      { nom: "niveau_prix", libelle: "Niveau de prix", type: "reference", requis: true, reference: { table: "niveaux_prix", libelle: "libelle", cle: "code" } },
      { nom: "dotation", libelle: "Reçoit la dotation", type: "booleen" },
      { nom: "ordre", libelle: "Ordre", type: "entier" },
    ],
  },
  {
    code: "modes-paiement",
    table: "modes_paiement",
    titre: "Modes de paiement",
    description: "Espèces, Orange Money, MTN Mobile Money, virement, chèque…",
    espaces: ["ventes", "admin"],
    cle: "id",
    tri: "ordre",
    archivable: true,
    champs: [
      { nom: "libelle", libelle: "Libellé", type: "texte", requis: true, max: 40 },
      { nom: "ordre", libelle: "Ordre", type: "entier" },
    ],
  },
  // --- Commercial ------------------------------------------------------------
  {
    code: "marques-concurrentes",
    table: "marques_concurrentes",
    titre: "Marques concurrentes",
    description: "Marques relevées par les commerciaux lors des visites.",
    espaces: ["commercial", "admin"],
    cle: "id",
    tri: "libelle",
    archivable: true,
    champs: [{ nom: "libelle", libelle: "Marque", type: "texte", requis: true, max: 60 }],
  },
];

export function referentiel(code: string): Referentiel | undefined {
  return REFERENTIELS.find((r) => r.code === code);
}

export function referentielsDeLEspace(espace: string): Referentiel[] {
  return REFERENTIELS.filter((r) => r.espaces.includes(espace));
}
