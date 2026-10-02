/**
 * Calculs de rendement de production.
 * Le système compare TOUJOURS le rendement réel (paquets produits ÷ tonnes consommées) au théorique.
 */
import { ErreurUnite, kgVersTonnes, type Kg, type Paquets } from "./unites";

/** Caractéristiques techniques d'un produit fini (paramétrables dans Admin). */
export interface CaracteristiquesProduit {
  nbMouchoirs: number;
  plis: number;
  longueurMm: number;
  largeurMm: number;
  /** Grammage par pli en g/m² (référence : 13). */
  grammageGm2ParPli: number;
}

/** Poids théorique d'un paquet en grammes = surface d'un mouchoir × plis × grammage × nb de mouchoirs. */
export function poidsPaquetGrammes(p: CaracteristiquesProduit): number {
  const valeurs = [p.nbMouchoirs, p.plis, p.longueurMm, p.largeurMm, p.grammageGm2ParPli];
  if (valeurs.some((v) => !Number.isFinite(v) || v <= 0)) {
    throw new ErreurUnite("Caractéristiques produit invalides : toutes les valeurs doivent être positives.");
  }
  const surfaceM2 = (p.longueurMm / 1000) * (p.largeurMm / 1000);
  return surfaceM2 * p.plis * p.grammageGm2ParPli * p.nbMouchoirs;
}

/**
 * Rendement théorique en paquets par tonne de papier, après pertes de référence.
 * Petit 100 (190×126, 3 plis, 13 g) → 10 175 ; Grand 100 (190×197) → 6 508 (avec 5 % de pertes).
 * Arrondi à l'entier le plus proche (convention des valeurs de référence : 10 174,98 → 10 175 ; 6 507,88 → 6 508).
 */
export function rendementTheoriquePaquetsParTonne(p: CaracteristiquesProduit, tauxPerte: number): number {
  if (!Number.isFinite(tauxPerte) || tauxPerte < 0 || tauxPerte >= 1) {
    throw new ErreurUnite("Taux de perte invalide : il doit être compris entre 0 et 1 (ex. 0,05 pour 5 %).");
  }
  return Math.round((1_000_000 * (1 - tauxPerte)) / poidsPaquetGrammes(p));
}

/** Rendement réel = paquets produits ÷ tonnes de papier consommées. Null si aucune consommation. */
export function rendementReelPaquetsParTonne(produits: Paquets, consomme: Kg): number | null {
  if (consomme < 0 || produits < 0) throw new ErreurUnite("Quantités négatives interdites.");
  if (consomme === 0) return null;
  return produits / kgVersTonnes(consomme);
}

/** Ratio réel / théorique (1 = 100 %). */
export function ratioRendement(reel: number, theorique: number): number {
  if (theorique <= 0) throw new ErreurUnite("Rendement théorique invalide.");
  return reel / theorique;
}

/** Taux de perte réel = rebuts ÷ papier consommé. */
export function tauxPerteReel(rebuts: Kg, consomme: Kg): number | null {
  if (consomme < 0 || rebuts < 0) throw new ErreurUnite("Quantités négatives interdites.");
  if (consomme === 0) return null;
  return rebuts / consomme;
}

/** Seuils d'alerte de production (paramétrables). */
export interface SeuilsProduction {
  /** Ratio minimal réel/théorique (0,95 par défaut). */
  ratioRendementMin: number;
  /** Taux de perte maximal (0,05 par défaut). */
  tauxPerteMax: number;
  /** Durée d'arrêt maximale en minutes (30 par défaut). */
  arretMaxMinutes: number;
}

export const SEUILS_PRODUCTION_DEFAUT: SeuilsProduction = {
  ratioRendementMin: 0.95,
  tauxPerteMax: 0.05,
  arretMaxMinutes: 30,
};

export type AlerteProduction =
  | { type: "rendement_faible"; ratio: number }
  | { type: "perte_elevee"; taux: number }
  | { type: "arret_long"; minutes: number };

/** Détermine les alertes d'une fiche de production. */
export function alertesProduction(
  mesures: { ratioRendement: number | null; tauxPerte: number | null; arretsMinutes: number[] },
  seuils: SeuilsProduction = SEUILS_PRODUCTION_DEFAUT,
): AlerteProduction[] {
  const alertes: AlerteProduction[] = [];
  if (mesures.ratioRendement !== null && mesures.ratioRendement < seuils.ratioRendementMin) {
    alertes.push({ type: "rendement_faible", ratio: mesures.ratioRendement });
  }
  if (mesures.tauxPerte !== null && mesures.tauxPerte > seuils.tauxPerteMax) {
    alertes.push({ type: "perte_elevee", taux: mesures.tauxPerte });
  }
  for (const minutes of mesures.arretsMinutes) {
    if (minutes > seuils.arretMaxMinutes) alertes.push({ type: "arret_long", minutes });
  }
  return alertes;
}
