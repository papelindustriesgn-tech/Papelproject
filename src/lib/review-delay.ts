/**
 * Délai indicatif de traitement des dossiers : affiché seulement s'il a été défini par l'équipe
 * (variable NEXT_PUBLIC_REVIEW_DELAY, ex. « 48 h »). Aucun délai n'est promis par défaut.
 */
const DELAY = process.env.NEXT_PUBLIC_REVIEW_DELAY?.trim() || null;

/** « en général sous 48 h » si défini, sinon chaîne vide. */
export function delayHint(prefix = " en général sous ") {
  return DELAY ? `${prefix}${DELAY}` : "";
}
