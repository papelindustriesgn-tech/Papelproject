/** Libellés et affichage communs aux écrans de stock. */
import { formaterQuantite, formaterStockProduitFini, type CodeUnite, type Paquets } from "@/lib/metier/unites";
import { FAMILLES_ARTICLES } from "@/lib/referentiels/definitions";

export const LIBELLES_FAMILLES: Record<string, string> = Object.fromEntries(FAMILLES_ARTICLES.map((f) => [f.valeur, f.libelle]));

export const UNITES_STOCK: { valeur: CodeUnite; libelle: string }[] = [
  { valeur: "kg", libelle: "Kilogramme (kg)" },
  { valeur: "unite", libelle: "Unité" },
  { valeur: "rouleau", libelle: "Rouleau" },
  { valeur: "litre", libelle: "Litre" },
  { valeur: "metre", libelle: "Mètre" },
];

export interface DefinitionTypeMouvement {
  libelle: string;
  /** +1 entrée, −1 sortie, 0 au choix (correction). */
  sens: 1 | -1 | 0;
  /** Proposé dans le formulaire de saisie manuelle du magasin. */
  saisieManuelle: boolean;
}

export const TYPES_MOUVEMENT: Record<string, DefinitionTypeMouvement> = {
  reception: { libelle: "Réception", sens: 1, saisieManuelle: true },
  production: { libelle: "Entrée de production", sens: 1, saisieManuelle: true },
  retour: { libelle: "Retour", sens: 1, saisieManuelle: true },
  consommation: { libelle: "Consommation", sens: -1, saisieManuelle: true },
  sortie: { libelle: "Sortie diverse", sens: -1, saisieManuelle: true },
  vente: { libelle: "Vente / livraison", sens: -1, saisieManuelle: true },
  dotation: { libelle: "Dotation offerte", sens: -1, saisieManuelle: true },
  rebut: { libelle: "Mise au rebut", sens: -1, saisieManuelle: true },
  ajustement: { libelle: "Ajustement", sens: 0, saisieManuelle: true },
  inventaire: { libelle: "Écart d'inventaire", sens: 0, saisieManuelle: false },
};

/** Quantité affichée selon l'article : produits finis en paquets + colis, poids en kg, etc. */
export function afficherStock(quantite: number, unite: string, paquetsParColis?: number | null): string {
  if (unite === "paquet" && paquetsParColis) return formaterStockProduitFini(quantite as Paquets, { paquetsParColis });
  return formaterQuantite(quantite, unite as CodeUnite);
}

const nf0 = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
export const gnf = (n: number | null | undefined) => `${nf0.format(Math.round(Number(n ?? 0))).replace(/[  ]/g, " ")} GNF`;
export const nombre = (n: number | null | undefined, decimales = 0) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: decimales }).format(Number(n ?? 0)).replace(/[  ]/g, " ");
