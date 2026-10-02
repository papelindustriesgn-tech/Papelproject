/** Dates au fuseau Africa/Conakry (UTC+0, sans heure d'été). */
export const FUSEAU = "Africa/Conakry";

/** Date métier du jour au format AAAA-MM-JJ. */
export function aujourdhui(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSEAU }).format(new Date());
}

export function formaterDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T12:00:00Z`) : new Date(d);
  return new Intl.DateTimeFormat("fr-FR", { timeZone: FUSEAU, day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

export function formaterDateHeure(d: string | Date): string {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: FUSEAU, dateStyle: "short", timeStyle: "short" }).format(new Date(d));
}

export const schemaDateIso = /^\d{4}-\d{2}-\d{2}$/;
