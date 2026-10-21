/** Libellés du module Maintenance. */
type Ton = "alerte" | "info" | "succes" | "neutre" | "erreur";

export const TYPES_INTERVENTION: Record<string, string> = {
  curative: "Curative (panne)",
  preventive: "Préventive",
  amelioration: "Amélioration",
};

export const STATUTS_INTERVENTION: Record<string, { libelle: string; ton: Ton }> = {
  demandee: { libelle: "Demandée", ton: "alerte" },
  en_cours: { libelle: "En cours", ton: "info" },
  terminee: { libelle: "Terminée", ton: "succes" },
  annulee: { libelle: "Annulée", ton: "neutre" },
};

export const PRIORITES: Record<string, { libelle: string; ton: Ton }> = {
  urgente: { libelle: "Urgente", ton: "erreur" },
  normale: { libelle: "Normale", ton: "info" },
  basse: { libelle: "Basse", ton: "neutre" },
};

/** Saisie « datetime-local » (heure de Conakry = UTC, sans heure d'été) → horodatage ISO. */
export function lireDateHeure(v: string | null | undefined): string | null {
  const t = (v ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(t) ? `${t}:00Z` : null;
}

/** Horodatage → valeur d'un champ « datetime-local » (heure de Conakry = UTC). */
export function versDateHeureLocale(iso: string | null | undefined): string {
  return iso ? new Date(iso).toISOString().slice(0, 16) : "";
}
