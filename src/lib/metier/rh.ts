/**
 * Calculs RH (fonctions pures, testées) : jours ouvrables, congés acquis, bulletin de paie.
 * Tous les montants sont des entiers en GNF. Les taux et barèmes viennent des paramètres et listes
 * modifiables (catégorie « rh », table tranches_rts) : rien n'est figé ici.
 * Même règle des jours ouvrables qu'en base (public.jours_ouvrables) : lundi à samedi, jours fériés exclus.
 */

/** Jours ouvrables entre deux dates ISO incluses (le dimanche et les jours fériés ne comptent pas). */
export function joursOuvrables(du: string, au: string, feries: ReadonlySet<string> = new Set()): number {
  if (au < du) return 0;
  let n = 0;
  for (let t = Date.parse(`${du}T00:00:00Z`); t <= Date.parse(`${au}T00:00:00Z`); t += 86_400_000) {
    const d = new Date(t);
    if (d.getUTCDay() !== 0 && !feries.has(d.toISOString().slice(0, 10))) n++;
  }
  return n;
}

/** Mois complets écoulés entre deux dates ISO (comme age() en SQL). */
export function moisComplets(depuis: string, jusqua: string): number {
  const [a1, m1, j1] = depuis.split("-").map(Number);
  const [a2, m2, j2] = jusqua.split("-").map(Number);
  const mois = (a2 - a1) * 12 + (m2 - m1) - (j2 < j1 ? 1 : 0);
  return Math.max(0, mois);
}

/** Congés acquis (arrondis au dixième) : mois complets depuis l'embauche × jours acquis par mois. */
export function congesAcquis(dateEmbauche: string, dateRef: string, joursParMois: number): number {
  return Math.round(moisComplets(dateEmbauche, dateRef) * joursParMois * 10) / 10;
}

export interface TrancheRts {
  /** La tranche s'applique au revenu imposable à partir de ce montant (GNF). */
  deGnf: number;
  taux: number;
}

/** Impôt progressif par tranches : chaque taux s'applique à la part du revenu comprise dans sa tranche. */
export function impotProgressif(imposable: number, tranches: readonly TrancheRts[]): number {
  const t = [...tranches].sort((a, b) => a.deGnf - b.deGnf);
  let impot = 0;
  for (let i = 0; i < t.length; i++) {
    // Une tranche « à partir de 1 000 001 » commence juste après 1 000 000 : on travaille en bornes basses exclusives.
    const bas = t[i].deGnf > 0 ? t[i].deGnf - 1 : 0;
    const haut = i + 1 < t.length ? t[i + 1].deGnf - 1 : Infinity;
    if (imposable > bas) impot += (Math.min(imposable, haut) - bas) * t[i].taux;
  }
  return Math.round(impot);
}

export interface ReglesPaie {
  heuresMensuelles: number;
  majorationHeuresSup: number;
  joursOuvrablesMois: number;
  tauxCnssSalarie: number;
  tauxCnssEmployeur: number;
  plafondCnssGnf: number;
  tranchesRts: readonly TrancheRts[];
}

export interface ElementsPaie {
  salaireBaseGnf: number;
  primesGnf: number;
  heuresSup: number;
  joursAbsenceNonPayee: number;
  avancesGnf: number;
}

export interface Bulletin {
  montantHeuresSupGnf: number;
  retenueAbsencesGnf: number;
  brutGnf: number;
  cnssSalarieGnf: number;
  cnssEmployeurGnf: number;
  imposableGnf: number;
  rtsGnf: number;
  netGnf: number;
  /** Coût total pour l'entreprise (brut + CNSS patronale). */
  coutEmployeurGnf: number;
}

/**
 * Bulletin de paie mensuel :
 * brut = base + primes + heures sup (taux horaire × (1 + majoration)) − retenue d'absence (base ÷ jours ouvrables × jours) ;
 * CNSS = taux × min(brut, plafond) ; imposable = brut − CNSS salariale ; RTS = barème progressif ;
 * net à payer = brut − CNSS salariale − RTS − avances.
 */
export function calculerBulletin(e: ElementsPaie, r: ReglesPaie): Bulletin {
  const tauxHoraire = r.heuresMensuelles > 0 ? e.salaireBaseGnf / r.heuresMensuelles : 0;
  const montantHeuresSupGnf = Math.round(e.heuresSup * tauxHoraire * (1 + r.majorationHeuresSup));
  const retenueAbsencesGnf = Math.min(e.salaireBaseGnf, Math.round(r.joursOuvrablesMois > 0 ? (e.salaireBaseGnf / r.joursOuvrablesMois) * e.joursAbsenceNonPayee : 0));
  const brutGnf = e.salaireBaseGnf + e.primesGnf + montantHeuresSupGnf - retenueAbsencesGnf;
  const assiette = Math.min(brutGnf, r.plafondCnssGnf);
  const cnssSalarieGnf = Math.round(assiette * r.tauxCnssSalarie);
  const cnssEmployeurGnf = Math.round(assiette * r.tauxCnssEmployeur);
  const imposableGnf = brutGnf - cnssSalarieGnf;
  const rtsGnf = impotProgressif(imposableGnf, r.tranchesRts);
  return {
    montantHeuresSupGnf,
    retenueAbsencesGnf,
    brutGnf,
    cnssSalarieGnf,
    cnssEmployeurGnf,
    imposableGnf,
    rtsGnf,
    netGnf: brutGnf - cnssSalarieGnf - rtsGnf - e.avancesGnf,
    coutEmployeurGnf: brutGnf + cnssEmployeurGnf,
  };
}

/** Taux d'absentéisme : jours d'absence ÷ jours pointés (présent, retard, absent ; congés et repos exclus). */
export function tauxAbsenteisme(pointages: readonly { statut: string }[]): number | null {
  const comptes = pointages.filter((p) => p.statut === "present" || p.statut === "retard" || p.statut === "absent");
  return comptes.length ? comptes.filter((p) => p.statut === "absent").length / comptes.length : null;
}
