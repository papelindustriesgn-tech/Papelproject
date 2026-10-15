/** Normalisations communes au rapprochement (import, API, BAC). Comparaisons strictes, jamais approximatives. */

/** « Diallo  Mamadou-Saliou » → « DIALLO MAMADOU SALIOU » (accents retirés, mots triés). */
export function normalizeName(value: string | null | undefined) {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(" ");
}

/** « 2021 / ugn-0457 » → « 2021UGN0457 » */
export function normalizeNumber(value: string | null | undefined) {
  return (value ?? "").toUpperCase().replace(/[^0-9A-Z]/g, "");
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Date au format AAAA-MM-JJ depuis « 12/03/2003 », « 2003-03-12 », un objet Date ou un numéro de série Excel. */
export function normalizeDate(value: unknown): string | null {
  if (value == null || value === "") return null;
  let d: Date | null = null;
  if (value instanceof Date) d = value;
  else if (typeof value === "number" && value > 10000 && value < 80000) {
    d = new Date(Date.UTC(1899, 11, 30) + value * 86400000);
  } else {
    const s = String(value).trim();
    let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
    if (m) return valid(+m[1], +m[2], +m[3]);
    m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s);
    if (m) return valid(+m[3], +m[2], +m[1]);
    return null;
  }
  return d && !Number.isNaN(d.getTime()) ? valid(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()) : null;
}

function valid(y: number, m: number, d: number) {
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

export type MatchCriteria = {
  student_number: boolean;
  last_name: boolean;
  first_name: boolean | null;
  birth_date: boolean | null;
};

/**
 * Règle de décision : le matricule ET le nom ET (la date de naissance OU le prénom) doivent correspondre
 * exactement. Une date de naissance divergente bloque toujours la validation automatique.
 */
export function decide(c: MatchCriteria): "verified" | "manual_review" {
  if (!c.student_number || !c.last_name) return "manual_review";
  if (c.birth_date === false) return "manual_review";
  return c.birth_date === true || c.first_name === true ? "verified" : "manual_review";
}
