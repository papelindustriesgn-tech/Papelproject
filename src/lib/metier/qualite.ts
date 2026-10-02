/**
 * Règles et indicateurs qualité (fonctions pures, testées).
 * `mesureConforme` reproduit le trigger SQL `mesure_conformite` (affichage immédiat dans le formulaire).
 */

export interface Tolerance {
  min: number | null;
  max: number | null;
}

/** Une mesure est conforme si elle est dans les tolérances (bornes incluses ; borne absente = pas de limite). */
export function mesureConforme(valeur: number, t: Tolerance): boolean {
  return (t.min === null || valeur >= t.min) && (t.max === null || valeur <= t.max);
}

/** Libellé de tolérance : « 12,5 à 13,5 g/m² », « ≤ 8 % », « ≥ 100 »… */
export function libelleTolerance(t: Tolerance, unite = ""): string {
  const f = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 3 }).replace(/[  ]/g, " ");
  const u = unite ? ` ${unite}` : "";
  if (t.min !== null && t.max !== null) return t.min === t.max ? `${f(t.min)}${u}` : `${f(t.min)} à ${f(t.max)}${u}`;
  if (t.max !== null) return `≤ ${f(t.max)}${u}`;
  if (t.min !== null) return `≥ ${f(t.min)}${u}`;
  return "—";
}

/** Taux de conformité : contrôles conformes ÷ contrôles validés. */
export function tauxConformite(controles: { resultat: string | null }[]): number | null {
  const valides = controles.filter((c) => c.resultat !== null);
  return valides.length ? valides.filter((c) => c.resultat === "conforme").length / valides.length : null;
}

const JOUR_MS = 86_400_000;

/** Délai moyen de clôture des NC (jours, une décimale) : de la date de constat à la clôture. */
export function delaiMoyenClotureJours(nc: { date_constat: string; cloturee_le: string | null }[]): number | null {
  const closes = nc.filter((n) => n.cloturee_le);
  if (!closes.length) return null;
  const total = closes.reduce((s, n) => s + (Date.parse(n.cloturee_le!) - Date.parse(`${n.date_constat}T00:00:00Z`)) / JOUR_MS, 0);
  return Math.round((total / closes.length) * 10) / 10;
}

/** Actions correctives en retard : non réalisées et échéance dépassée (dates ISO AAAA-MM-JJ). */
export function actionsEnRetard<T extends { echeance: string | null; realisee_le: string | null }>(actions: T[], aujourdhui: string): T[] {
  return actions.filter((a) => !a.realisee_le && a.echeance !== null && a.echeance < aujourdhui);
}
