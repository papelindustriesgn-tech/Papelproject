/** Libellés des ventes. */
export const TYPES_PIECE: Record<string, { singulier: string; pluriel: string; prefixe: string }> = {
  devis: { singulier: "Devis", pluriel: "Devis", prefixe: "DEV" },
  commande: { singulier: "Commande", pluriel: "Commandes", prefixe: "CMD" },
  facture: { singulier: "Facture", pluriel: "Factures", prefixe: "FA" },
  avoir: { singulier: "Avoir", pluriel: "Avoirs", prefixe: "AV" },
};

export const STATUTS_PIECE: Record<string, { libelle: string; ton: "alerte" | "succes" | "neutre" }> = {
  brouillon: { libelle: "Brouillon", ton: "alerte" },
  valide: { libelle: "Validé", ton: "succes" },
  annule: { libelle: "Annulé", ton: "neutre" },
};

export const CANAUX_RELANCE: Record<string, string> = {
  telephone: "Téléphone",
  visite: "Visite",
  sms: "SMS",
  whatsapp: "WhatsApp",
  courrier: "Courrier",
  email: "E-mail",
};
