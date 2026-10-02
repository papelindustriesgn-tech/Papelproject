/** Libellés du module Logistique. */
type Ton = "alerte" | "info" | "succes" | "neutre" | "erreur";

export const STATUTS_TOURNEE: Record<string, { libelle: string; ton: Ton }> = {
  planifiee: { libelle: "Planifiée", ton: "alerte" },
  en_cours: { libelle: "En cours", ton: "info" },
  terminee: { libelle: "Terminée", ton: "succes" },
  annulee: { libelle: "Annulée", ton: "neutre" },
};

export const STATUTS_REMISE: Record<string, { libelle: string; ton: Ton }> = {
  a_livrer: { libelle: "À livrer", ton: "alerte" },
  livree: { libelle: "Livrée", ton: "succes" },
  partielle: { libelle: "Livrée en partie", ton: "info" },
  refusee: { libelle: "Refusée", ton: "erreur" },
};
