import "server-only";
import { createHmac } from "node:crypto";

export type HashKind = "student_number" | "last_name" | "first_name" | "birth_date" | "bac_candidate";

/**
 * Empreintes HMAC-SHA256 : les listes d'étudiants et numéros de candidat ne sont jamais stockés en clair.
 * Clé : UNY_MATCH_SECRET (recommandé) ; à défaut, clé dérivée de la clé serveur Supabase (jamais exposée
 * au navigateur). Ne pas changer la clé après usage : les listes importées devraient être réimportées.
 */
function key() {
  const k = process.env.UNY_MATCH_SECRET;
  if (k && k.length >= 32) return k;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (service && service.length >= 32) return createHmac("sha256", service).update("uny-match-v1").digest("hex");
  throw new Error("UNY_MATCH_SECRET manquant (32 caractères minimum)");
}

export const hasMatchSecret = () =>
  (process.env.UNY_MATCH_SECRET?.length ?? 0) >= 32 || (process.env.SUPABASE_SERVICE_ROLE_KEY?.length ?? 0) >= 32;

export function matchHash(kind: HashKind, normalized: string) {
  return createHmac("sha256", key()).update(`${kind}:${normalized}`).digest("hex");
}
