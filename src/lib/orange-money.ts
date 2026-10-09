/**
 * Paiement Orange Money chez les partenaires : l'étudiant paie directement le code marchand du
 * partenaire depuis son téléphone (menu #144# ou application Orange Money). Uny n'encaisse rien.
 * Aucune API Orange Money n'est raccordée tant qu'un accord n'est pas signé : le paiement n'est
 * donc jamais confirmé automatiquement, le partenaire le vérifie sur son relevé.
 */
export const ORANGE_MONEY_USSD = "#144#";
export const ORANGE_MONEY_DIAL = "tel:%23144%23";

export const PAYMENT_METHODS = {
  orange_money: "Orange Money",
  cash: "Espèces",
  other: "Autre",
} as const;
export type PaymentMethod = keyof typeof PAYMENT_METHODS;
export const isPaymentMethod = (v: unknown): v is PaymentMethod => typeof v === "string" && v in PAYMENT_METHODS;

/** Pourcentage de réduction arrondi (ex. -25 %), ou null si pas de promo. */
export function discountPercent(original: number | null | undefined, price: number | null | undefined) {
  if (!original || price == null || price >= original) return null;
  return Math.round(((original - price) / original) * 100);
}
