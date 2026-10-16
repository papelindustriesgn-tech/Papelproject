/**
 * Objectifs du business plan rapportés à une période d'analyse (fonctions pures, testées).
 * Un objectif est mensuel : pour une période qui ne couvre qu'une partie d'un mois (jour, semaine, 30 jours…),
 * on prend la part du mois au prorata des jours (objectif du mois ÷ jours du mois × jours retenus).
 */
export interface ObjectifMensuel {
  /** Premier jour du mois (AAAA-MM-01). */
  mois: string;
  productionKg: number;
  paquets: number;
  caHtGnf: number;
  coutsVariablesGnf: number;
  chargesFixesGnf: number;
}

export interface ObjectifPeriode {
  productionKg: number;
  paquets: number;
  caHtGnf: number;
  coutsVariablesGnf: number;
  chargesFixesGnf: number;
  /** Résultat visé = CA HT − coûts variables − charges fixes. */
  resultatGnf: number;
  /** Jours de la période couverts par un objectif ÷ jours de la période (1 = toute la période). */
  couverture: number;
}

const jour = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / 86_400_000;
const joursDuMois = (mois: string) => {
  const [a, m] = mois.split("-").map(Number);
  return new Date(Date.UTC(a, m, 0)).getUTCDate();
};

/** Objectif de la période [du, au] (bornes incluses) ; null si aucun mois de la période n'a d'objectif. */
export function objectifPeriode(objectifs: ObjectifMensuel[], du: string, au: string): ObjectifPeriode | null {
  const total = jour(au) - jour(du) + 1;
  const r = { productionKg: 0, paquets: 0, caHtGnf: 0, coutsVariablesGnf: 0, chargesFixesGnf: 0 };
  let couverts = 0;
  for (const o of objectifs) {
    const n = joursDuMois(o.mois);
    const debut = Math.max(jour(o.mois), jour(du));
    const fin = Math.min(jour(o.mois) + n - 1, jour(au));
    if (fin < debut) continue;
    const part = (fin - debut + 1) / n;
    couverts += fin - debut + 1;
    r.productionKg += o.productionKg * part;
    r.paquets += o.paquets * part;
    r.caHtGnf += o.caHtGnf * part;
    r.coutsVariablesGnf += o.coutsVariablesGnf * part;
    r.chargesFixesGnf += o.chargesFixesGnf * part;
  }
  if (!couverts) return null;
  const arrondi = { productionKg: Math.round(r.productionKg), paquets: Math.round(r.paquets), caHtGnf: Math.round(r.caHtGnf), coutsVariablesGnf: Math.round(r.coutsVariablesGnf), chargesFixesGnf: Math.round(r.chargesFixesGnf) };
  return { ...arrondi, resultatGnf: arrondi.caHtGnf - arrondi.coutsVariablesGnf - arrondi.chargesFixesGnf, couverture: couverts / total };
}

/** Avancement réel ÷ objectif (1 = objectif atteint) ; null sans objectif. */
export function avancement(reel: number, objectif: number | null | undefined): number | null {
  return objectif ? reel / objectif : null;
}
