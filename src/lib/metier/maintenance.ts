/**
 * Indicateurs de fiabilité de la maintenance (fonctions pures, testées).
 * - Temps requis = jours de la période × heures d'ouverture par jour (paramètre).
 * - Panne = intervention curative ayant arrêté la machine ; sa durée (début → fin) est le temps de réparation.
 * - MTBF = (temps requis − arrêts) ÷ nombre de pannes ; MTTR = arrêts ÷ nombre de pannes ;
 *   disponibilité = (temps requis − arrêts) ÷ temps requis.
 */

export interface Fiabilite {
  nbPannes: number;
  heuresArret: number;
  heuresRequises: number;
  mtbfHeures: number | null;
  mttrMinutes: number | null;
  disponibilite: number | null;
}

export function calculerFiabilite(dureesPannesMin: number[], jours: number, heuresOuvertureJour: number): Fiabilite {
  const heuresRequises = Math.max(0, jours * heuresOuvertureJour);
  const minutesArret = dureesPannesMin.reduce((s, d) => s + Math.max(0, d), 0);
  const heuresArret = Math.min(minutesArret / 60, heuresRequises);
  const n = dureesPannesMin.length;
  return {
    nbPannes: n,
    heuresArret,
    heuresRequises,
    mtbfHeures: n > 0 ? (heuresRequises - heuresArret) / n : null,
    mttrMinutes: n > 0 ? minutesArret / n : null,
    disponibilite: heuresRequises > 0 ? (heuresRequises - heuresArret) / heuresRequises : null,
  };
}

/** Statut d'une échéance préventive : en retard (< 0 j), à faire sous l'horizon, ou planifiée. */
export function etatEcheance(joursRestants: number, horizonJours = 7): "retard" | "proche" | "planifie" {
  if (joursRestants < 0) return "retard";
  return joursRestants <= horizonJours ? "proche" : "planifie";
}
