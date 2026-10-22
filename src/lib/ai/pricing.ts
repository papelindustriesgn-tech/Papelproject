/**
 * Tarifs Anthropic (API directe, routage global par défaut), USD par million de jetons.
 * Vérifiés le 22/10/2026 sur https://platform.claude.com/docs/en/about-claude/pricing.
 * Seuls ces modèles sont autorisés (contrainte ai_agents_model_allowed) : un modèle absent est refusé.
 * Haiku 5.5 : tarif majoré au-delà de 100 000 jetons d'entrée (on réserve toujours au tarif majoré).
 */
type Price = { input: number; output: number; cacheRead: number };
export const PRICES_VERIFIED_ON = "2026-10-22";
export const PRICES_SOURCE = "https://platform.claude.com/docs/en/about-claude/pricing";

const PRICES: Record<string, { standard: Price; longContext?: Price }> = {
  "claude-opus-5-5": { standard: { input: 4, output: 20, cacheRead: 0.2 } },
  "claude-sonnet-5-5": { standard: { input: 2, output: 10, cacheRead: 0.1 } },
  "claude-haiku-5-5": {
    standard: { input: 0.1, output: 0.5, cacheRead: 0.01 },
    longContext: { input: 0.5, output: 2.5, cacheRead: 0.05 },
  },
};

export function isAllowedModel(model: string | null | undefined): model is string {
  return !!model && model in PRICES;
}

function priceFor(model: string, inputTokens: number): Price | null {
  const p = PRICES[model];
  if (!p) return null;
  return p.longContext && inputTokens > 100_000 ? p.longContext : p.standard;
}

/** Coût réel d'après l'usage renvoyé par le fournisseur. Modèle inconnu → null (à rapprocher). */
export function costUsd(model: string, usage: { input: number; output: number; cacheRead?: number; cacheWrite?: number }) {
  const totalIn = usage.input + (usage.cacheRead ?? 0) + (usage.cacheWrite ?? 0);
  const p = priceFor(model, totalIn);
  if (!p) return null;
  // Écriture en cache : 1,25 × l'entrée (5 min) — aucun cache n'est demandé par l'application
  return (
    (usage.input * p.input +
      (usage.cacheWrite ?? 0) * p.input * 1.25 +
      (usage.cacheRead ?? 0) * p.cacheRead +
      usage.output * p.output) /
    1_000_000
  );
}

/**
 * Majorant prudent du nombre de jetons d'entrée : un jeton couvre au moins un octet UTF-8, donc la taille
 * en octets (plus une marge de mise en forme) ne sous-estime jamais, même pour des emojis ou de l'arabe.
 */
export function inputTokenUpperBound(text: string) {
  return Buffer.byteLength(text, "utf8") + 200;
}

/**
 * Coût maximal d'un appel : entrée majorée + sortie au plafond max_tokens (raisonnement compris, facturé en
 * sortie), au tarif le plus élevé du modèle. Une seule tentative (aucune relance automatique).
 */
export function maxCostUsd(model: string, text: string, maxOutputTokens: number) {
  const p = PRICES[model];
  if (!p) return null;
  const worst = p.longContext ?? p.standard;
  return (inputTokenUpperBound(text) * worst.input + maxOutputTokens * worst.output) / 1_000_000;
}
