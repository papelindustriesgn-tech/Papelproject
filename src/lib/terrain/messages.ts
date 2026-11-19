/**
 * Messages montrés au commercial : jamais de message technique. Les refus métier du serveur sont déjà
 * écrits en français pour l'utilisateur (« Plafond de crédit dépassé… ») et sont gardés ; tout le reste
 * (réseau, base de données, session) devient une phrase simple qui dit quoi faire.
 */

const RESEAU = /failed to fetch|fetch failed|networkerror|network request failed|load failed|timeout|timed out|econn|enotfound|pas de réseau/i;
const SESSION = /jwt|token|session|not authenticated|401|refresh/i;
const TECHNIQUE = /violates|constraint|syntax|invalid input|duplicate key|null value|column|relation|function .* does not exist|permission denied|rls|postgres|sqlstate|unexpected|undefined|typeerror|\bjson\b|42\d{3}|22\d{3}|23\d{3}/i;

/** Phrase simple à partir d'un message d'erreur brut (serveur, navigateur ou réseau). */
export function messageSimple(brut: string | null | undefined): string {
  const m = (brut ?? "").trim();
  if (!m) return "Le bureau n'a pas accepté cet envoi.";
  if (RESEAU.test(m)) return "Pas de connexion pour le moment. Vos saisies sont gardées sur ce téléphone et partiront dès que le réseau revient.";
  if (SESSION.test(m)) return "Votre connexion a expiré. Fermez puis rouvrez l'application, avec du réseau : vos saisies sont gardées.";
  if (TECHNIQUE.test(m)) return "Le bureau n'a pas pu enregistrer cet envoi. Il est gardé sur ce téléphone ; prévenez votre responsable si cela continue.";
  // Refus métier écrit pour l'utilisateur : gardé, avec un point final.
  return /[.!?]$/.test(m) ? m : `${m}.`;
}
