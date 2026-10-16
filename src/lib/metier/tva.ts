/**
 * TVA (Guinée : 18 %). Les prix de la grille sont HORS TAXES ; la TVA est AJOUTÉE sur la facture
 * quand le paramètre « tva_applicable » est actif.
 * La TVA est calculée sur le TOTAL hors taxes de la facture (un seul arrondi), pas ligne par ligne.
 */
import { arrondirGnf, ErreurMontant, verifierMontantEntier } from "./devises";

export const TAUX_TVA_DEFAUT = 0.18;

export interface Totaux {
  totalHtGnf: number;
  tvaGnf: number;
  totalTtcGnf: number;
}

export function calculerTotaux(totalHtGnf: number, tva: { applicable: boolean; taux: number }): Totaux {
  verifierMontantEntier(totalHtGnf, "Total hors taxes");
  if (!Number.isFinite(tva.taux) || tva.taux < 0 || tva.taux > 1) throw new ErreurMontant("Taux de TVA invalide (entre 0 et 100 %).");
  const tvaGnf = tva.applicable ? arrondirGnf(totalHtGnf * tva.taux) : 0;
  return { totalHtGnf, tvaGnf, totalTtcGnf: totalHtGnf + tvaGnf };
}
