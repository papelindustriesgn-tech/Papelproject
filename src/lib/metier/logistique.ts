/**
 * Indicateurs de la logistique (fonctions pures, testées).
 * Les quantités restent en paquets ; les colis sont dérivés par conditionnement (unites.ts).
 */

export interface BilanTournee {
  nbLivraisons: number;
  nbLivrees: number;
  nbPartielles: number;
  nbRefusees: number;
  paquetsCharges: number;
  paquetsLivres: number;
  colisLivres: number;
  depensesGnf: number;
  kmParcourus: number | null;
}

/** Taux de livraison réussie : bons livrés en totalité ÷ bons remis (livrés, partiels ou refusés). */
export function tauxLivraisonReussie(b: Pick<BilanTournee, "nbLivrees" | "nbPartielles" | "nbRefusees">): number | null {
  const remis = b.nbLivrees + b.nbPartielles + b.nbRefusees;
  return remis > 0 ? b.nbLivrees / remis : null;
}

/** Taux de retour : paquets rapportés ÷ paquets chargés. */
export function tauxRetour(b: Pick<BilanTournee, "paquetsCharges" | "paquetsLivres">): number | null {
  return b.paquetsCharges > 0 ? (b.paquetsCharges - b.paquetsLivres) / b.paquetsCharges : null;
}

/** Coût logistique par colis livré (GNF, arrondi à l'unité). */
export function coutParColis(depensesGnf: number, colisLivres: number): number | null {
  return colisLivres > 0 ? Math.round(depensesGnf / colisLivres) : null;
}

/** Coût au kilomètre (GNF). */
export function coutAuKm(depensesGnf: number, km: number | null): number | null {
  return km && km > 0 ? Math.round(depensesGnf / km) : null;
}

/** Agrège des tournées : on somme les quantités, puis on recalcule les taux (jamais de moyenne de pourcentages). */
export function agregerTournees(liste: BilanTournee[]): BilanTournee {
  const s = (f: (b: BilanTournee) => number) => liste.reduce((t, b) => t + f(b), 0);
  const avecKm = liste.filter((b) => b.kmParcourus !== null);
  return {
    nbLivraisons: s((b) => b.nbLivraisons),
    nbLivrees: s((b) => b.nbLivrees),
    nbPartielles: s((b) => b.nbPartielles),
    nbRefusees: s((b) => b.nbRefusees),
    paquetsCharges: s((b) => b.paquetsCharges),
    paquetsLivres: s((b) => b.paquetsLivres),
    colisLivres: s((b) => b.colisLivres),
    depensesGnf: s((b) => b.depensesGnf),
    kmParcourus: avecKm.length ? avecKm.reduce((t, b) => t + (b.kmParcourus ?? 0), 0) : null,
  };
}
