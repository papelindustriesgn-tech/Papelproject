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
  /** Une phrase simple pour choisir le bon cas. */
  explication: string;
  /** +1 entrée, −1 sortie, 0 au choix (correction). */
  sens: 1 | -1 | 0;
  /** Proposé dans le formulaire de saisie manuelle du magasin. */
  saisieManuelle: boolean;
  /** Cas courant (grand bouton) ; sinon rangé dans « Autres cas » (d'habitude fait automatiquement ailleurs). */
  courant?: boolean;
}

export const TYPES_MOUVEMENT: Record<string, DefinitionTypeMouvement> = {
  reception: { libelle: "Arrivée de marchandise", explication: "Achat reçu d'un fournisseur.", sens: 1, saisieManuelle: true, courant: true },
  consommation: { libelle: "Sortie pour l'usine", explication: "Pris par la production : emballages, encre, cartons…", sens: -1, saisieManuelle: true, courant: true },
  sortie: { libelle: "Autre sortie", explication: "Don, échantillon, prêt… Dites pourquoi.", sens: -1, saisieManuelle: true, courant: true },
  rebut: { libelle: "Jeté (abîmé)", explication: "Marchandise abîmée et jetée. Dites pourquoi.", sens: -1, saisieManuelle: true, courant: true },
  ajustement: { libelle: "Correction", explication: "Corriger une erreur de stock, en plus ou en moins. Dites pourquoi.", sens: 0, saisieManuelle: true, courant: true },
  retour: { libelle: "Retour d'un client", explication: "Marchandise rapportée par un client.", sens: 1, saisieManuelle: true },
  production: { libelle: "Entrée de production", explication: "D'habitude automatique : la validation d'une saisie de production le fait.", sens: 1, saisieManuelle: true },
  vente: { libelle: "Sortie pour une vente", explication: "D'habitude automatique : le bon de livraison le fait.", sens: -1, saisieManuelle: true },
  dotation: { libelle: "Paquets offerts", explication: "D'habitude automatique depuis la facture du client.", sens: -1, saisieManuelle: true },
  inventaire: { libelle: "Écart d'inventaire", explication: "Fait par la validation d'un inventaire.", sens: 0, saisieManuelle: false },
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

/**
 * Montant court pour les grands chiffres d'un tableau de bord : « 16,8 M GNF », « 1,25 M GNF », « 2,1 Md GNF » ;
 * en dessous du million, le montant exact (« 3 942 GNF »). Le montant exact s'affiche au survol (`gnf`).
 */
export function gnfCourt(n: number | null | undefined): string {
  const v = Math.round(Number(n ?? 0));
  const a = Math.abs(v);
  if (a >= 1e9) return `${nombre(v / 1e9, a >= 1e10 ? 1 : 2)} Md GNF`;
  if (a >= 1e6) return `${nombre(v / 1e6, a >= 1e7 ? 1 : 2)} M GNF`;
  return gnf(v);
}
