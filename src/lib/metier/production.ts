/**
 * Indicateurs d'une fiche de production (un poste : matin, après-midi, nuit…).
 *
 * Une fiche peut produire plusieurs produits avec le même papier : le rendement global est alors
 * le ratio « tonnes théoriquement nécessaires ÷ tonnes réellement consommées », où
 * tonnes théoriques = Σ (paquets du produit ÷ rendement théorique du produit).
 * Pour un seul produit, ce ratio est exactement « rendement réel ÷ rendement théorique ».
 *
 * TRS (OEE) = disponibilité × performance × qualité :
 * - temps d'ouverture = durée du poste − arrêts PLANIFIÉS (pause, nettoyage prévu…) ;
 * - disponibilité = (ouverture − arrêts NON planifiés) ÷ ouverture ;
 * - performance = temps théorique pour produire (paquets bons + rebuts) à la cadence nominale ÷ temps de marche ;
 * - qualité = paquets bons ÷ (paquets bons + équivalent paquets des rebuts).
 */
import { ErreurUnite, kgVersTonnes, type Kg } from "./unites";

export interface LigneProduction {
  produitId: string;
  /** Paquets bons produits. */
  paquets: number;
  /** Papier mis au rebut pendant la fabrication de ce produit (kg). */
  rebutsKg: number;
  rendementTheoriquePaquetsT: number;
  poidsPaquetG: number;
  /** Cadence nominale de la ligne pour ce produit (paquets/minute) ; null si non renseignée. */
  cadencePaquetsMinute: number | null;
}

export interface Arret {
  minutes: number;
  planifie: boolean;
}

export interface IndicateursFiche {
  tonnesConsommees: number;
  paquetsBons: number;
  /** Rendement réel en paquets/t (uniquement si un seul produit, sinon null). */
  rendementReelPaquetsT: number | null;
  /** Ratio global réel/théorique (1 = 100 %). Null si aucune consommation. */
  ratioRendement: number | null;
  tauxPerte: number | null;
  minutesArretNonPlanifie: number;
  minutesArretPlanifie: number;
  disponibilite: number | null;
  performance: number | null;
  qualite: number | null;
  trs: number | null;
}

/** Durée d'un poste en minutes ; un poste de nuit peut passer minuit (22:00 → 06:00 = 480 min). */
export function dureePosteMinutes(debut: string, fin: string): number {
  const lire = (h: string) => {
    const m = /^(\d{1,2}):(\d{2})/.exec(h);
    if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) throw new ErreurUnite(`Heure invalide : « ${h} ».`);
    return Number(m[1]) * 60 + Number(m[2]);
  };
  const d = lire(debut);
  const f = lire(fin);
  return f > d ? f - d : f + 24 * 60 - d;
}

export function calculerIndicateursFiche(entree: {
  consommeKg: Kg;
  lignes: LigneProduction[];
  arrets: Arret[];
  dureePosteMin: number;
}): IndicateursFiche {
  const { consommeKg, lignes, arrets, dureePosteMin } = entree;
  if (consommeKg < 0 || dureePosteMin < 0) throw new ErreurUnite("Valeurs négatives interdites.");
  for (const l of lignes) {
    if (l.paquets < 0 || l.rebutsKg < 0) throw new ErreurUnite("Quantités négatives interdites.");
    if (l.rendementTheoriquePaquetsT <= 0 || l.poidsPaquetG <= 0) throw new ErreurUnite("Caractéristiques produit invalides.");
  }

  const tonnes = kgVersTonnes(consommeKg);
  const paquetsBons = lignes.reduce((s, l) => s + l.paquets, 0);
  const rebutsKg = lignes.reduce((s, l) => s + l.rebutsKg, 0);
  const tonnesTheoriques = lignes.reduce((s, l) => s + l.paquets / l.rendementTheoriquePaquetsT, 0);
  const produits = new Set(lignes.map((l) => l.produitId));

  const minutesArretPlanifie = arrets.filter((a) => a.planifie).reduce((s, a) => s + a.minutes, 0);
  const minutesArretNonPlanifie = arrets.filter((a) => !a.planifie).reduce((s, a) => s + a.minutes, 0);
  const ouverture = Math.max(0, dureePosteMin - minutesArretPlanifie);
  const marche = Math.max(0, ouverture - minutesArretNonPlanifie);

  const disponibilite = ouverture > 0 ? marche / ouverture : null;

  const rebutsEqPaquets = lignes.reduce((s, l) => s + (l.rebutsKg * 1000) / l.poidsPaquetG, 0);
  const qualite = paquetsBons + rebutsEqPaquets > 0 ? paquetsBons / (paquetsBons + rebutsEqPaquets) : null;

  const cadencesConnues = lignes.length > 0 && lignes.every((l) => l.cadencePaquetsMinute !== null && l.cadencePaquetsMinute > 0);
  const minutesTheoriques = cadencesConnues
    ? lignes.reduce((s, l) => s + (l.paquets + (l.rebutsKg * 1000) / l.poidsPaquetG) / (l.cadencePaquetsMinute as number), 0)
    : null;
  const performance = minutesTheoriques !== null && marche > 0 ? minutesTheoriques / marche : null;

  const trs = disponibilite !== null && performance !== null && qualite !== null ? disponibilite * performance * qualite : null;

  return {
    tonnesConsommees: tonnes,
    paquetsBons,
    rendementReelPaquetsT: produits.size === 1 && tonnes > 0 ? paquetsBons / tonnes : null,
    ratioRendement: tonnes > 0 ? tonnesTheoriques / tonnes : null,
    tauxPerte: consommeKg > 0 ? rebutsKg / consommeKg : null,
    minutesArretNonPlanifie,
    minutesArretPlanifie,
    disponibilite,
    performance,
    qualite,
    trs,
  };
}

/**
 * Répartit le coût matière d'une fiche (papier + emballages consommés) entre les produits fabriqués,
 * au prorata du poids théorique de papier de chaque ligne (paquets × poids d'un paquet).
 * Renvoie le coût unitaire par paquet de chaque ligne (GNF, 2 décimales). La somme est conservée à l'arrondi près.
 */
export function repartirCoutMatiere(coutTotalGnf: number, lignes: { paquets: number; poidsPaquetG: number }[]): number[] {
  if (coutTotalGnf < 0) throw new ErreurUnite("Coût négatif interdit.");
  const poids = lignes.map((l) => l.paquets * l.poidsPaquetG);
  const total = poids.reduce((s, p) => s + p, 0);
  return lignes.map((l, i) => (total > 0 && l.paquets > 0 ? Math.round(((coutTotalGnf * poids[i]) / total / l.paquets) * 100) / 100 : 0));
}
