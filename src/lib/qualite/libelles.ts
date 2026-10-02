/** Libellés du module Qualité. */
type Ton = "alerte" | "info" | "succes" | "neutre" | "erreur";

export const ETAPES_CONTROLE: Record<string, string> = {
  reception: "Réception (bobines)",
  production: "En production",
  produit_fini: "Produit fini",
};

export const ORIGINES_NC: Record<string, string> = {
  reception: "Réception matière",
  production: "Production",
  client: "Réclamation client",
  interne: "Interne (atelier, sécurité…)",
};

export const GRAVITES_NC: Record<string, { libelle: string; ton: Ton }> = {
  mineure: { libelle: "Mineure", ton: "neutre" },
  majeure: { libelle: "Majeure", ton: "alerte" },
  critique: { libelle: "Critique", ton: "erreur" },
};

export const STATUTS_NC: Record<string, { libelle: string; ton: Ton }> = {
  ouverte: { libelle: "Ouverte", ton: "erreur" },
  en_traitement: { libelle: "En traitement", ton: "alerte" },
  cloturee: { libelle: "Clôturée", ton: "succes" },
};
