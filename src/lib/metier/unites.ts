/**
 * Module UNIQUE de conversion des unités de Papel ERP.
 *
 * Règle absolue : on ne mélange JAMAIS tonnes, kg, bobines, paquets, colis, cartons et palettes.
 * Chaque quantité porte un type « marqué » : le compilateur refuse d'additionner des colis et des paquets.
 * Toute conversion passe par une fonction de ce fichier, avec un facteur explicite
 * (le nombre de paquets par colis dépend du conditionnement choisi : 50, 80 ou 100 pour le Petit, 30 pour le Grand).
 */

declare const marque: unique symbol;
/** Nombre « marqué » d'une unité : empêche les mélanges à la compilation. */
type Quantite<U extends string> = number & { readonly [marque]: U };

export type Kg = Quantite<"kg">;
export type Tonnes = Quantite<"tonne">;
export type Paquets = Quantite<"paquet">;
export type Colis = Quantite<"colis">;
export type Cartons = Quantite<"carton">;
export type Palettes = Quantite<"palette">;
export type Bobines = Quantite<"bobine">;

export type CodeUnite = "kg" | "tonne" | "paquet" | "colis" | "carton" | "palette" | "bobine" | "unite" | "rouleau" | "litre" | "metre";

export const LIBELLES_UNITES: Record<CodeUnite, { singulier: string; pluriel: string; symbole: string }> = {
  kg: { singulier: "kilogramme", pluriel: "kilogrammes", symbole: "kg" },
  tonne: { singulier: "tonne", pluriel: "tonnes", symbole: "t" },
  paquet: { singulier: "paquet", pluriel: "paquets", symbole: "paq." },
  colis: { singulier: "colis", pluriel: "colis", symbole: "colis" },
  carton: { singulier: "carton", pluriel: "cartons", symbole: "ctn" },
  palette: { singulier: "palette", pluriel: "palettes", symbole: "pal." },
  bobine: { singulier: "bobine jumbo", pluriel: "bobines jumbo", symbole: "bob." },
  unite: { singulier: "unité", pluriel: "unités", symbole: "u." },
  rouleau: { singulier: "rouleau", pluriel: "rouleaux", symbole: "rlx" },
  litre: { singulier: "litre", pluriel: "litres", symbole: "L" },
  metre: { singulier: "mètre", pluriel: "mètres", symbole: "m" },
};

/** Erreur levée pour toute quantité ou tout facteur invalide. Message en français. */
export class ErreurUnite extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErreurUnite";
  }
}

function verifierFini(valeur: number, libelle: string): void {
  if (!Number.isFinite(valeur)) throw new ErreurUnite(`${libelle} : valeur numérique invalide.`);
}

function verifierPositifOuNul(valeur: number, libelle: string): void {
  verifierFini(valeur, libelle);
  if (valeur < 0) throw new ErreurUnite(`${libelle} : la valeur ne peut pas être négative.`);
}

function verifierEntier(valeur: number, libelle: string): void {
  verifierFini(valeur, libelle);
  if (!Number.isInteger(valeur)) throw new ErreurUnite(`${libelle} : un nombre entier est attendu.`);
}

function verifierFacteur(facteur: number, libelle: string): void {
  verifierEntier(facteur, libelle);
  if (facteur <= 0) throw new ErreurUnite(`${libelle} : le facteur doit être supérieur à zéro.`);
}

// ---------------------------------------------------------------------------
// Constructeurs (valident la valeur et posent la « marque »)
// ---------------------------------------------------------------------------

export const kg = (v: number): Kg => (verifierFini(v, "Poids (kg)"), v as Kg);
export const tonnes = (v: number): Tonnes => (verifierFini(v, "Poids (t)"), v as Tonnes);
/** Les paquets, colis, cartons, palettes et bobines sont toujours des nombres entiers. */
export const paquets = (v: number): Paquets => (verifierEntier(v, "Paquets"), v as Paquets);
export const colis = (v: number): Colis => (verifierEntier(v, "Colis"), v as Colis);
export const cartons = (v: number): Cartons => (verifierEntier(v, "Cartons"), v as Cartons);
export const palettes = (v: number): Palettes => (verifierEntier(v, "Palettes"), v as Palettes);
export const bobines = (v: number): Bobines => (verifierEntier(v, "Bobines"), v as Bobines);

/** Additionne des quantités de MÊME unité uniquement (garanti par le typage). */
export function somme<Q extends number>(...valeurs: Q[]): Q {
  return valeurs.reduce<number>((total, v) => total + v, 0) as Q;
}

// ---------------------------------------------------------------------------
// Poids
// ---------------------------------------------------------------------------

export const KG_PAR_TONNE = 1000;

export function kgVersTonnes(poids: Kg): Tonnes {
  return (poids / KG_PAR_TONNE) as Tonnes;
}

export function tonnesVersKg(poids: Tonnes): Kg {
  return (poids * KG_PAR_TONNE) as Kg;
}

