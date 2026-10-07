import "server-only";
import { createHmac } from "node:crypto";

export type HashKind = "student_number" | "last_name" | "first_name" | "birth_date" | "bac_candidate";

/**
 * Empreintes HMAC-SHA256 : les listes d'étudiants et numéros de candidat ne sont jamais stockés en clair.
 * La clé (UNY_MATCH_SECRET) reste côté serveur ; sans elle, les empreintes sont inexploitables.
 */
function key() {
  const k = process.env.UNY_MATCH_SECRET;
  if (!k || k.length < 32) throw new Error("UNY_MATCH_SECRET manquant (32 caractères minimum)");
  return k;
}

export const hasMatchSecret = () => (process.env.UNY_MATCH_SECRET?.length ?? 0) >= 32;

export function matchHash(kind: HashKind, normalized: string) {
  return createHmac("sha256", key()).update(`${kind}:${normalized}`).digest("hex");
}
