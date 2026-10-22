import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { redact } from "@/lib/ops/redact";
import { costUsd, isAllowedModel, maxCostUsd } from "@/lib/ai/pricing";

export type AgentId = "analyst" | "support" | "developer";

/** Clé API présente côté serveur (jamais transmise au navigateur ni au modèle). */
export function aiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

type Reserve =
  { ok: true; run: string; model: string; effort: "low" | "medium" | "high"; tools: string[] } | { ok: false; reason: string };

export type AiResult = { ok: true; text: string; run: string } | { ok: false; reason: string };

type Outcome = "succeeded" | "failed" | "to_reconcile";

/** Clôture de l'appel, avec une nouvelle tentative ; en cas d'échec persistant, l'appel reste « en cours »
 *  (coût maximal réservé) et devient « à rapprocher » à la prochaine vérification : rien n'est perdu ni libéré. */
async function close(
  run: string,
  outcome: Outcome,
  model: string,
  input: number,
  output: number,
  cost: number | null,
  error?: string,
) {
  const db = createAdminClient();
  for (let attempt = 0; attempt < 2; attempt++) {
    const { error: e } = await db.rpc("ai_close", {
      p_run: run,
      p_outcome: outcome,
      p_model: model,
      p_input: input,
      p_output: output,
      p_cost: cost as number,
      p_error: error,
    });
    if (!e) return true;
  }
  console.error(
    "[ia] clôture non enregistrée, à rapprocher",
    redact(JSON.stringify({ run, outcome, model, input, output, cost })),
  );
  return false;
}

/**
 * Appel unique au modèle, encadré par la réservation du coût MAXIMAL (ai_reserve) et une clôture unique (ai_close).
 * Aucun outil n'est exposé au modèle, aucun modèle de remplacement automatique, aucune relance : le coût d'un appel
 * ne peut pas dépasser la réservation. Le plafond est applicatif : il ne remplace pas la limite de dépense du
 * fournisseur. En cas d'indisponibilité, l'application continue sans IA.
 */
export async function runAgent(opts: {
  agent: AgentId;
  userId: string | null;
  system: string;
  messages: Anthropic.MessageParam[];
  maxTokens: number;
}): Promise<AiResult> {
  if (!aiConfigured()) return { ok: false, reason: "Service IA non configuré" };
  const db = createAdminClient();
  const { data: agent } = await db.from("ai_agents").select("model").eq("id", opts.agent).single();
  const model = agent?.model;
  if (!isAllowedModel(model)) return { ok: false, reason: "Modèle non autorisé (coût non maîtrisé)" };
  const reserveCost = maxCostUsd(model, opts.system + JSON.stringify(opts.messages), opts.maxTokens)!;
  const { data, error } = await db.rpc("ai_reserve", {
    p_agent: opts.agent,
    p_user: opts.userId as string,
    p_estimated_cost: reserveCost,
  });
  if (error || !data) return { ok: false, reason: "Réservation impossible" };
  const reserve = data as unknown as Reserve;
  if (!reserve.ok) return { ok: false, reason: reserve.reason };

  let response: Anthropic.Message;
  try {
    const client = new Anthropic({ timeout: Number(process.env.AI_TIMEOUT_MS) || 60_000, maxRetries: 0 });
    response = await client.messages.create({
      model: reserve.model,
      max_tokens: opts.maxTokens,
      output_config: { effort: reserve.effort },
      system: opts.system,
      messages: opts.messages,
    });
  } catch (e) {
    // Coupure réseau ou délai dépassé : la requête a peut-être été facturée → à rapprocher (coût réservé conservé).
    // Erreur HTTP renvoyée par le fournisseur : requête non facturée → échec à coût nul.
    const uncertain = !(e instanceof Anthropic.APIError) || e instanceof Anthropic.APIConnectionError || e.status === undefined;
    const message = redact(e instanceof Anthropic.APIError ? `${e.status ?? "réseau"} ${e.message}` : e, 500);
    console.error(`[ia ${opts.agent}]`, message);
    await close(reserve.run, uncertain ? "to_reconcile" : "failed", reserve.model, 0, 0, uncertain ? null : 0, message);
    return { ok: false, reason: "Service IA indisponible" };
  }

  const text =
    response.stop_reason === "refusal"
      ? ""
      : response.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n")
          .trim();
  const u = response.usage;
  const usage = {
    input: u.input_tokens,
    output: u.output_tokens,
    cacheRead: u.cache_read_input_tokens ?? 0,
    cacheWrite: u.cache_creation_input_tokens ?? 0,
  };
  // Coût calculé au tarif du modèle réellement utilisé ; modèle inattendu → à rapprocher
  const cost = isAllowedModel(response.model) ? costUsd(response.model, usage) : null;
  await close(
    reserve.run,
    cost === null ? "to_reconcile" : text ? "succeeded" : "failed",
    response.model,
    usage.input + usage.cacheRead + usage.cacheWrite,
    usage.output,
    cost,
    cost === null ? `Modèle inattendu : ${response.model}` : text ? undefined : "Réponse vide ou refusée",
  );
  return text ? { ok: true, text, run: reserve.run } : { ok: false, reason: "Le service IA n'a pas pu répondre" };
}

/** Encadre un contenu non fiable (messages, alertes, documents) : jamais des instructions. */
export function untrusted(label: string, content: string) {
  return `<donnees_non_fiables source="${label}">\n${content.replaceAll("</donnees_non_fiables", "&lt;/donnees_non_fiables")}\n</donnees_non_fiables>`;
}
