/** Libellés de l'application RH (codes qui pilotent une logique : statuts, modes de paiement). */

export const STATUTS_PRESENCE: Record<string, { libelle: string; court: string; ton: "succes" | "alerte" | "erreur" | "info" | "neutre" }> = {
  present: { libelle: "Présent", court: "P", ton: "succes" },
  retard: { libelle: "En retard", court: "R", ton: "alerte" },
  absent: { libelle: "Absent", court: "A", ton: "erreur" },
  conge: { libelle: "Congé / absence autorisée", court: "C", ton: "info" },
  repos: { libelle: "Repos", court: "—", ton: "neutre" },
};

export const STATUTS_ABSENCE: Record<string, { libelle: string; ton: "succes" | "alerte" | "erreur" }> = {
  demandee: { libelle: "À décider", ton: "alerte" },
  approuvee: { libelle: "Approuvée", ton: "succes" },
  refusee: { libelle: "Refusée", ton: "erreur" },
};

export const MODES_PAIEMENT_SALAIRE: Record<string, string> = {
  especes: "Espèces",
  banque: "Virement bancaire",
  mobile: "Mobile money",
};

/** Libellé d'un mois (« octobre 2026 ») à partir du 1er jour ISO. */
export function libelleMois(mois: string): string {
  return new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${mois.slice(0, 7)}-01T00:00:00Z`));
}

/** Premier jour du mois (ISO) d'une date ISO. */
export function debutMois(jour: string): string {
  return `${jour.slice(0, 7)}-01`;
}

/** Dernier jour du mois (ISO). */
export function finMois(mois: string): string {
  const d = new Date(`${mois.slice(0, 7)}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(0);
  return d.toISOString().slice(0, 10);
}

export function nomComplet(e: { nom: string; prenom: string | null }): string {
  return [e.prenom, e.nom].filter(Boolean).join(" ");
}
