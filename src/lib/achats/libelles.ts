/** Libellés du module Achats. */
export const ETAPES_CONTENEUR = [
  { statut: "commande", libelle: "Commandé", prevue: null, reelle: null },
  { statut: "en_mer", libelle: "En mer", prevue: "date_embarquement_prevue", reelle: "date_embarquement_reelle" },
  { statut: "au_port", libelle: "Au port", prevue: "date_arrivee_port_prevue", reelle: "date_arrivee_port_reelle" },
  { statut: "dedouane", libelle: "Dédouané", prevue: "date_dedouanement_prevue", reelle: "date_dedouanement_reelle" },
  { statut: "livre", libelle: "Livré à l'usine", prevue: "date_livraison_prevue", reelle: "date_livraison_reelle" },
] as const;

export const LIBELLES_STATUT_CONTENEUR: Record<string, string> = Object.fromEntries(ETAPES_CONTENEUR.map((e) => [e.statut, e.libelle]));

export const STATUTS_BC: Record<string, { libelle: string; ton: "alerte" | "info" | "succes" | "neutre" }> = {
  brouillon: { libelle: "Brouillon", ton: "alerte" },
  envoye: { libelle: "Envoyé", ton: "info" },
  recu: { libelle: "Reçu", ton: "succes" },
  annule: { libelle: "Annulé", ton: "neutre" },
};

export const STATUTS_DEMANDE: Record<string, { libelle: string; ton: "alerte" | "info" | "succes" | "neutre" | "erreur" }> = {
  soumise: { libelle: "À traiter", ton: "alerte" },
  approuvee: { libelle: "Approuvée", ton: "info" },
  refusee: { libelle: "Refusée", ton: "erreur" },
  commandee: { libelle: "Commandée", ton: "succes" },
};
