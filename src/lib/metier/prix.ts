/**
 * Prix des produits finis.
 * Le prix de référence est fixé AU PAQUET (ex. 3 400 GNF le paquet Petit 100) ;
 * le prix d'un colis dépend de son conditionnement (50, 80 ou 100 paquets pour le Petit, 30 pour le Grand).
 * Les prix sont historisés : un prix a une date de début et une date de fin (incluse), jamais écrasé.
 */
import { ErreurMontant, verifierMontantEntier } from "./devises";
import { colisVersPaquets, type Colis, type Conditionnement, type Paquets } from "./unites";

export interface PrixHistorise {
  prixPaquetGnf: number;
  /** AAAA-MM-JJ, inclus. */
  dateDebut: string;
  /** AAAA-MM-JJ, inclus ; null = toujours en vigueur. */
  dateFin: string | null;
}

/** Prix en vigueur à une date donnée, ou null s'il n'y en a pas. */
export function prixEnVigueur(historique: PrixHistorise[], date: string): PrixHistorise | null {
  const candidats = historique.filter((p) => p.dateDebut <= date && (p.dateFin === null || p.dateFin >= date));
  if (candidats.length > 1) {
    throw new ErreurMontant(`Plusieurs prix se chevauchent à la date du ${date} : corriger l'historique des prix.`);
  }
  return candidats[0] ?? null;
}

/** Prix d'un colis = prix du paquet × nombre de paquets du conditionnement. */
export function prixColisGnf(prixPaquetGnf: number, c: Conditionnement): number {
  verifierMontantEntier(prixPaquetGnf, "Prix du paquet");
  return prixPaquetGnf * colisVersPaquets(1 as Colis, c);
}

/** Montant d'une ligne de vente exprimée en colis. */
export function montantLigneColis(nbColis: Colis, c: Conditionnement, prixPaquetGnf: number): number {
  verifierMontantEntier(prixPaquetGnf, "Prix du paquet");
  return colisVersPaquets(nbColis, c) * prixPaquetGnf;
}

/** Montant d'une ligne de vente exprimée en paquets. */
export function montantLignePaquets(nbPaquets: Paquets, prixPaquetGnf: number): number {
  verifierMontantEntier(prixPaquetGnf, "Prix du paquet");
  return nbPaquets * prixPaquetGnf;
}
