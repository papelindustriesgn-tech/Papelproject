export type UniversityRole = "admin" | "validator" | "viewer" | "announcer";

export const UNIVERSITY_ROLES: Record<UniversityRole, { label: string; description: string }> = {
  admin: { label: "Administrateur", description: "Tous les droits : fiche, équipe, imports, décisions, annonces." },
  validator: { label: "Validation", description: "Consulte et décide sur les inscriptions, voit l'historique." },
  viewer: { label: "Consultation", description: "Consulte la liste des étudiants et l'exporte." },
  announcer: { label: "Annonces", description: "Envoie des annonces aux étudiants, sans accès aux dossiers." },
};
