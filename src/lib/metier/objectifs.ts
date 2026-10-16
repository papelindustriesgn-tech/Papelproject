/**
 * Objectifs mensuels des services rapportés à une période d'analyse (fonctions pures, testées).
 * Un objectif est fixé par mois. Pour une période qui ne couvre qu'une partie d'un mois (jour, semaine…) :
 * - une quantité qui s'additionne (CA, paquets, visites…) prend la part du mois au prorata des jours
 *   (objectif du mois ÷ jours du mois × jours retenus) ;
 * - un taux ou un niveau (rendement, délai, coût par tonne…) prend la moyenne des mois, pondérée par les jours.
 */
export interface ValeurMensuelle {
  /** Premier jour du mois (AAAA-MM-01). */
  mois: string;
  valeur: number;
}

export interface ObjectifSurPeriode {
  valeur: number;
  /** Jours de la période couverts par un objectif ÷ jours de la période (1 = toute la période). */
  couverture: number;
}

const jour = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / 86_400_000;
const joursDuMois = (mois: string) => {
  const [a, m] = mois.split("-").map(Number);
  return new Date(Date.UTC(a, m, 0)).getUTCDate();
};

/** Objectif de la période [du, au] (bornes incluses) ; null si aucun mois de la période n'a d'objectif. */
export function objectifSurPeriode(valeurs: ValeurMensuelle[], du: string, au: string, cumul: boolean): ObjectifSurPeriode | null {
  const total = jour(au) - jour(du) + 1;
  let somme = 0;
  let couverts = 0;
  for (const o of valeurs) {
    const n = joursDuMois(o.mois);
    const debut = Math.max(jour(o.mois), jour(du));
    const fin = Math.min(jour(o.mois) + n - 1, jour(au));
    if (fin < debut) continue;
    const jours = fin - debut + 1;
    couverts += jours;
    somme += cumul ? (o.valeur * jours) / n : o.valeur * jours;
  }
  if (!couverts) return null;
  return { valeur: cumul ? somme : somme / couverts, couverture: couverts / total };
}

/** Avancement réel ÷ objectif (1 = objectif atteint) ; null sans objectif. */
export function avancement(reel: number, objectif: number | null | undefined): number | null {
  return objectif ? reel / objectif : null;
}

export interface EtatObjectif {
  /** Part de la barre remplie (0 à 1). */
  part: number;
  atteint: boolean;
  /** Statut écrit (jamais la couleur seule). */
  statut: "Atteint" | "Presque atteint" | "En retard" | "Au-dessus de l'objectif" | "Non mesuré";
}

/**
 * État d'un objectif. Quand une hausse est bonne (CA, paquets), il est atteint dès que le réel l'égale ;
 * quand une baisse est bonne (pertes, délais, coûts), il est atteint tant que le réel reste en dessous.
 * « Presque » : à 10 % près.
 */
export function etatObjectif(reel: number | null, objectif: number, hausseBonne: boolean): EtatObjectif {
  if (reel === null || !Number.isFinite(reel)) return { part: 0, atteint: false, statut: "Non mesuré" };
  if (hausseBonne) {
    const a = objectif > 0 ? reel / objectif : 1;
    return { part: Math.max(0, Math.min(a, 1)), atteint: a >= 1, statut: a >= 1 ? "Atteint" : a >= 0.9 ? "Presque atteint" : "En retard" };
  }
  if (reel <= objectif) return { part: 1, atteint: true, statut: "Atteint" };
  return { part: reel > 0 ? Math.max(0, Math.min(objectif / reel, 1)) : 0, atteint: false, statut: reel <= objectif * 1.1 ? "Presque atteint" : "Au-dessus de l'objectif" };
}