/**
 * Une bobine jumbo n'a pas de poids standard : chaque bobine a son propre poids net (n° de lot).
 * On ne convertit donc jamais « bobines → kg » par un facteur : on additionne les poids réels.
 */
export function poidsTotalBobines(poidsNetsKg: Kg[]): Kg {
  poidsNetsKg.forEach((p) => verifierPositifOuNul(p, "Poids net de bobine"));
  return somme(...poidsNetsKg);
}

// ---------------------------------------------------------------------------
// Produits finis : paquets ↔ colis ↔ palettes
// ---------------------------------------------------------------------------

/** Conditionnement d'un produit fini (ex. Petit 100 en colis de 50, 80 ou 100 paquets). */
export interface Conditionnement {
  paquetsParColis: number;
  /** Optionnel : nombre de colis par palette. */
  colisParPalette?: number;
}

export function colisVersPaquets(nb: Colis, c: Conditionnement): Paquets {
  verifierFacteur(c.paquetsParColis, "Paquets par colis");
  return (nb * c.paquetsParColis) as Paquets;
}

/**
 * Répartit des paquets en colis COMPLETS + paquets restants (jamais de colis fractionnaire).
 * Ex. 1 234 paquets en colis de 50 → 24 colis + 34 paquets.
 */
export function paquetsVersColis(nb: Paquets, c: Conditionnement): { colis: Colis; restePaquets: Paquets } {
  verifierFacteur(c.paquetsParColis, "Paquets par colis");
  verifierPositifOuNul(nb, "Paquets");
  const entiers = Math.floor(nb / c.paquetsParColis);
  return { colis: entiers as Colis, restePaquets: (nb - entiers * c.paquetsParColis) as Paquets };
}

/** Nombre de colis équivalent (décimal), uniquement pour l'AFFICHAGE d'indicateurs (ex. « 203,5 colis/t »). */
export function equivalentColis(nb: Paquets, c: Conditionnement): number {
  verifierFacteur(c.paquetsParColis, "Paquets par colis");
  return nb / c.paquetsParColis;
}

export function palettesVersColis(nb: Palettes, c: Conditionnement): Colis {
  if (c.colisParPalette === undefined) throw new ErreurUnite("Colis par palette non renseigné pour ce conditionnement.");
  verifierFacteur(c.colisParPalette, "Colis par palette");
  return (nb * c.colisParPalette) as Colis;
}

export function colisVersPalettes(nb: Colis, c: Conditionnement): { palettes: Palettes; resteColis: Colis } {
  if (c.colisParPalette === undefined) throw new ErreurUnite("Colis par palette non renseigné pour ce conditionnement.");
  verifierFacteur(c.colisParPalette, "Colis par palette");
  verifierPositifOuNul(nb, "Colis");
  const entieres = Math.floor(nb / c.colisParPalette);
  return { palettes: entieres as Palettes, resteColis: (nb - entieres * c.colisParPalette) as Colis };
}

// ---------------------------------------------------------------------------
// Affichage
// ---------------------------------------------------------------------------

const formatEntier = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const formatDecimal = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

/** Espaces fines insécables → espaces simples (affichage homogène). */
const espaces = (t: string) => t.replace(/[\u202f\u00a0]/g, " ");

/** Unités pouvant avoir des décimales (poids, volumes, longueurs). */
const UNITES_DECIMALES: CodeUnite[] = ["kg", "tonne", "litre", "metre"];

/** Formate une quantité avec son unité, ex. « 1 250 paquets », « 3,25 t », « 12,5 L ». */
export function formaterQuantite(valeur: number, unite: CodeUnite): string {
  const l = LIBELLES_UNITES[unite];
  if (UNITES_DECIMALES.includes(unite)) return espaces(`${formatDecimal.format(valeur)} ${l.symbole}`);
  return espaces(`${formatEntier.format(valeur)} ${Math.abs(valeur) > 1 ? l.pluriel : l.singulier}`);
}

/**
 * Stock d'un produit fini : paquets ET colis, ex. « 29 650 paquets (593 colis) » ou
 * « 1 234 paquets (24 colis + 34 paquets) ».
 */
export function formaterStockProduitFini(nb: Paquets, c: Conditionnement): string {
  const { colis: nbColis, restePaquets } = paquetsVersColis(nb, c);
  const detail = restePaquets > 0 ? `${formaterQuantite(nbColis, "colis")} + ${formaterQuantite(restePaquets, "paquet")}` : formaterQuantite(nbColis, "colis");
  return `${formaterQuantite(nb, "paquet")} (${detail})`;
}

/** Poids en kg affiché en tonnes au-delà d'une tonne : « 16,31 t », « 850 kg ». */
export function formaterPoids(poids: Kg): string {
  return Math.abs(poids) >= KG_PAR_TONNE ? formaterQuantite(kgVersTonnes(poids), "tonne") : formaterQuantite(poids, "kg");
}
