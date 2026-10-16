/**
 * Numérotation des pièces créées hors ligne : série propre au commercial (ex. FA-2026-C01-00012, CMD-2026-C01-00003).
 * Le compteur du téléphone n'est jamais réutilisé ; à chaque synchronisation il est réaligné
 * sur le plus grand numéro connu du serveur (au cas où le téléphone a été réinstallé).
 */
export type TypePieceTerrain = "devis" | "commande" | "facture";

const PREFIXES: Record<TypePieceTerrain, string> = { devis: "DEV", commande: "CMD", facture: "FA" };

export function prefixeSerie(type: TypePieceTerrain, annee: number, codeSerie: string): string {
  if (!/^[A-Z0-9]{2,4}$/.test(codeSerie)) throw new Error("Code de série du commercial invalide : contactez l'administrateur.");
  return `${PREFIXES[type]}-${annee}-${codeSerie}-`;
}

export function formaterNumero(prefixe: string, n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 99_999) throw new Error("Compteur de numérotation invalide.");
  return `${prefixe}${String(n).padStart(5, "0")}`;
}

/** Prochain numéro : max(compteur local, dernier numéro serveur) + 1. */
export function prochainCompteur(local: number, serveur: number): number {
  return Math.max(local, serveur) + 1;
}
