/**
 * Tarifs publics Anthropic (API directe), en USD par million de jetons.
 * Relevés le 22/10/2026 (référence : https://platform.claude.com/docs/en/about-claude/pricing ; table du
 * 06/10/2026). À revérifier avant toute décision budgétaire. Modèle inconnu → tarif le plus élevé (prudence).
 */
export const PRICES_USD_PER_MTOK: Record<string, { input: number; output: number }> = {
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
  "claude-opus-5": { input: 5, output: 25 },
  "claude-opus-4-8": { input: 5, output: 25 },
  "claude-fable-5-1": { input: 10, output: 50 },
};
const MAX_PRICE = { input: 10, output: 50 };

export function priceOf(model: string | null | undefined) {
  return (model && PRICES_USD_PER_MTOK[model]) || MAX_PRICE;
}

export function costUsd(model: string | null | undefined, inputTokens: number, outputTokens: number) {
  const p = priceOf(model);
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}

/** Estimation avant appel (réservation du budget) : ~3 caractères par jeton en entrée, sortie au maximum. */
export function estimateCostUsd(model: string, inputChars: number, maxOutputTokens: number) {
  return costUsd(model, Math.ceil(inputChars / 3), maxOutputTokens);
}
