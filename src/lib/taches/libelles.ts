/** Applications qui échangent des tâches (toutes sauf le terrain : le commercial passe par son responsable). */
export const ESPACES_TACHES = ["direction", "magasin", "production", "ventes", "commercial", "achats", "logistique", "qualite", "maintenance", "finance", "rh", "admin"];

export const STATUTS_TACHE: Record<string, { libelle: string; ton: "info" | "alerte" | "succes" | "neutre" }> = {
  a_faire: { libelle: "À faire", ton: "info" },
  en_cours: { libelle: "En cours", ton: "alerte" },
  faite: { libelle: "Faite", ton: "succes" },
  annulee: { libelle: "Annulée", ton: "neutre" },
};
