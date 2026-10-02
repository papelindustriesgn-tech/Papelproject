/**
 * Listes de référence éditables dans l'interface (principe « à la Odoo » : rien n'est figé dans le code).
 * Une liste = une table + ses champs. La page générique /<espace>/listes/<code> permet de rechercher,
 * ajouter, modifier, archiver et exporter. Pour ajouter une nouvelle liste : la déclarer ici.
 * Les droits restent contrôlés par la RLS de chaque table.
 */

export type TypeChamp = "texte" | "texte_long" | "entier" | "choix" | "reference";

export interface ChampReferentiel {
  nom: string;
  libelle: string;
  type: TypeChamp;
  requis?: boolean;
  max?: number;
  aide?: string;
  /** Pour « choix » : valeurs fixes. */
  options?: { valeur: string; libelle: string }[];
  /** Pour « reference » : table liée et colonne affichée. */
  reference?: { table: string; libelle: string };
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
];

export function referentiel(code: string): Referentiel | undefined {
  return REFERENTIELS.find((r) => r.code === code);
}

export function referentielsDeLEspace(espace: string): Referentiel[] {
  return REFERENTIELS.filter((r) => r.espaces.includes(espace));
}
