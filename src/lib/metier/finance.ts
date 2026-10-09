/**
 * Calculs financiers de gestion (fonctions pures, testées). Montants en GNF entiers.
 * - Compte de résultat de gestion : CA HT − coût matière des ventes (CMP) = marge brute ;
 *   − charges variables = marge sur coûts variables ; − charges fixes = résultat d'exploitation.
 *   Les achats stockés ne sont pas des charges de la période : ils passent dans le coût des ventes à la sortie du stock.
 * - Seuil de rentabilité = charges fixes ÷ taux de marge sur coûts variables.
 * - BFR = stocks + créances clients − dettes fournisseurs.
 * - Trésorerie prévisionnelle : flux datés regroupés par semaine ; un flux déjà échu tombe dans la première semaine.
 */

export interface CompteResultat {
  caHtGnf: number;
  coutVentesGnf: number;
  margeBruteGnf: number;
  chargesVariablesGnf: number;
  margeSurCoutsVariablesGnf: number;
  tauxMcv: number | null;
  chargesFixesGnf: number;
  resultatGnf: number;
  tauxResultat: number | null;
}

export function compteDeResultat(caHtGnf: number, coutVentesGnf: number, chargesVariablesGnf: number, chargesFixesGnf: number): CompteResultat {
  const margeBruteGnf = caHtGnf - coutVentesGnf;
  const mcv = margeBruteGnf - chargesVariablesGnf;
  const resultat = mcv - chargesFixesGnf;
  return {
    caHtGnf,
    coutVentesGnf,
    margeBruteGnf,
    chargesVariablesGnf,
    margeSurCoutsVariablesGnf: mcv,
    tauxMcv: caHtGnf > 0 ? mcv / caHtGnf : null,
    chargesFixesGnf,
    resultatGnf: resultat,
    tauxResultat: caHtGnf > 0 ? resultat / caHtGnf : null,
  };
}

/** CA HT à réaliser pour couvrir les charges fixes ; null si la marge sur coûts variables est nulle ou négative. */
export function seuilRentabiliteGnf(chargesFixesGnf: number, tauxMcv: number | null): number | null {
  if (tauxMcv === null || tauxMcv <= 0) return null;
  return Math.round(chargesFixesGnf / tauxMcv);
}

/** Jour de la période où le seuil est atteint (au rythme moyen du CA) ; null s'il n'est pas atteint. */
export function pointMortJours(seuilGnf: number | null, caHtGnf: number, joursPeriode: number): number | null {
  if (seuilGnf === null || caHtGnf <= 0 || seuilGnf > caHtGnf) return null;
  return Math.ceil((seuilGnf / caHtGnf) * joursPeriode);
}

export function bfrGnf(stocksGnf: number, creancesClientsGnf: number, dettesFournisseursGnf: number): number {
  return stocksGnf + creancesClientsGnf - dettesFournisseursGnf;
}

export interface Flux {
  date: string; // AAAA-MM-JJ
  montantGnf: number; // + entrée, − sortie
  nature: string;
}

export interface SemainePrevision {
  debut: string;
  fin: string;
  entreesGnf: number;
  sortiesGnf: number;
  soldeFinGnf: number;
  parNature: Record<string, number>;
}

const ajouterJours = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export function tresoreriePrevisionnelle(soldeInitialGnf: number, flux: Flux[], debut: string, nbSemaines: number): SemainePrevision[] {
  const semaines: SemainePrevision[] = Array.from({ length: nbSemaines }, (_, i) => ({
    debut: ajouterJours(debut, i * 7),
    fin: ajouterJours(debut, i * 7 + 6),
    entreesGnf: 0,
    sortiesGnf: 0,
    soldeFinGnf: 0,
    parNature: {},
  }));
  const derniere = semaines.length ? semaines[semaines.length - 1].fin : debut;
  for (const f of flux) {
    if (f.date > derniere) continue;
    const s = f.date < debut ? semaines[0] : semaines.find((x) => f.date >= x.debut && f.date <= x.fin);
    if (!s) continue;
    if (f.montantGnf >= 0) s.entreesGnf += f.montantGnf;
    else s.sortiesGnf += -f.montantGnf;
    s.parNature[f.nature] = (s.parNature[f.nature] ?? 0) + f.montantGnf;
  }
  let solde = soldeInitialGnf;
  for (const s of semaines) {
    solde += s.entreesGnf - s.sortiesGnf;
    s.soldeFinGnf = solde;
  }
  return semaines;
}

/** Première semaine où la trésorerie prévue devient négative (alerte), sinon null. */
export function premiereTensionTresorerie(semaines: SemainePrevision[]): SemainePrevision | null {
  return semaines.find((s) => s.soldeFinGnf < 0) ?? null;
}
