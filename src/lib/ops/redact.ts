/**
 * Nettoyage avant journalisation, stockage d'une erreur ou envoi à un service externe (IA, surveillance) :
 * adresses email, numéros de téléphone, jetons (JWT, clés, Bearer), URL signées et identifiants UUID sont masqués.
 */
const RULES: [RegExp, string][] = [
  [/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [secret]"],
  [/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, "[jwt]"],
  [/\b(sk|pk|sb|rk)[-_][A-Za-z0-9_-]{12,}/g, "[clé]"],
  [/([?&](token|signature|sig|key|apikey|access_token|code)=)[^&\s]+/gi, "$1[masqué]"],
  [/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]"],
  [/\+\d[\d\s.-]{7,}\d/g, "[téléphone]"],
  [/\b6\d{2}([\s.-]?\d{2}){3}\b/g, "[téléphone]"],
  [/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "[id]"],
];

export function redact(input: unknown, max = 2000): string {
  let s = input instanceof Error ? `${input.name}: ${input.message}` : typeof input === "string" ? input : JSON.stringify(input);
  for (const [re, by] of RULES) s = s.replace(re, by);
  return s.length > max ? `${s.slice(0, max)}…` : s;
}
