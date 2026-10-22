import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { redact } from "@/lib/ops/redact";
import { costUsd, estimateCostUsd } from "@/lib/ai/pricing";

export type AgentId = "analyst" | "support" | "developer";

/** Clé API présente côté serveur (jamais transmise au navigateur ni au modèle). */
export function aiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

type Reserve = { ok: true; run: string; model: string; effort: "low" | "medium" | "high"; tools: string[] } | { ok: false; reason: string };

export type AiResult = { ok: true; text: string; run: string } | { ok: false; reason: string };

/**
 * Appel unique au modèle, encadré par la réservation de budget (ai_reserve) et la clôture (ai_finish).
 * Aucun outil n'est exposé au modèle : le serveur prépare lui-même le contexte autorisé (liste d'outils de l'agent),
 * le modèle ne peut donc ni lire d'autres données ni déclencher d'action. En cas d'indisponibilité, l'application
 * continue sans IA (le résultat indique la raison).
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
  const inputChars = opts.system.length + JSON.stringify(opts.messages).length;
  const { data: agent } = await db.from("ai_agents").select("model").eq("id", opts.agent).single();
  const model = agent?.model ?? "claude-opus-5-5";
  const { data, error } = await db.rpc("ai_reserve", {
    p_agent: opts.agent,
    p_user: opts.userId as string,
    p_estimated_cost: estimateCostUsd(model, inputChars, opts.maxTokens),
  });
  if (error || !data) return { ok: false, reason: "Réservation impossible" };
  const reserve = data as unknown as Reserve;
  if (!reserve.ok) return { ok: false, reason: reserve.reason };

  try {
    const client = new Anthropic({ timeout: 60_000, maxRetries: 1 });
    const response = await client.beta.messages.create({
      model: reserve.model,
      max_tokens: opts.maxTokens,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: reserve.effort },
      system: opts.system,
      messages: opts.messages,
    });
    const text =
      response.stop_reason === "refusal"
        ? ""
        : response.content
            .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
            .map((b) => b.text)
            .join("\n")
            .trim();
    const usage = response.usage;
    await db.rpc("ai_finish", {
      p_run: reserve.run,
      p_ok: Boolean(text),
      p_model: response.model,
      p_input: usage.input_tokens + (usage.cache_read_input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0),
      p_output: usage.output_tokens,
      p_cost: costUsd(response.model, usage.input_tokens + (usage.cache_creation_input_tokens ?? 0), usage.output_tokens) +
        costUsd(response.model, (usage.cache_read_input_tokens ?? 0) * 0.1, 0),
      p_error: text ? undefined : "Réponse vide ou refusée",
    });
    return text ? { ok: true, text, run: reserve.run } : { ok: false, reason: "Le service IA n'a pas pu répondre" };
  } catch (e) {
    const message = redact(e instanceof Anthropic.APIError ? `${e.status ?? "réseau"} ${e.message}` : e, 500);
    console.error(`[ia ${opts.agent}]`, message);
    await db.rpc("ai_finish", {
      p_run: reserve.run,
      p_ok: false,
      p_model: reserve.model,
      p_input: 0,
      p_output: 0,
      p_cost: null as unknown as number,
      p_error: message,
    });
    return { ok: false, reason: "Service IA indisponible" };
  }
}

/** Encadre un contenu non fiable (messages, alertes, documents) : jamais des instructions. */
export function untrusted(label: string, content: string) {
  return `<donnees_non_fiables source="${label}">\n${content.replaceAll("</donnees_non_fiables", "&lt;/donnees_non_fiables")}\n</donnees_non_fiables>`;
}
