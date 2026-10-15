/**
 * Identifiant Uny : UNY-GN-2026-7K3QXN (5 caractères aléatoires + 1 caractère de contrôle,
 * alphabet Crockford sans I, L, O, U). Les identifiants historiques GN-2026-000145 restent valables.
 */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const WEIGHTS = [1, 3, 5, 7, 9];

/** Corrige les confusions de saisie courantes (O→0, I/L→1) dans la partie aléatoire. */
const crockford = (s: string) => s.replace(/O/g, "0").replace(/[IL]/g, "1");

export function normalizeUnyId(raw: string): string | null {
  const s = raw.toUpperCase().replace(/\s+/g, "");
  const m = /^UNY-([A-Z]{2})-(\d{4})-([0-9A-Z]{6})$/.exec(s);
  if (m) {
    const body = crockford(m[3]);
    if (![...body].every((c) => ALPHABET.includes(c))) return null;
    const sum = [...body.slice(0, 5)].reduce((acc, c, i) => acc + ALPHABET.indexOf(c) * WEIGHTS[i], 0);
    return ALPHABET[sum % 32] === body[5] ? `UNY-${m[1]}-${m[2]}-${body}` : null;
  }
  return /^[A-Z]{2}-\d{4}-\d{4,8}$/.test(s) ? s : null;
}

export const UNY_ID_EXAMPLE = "UNY-GN-2026-7K3QXN";
