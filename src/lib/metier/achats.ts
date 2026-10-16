/**
 * Coût de revient complet d'un approvisionnement (conteneur) :
 * coût réel = prix fournisseur + fret + transit + douane + transport jusqu'à l'usine (+ autres frais),
 * chaque montant converti en GNF au taux de SA date, puis divisé par le poids net reçu.
 */
import { ErreurMontant, montantEnGnf, type MontantOperation } from "./devises";
import { ErreurUnite, kgVersTonnes, type Kg } from "./unites";

export interface CoutRevient {
  marchandiseGnf: number;
  fraisGnf: number;
  totalGnf: number;
  coutKgGnf: number;
  coutTonneGnf: number;
}

export function calculerCoutRevient(marchandise: MontantOperation[], frais: MontantOperation[], poidsNet: Kg): CoutRevient {
  if (!(poidsNet > 0)) throw new ErreurUnite("Poids net reçu invalide : il doit être supérieur à zéro.");
  const marchandiseGnf = marchandise.reduce((s, m) => s + montantEnGnf(m), 0);
  const fraisGnf = frais.reduce((s, f) => s + montantEnGnf(f), 0);
  if (marchandiseGnf < 0 || fraisGnf < 0) throw new ErreurMontant("Montants négatifs interdits.");
  const totalGnf = marchandiseGnf + fraisGnf;
  return {
    marchandiseGnf,
    fraisGnf,
    totalGnf,
    // Coût au kg arrondi au centime de GNF (stocké en numeric(14,2) sur les lots).
    coutKgGnf: Math.round((totalGnf / poidsNet) * 100) / 100,
    coutTonneGnf: Math.round(totalGnf / kgVersTonnes(poidsNet)),
  };
}

/** Écart entre coût réel et coût prévu (0,05 = 5 % plus cher que prévu). */
export function ecartPrix(reelGnf: number, prevuGnf: number): number | null {
  return prevuGnf > 0 ? (reelGnf - prevuGnf) / prevuGnf : null;
}

/** Délai d'un fournisseur en jours entre deux dates AAAA-MM-JJ. */
export function delaiJours(debut: string, fin: string): number {
  return Math.round((Date.parse(`${fin}T00:00:00Z`) - Date.parse(`${debut}T00:00:00Z`)) / 86_400_000);
}

/** Montant d'une ligne de commande en unités minimales de la devise (GNF, ou centimes d'USD). */
export function montantLigneDevise(quantite: number, prixUnitaire: number, devise: "GNF" | "USD"): number {
  if (!(quantite >= 0) || !(prixUnitaire >= 0)) throw new ErreurMontant("Quantité ou prix invalide.");
  return Math.round(quantite * prixUnitaire * (devise === "USD" ? 100 : 1));
}
