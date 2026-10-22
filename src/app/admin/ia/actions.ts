"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateAnalystReport } from "@/lib/ai/analyst";
import type { FormState } from "@/lib/actions/types";

const Config = z.object({
  agent: z.enum(["*", "analyst", "support", "developer"]),
  enabled: z.boolean(),
  budget: z.coerce.number().min(0).max(10000),
  maxDay: z.coerce.number().int().min(0).max(10000).optional(),
  maxUserDay: z.coerce.number().int().min(0).max(1000).optional(),
});

/** Interrupteur et plafonds (global « * » ou par agent). Les outils autorisés ne sont pas modifiables ici. */
export async function configureAi(agent: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = Config.safeParse({
    agent,
    enabled: formData.get("enabled") === "on",
    budget: formData.get("budget") || 0,
    maxDay: formData.get("max_day") || undefined,
    maxUserDay: formData.get("max_user_day") || undefined,
  });
  if (!parsed.success) return { error: "Valeurs invalides." };
  const v = parsed.data;
  const { error } = await (await createClient()).rpc("ai_configure", {
    p_agent: v.agent,
    p_enabled: v.enabled,
    p_budget: v.budget,
    p_max_day: v.maxDay as number,
    p_max_user_day: v.maxUserDay as number,
  });
  if (error) return { error: "Enregistrement impossible." };
  revalidatePath("/admin/ia");
  return { ok: true, message: "Réglages enregistrés." };
}

export async function requestReport(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const days = formData.get("days") === "30" ? 30 : 7;
  const r = await generateAnalystReport(admin.id, days);
  if (!r.ok) return { error: `Rapport non généré : ${r.reason}.` };
  redirect(`/admin/ia/rapports/${r.id}`);
}

export async function decideApproval(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  if (!z.uuid().safeParse(id).success) return { error: "Demande invalide." };
  const { error } = await (await createClient()).rpc("ai_approval_decide", {
    p_approval: id,
    p_approve: formData.get("decision") === "approve",
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/ia");
  return { ok: true, message: "Décision enregistrée." };
}

/** Réponse humaine à une conversation transférée : ajoutée à la conversation, qui est close (aucun envoi externe). */
export async function answerConversation(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const text = String(formData.get("answer") ?? "").trim().slice(0, 2000);
  if (!z.uuid().safeParse(id).success || text.length < 2) return { error: "Réponse vide." };
  // Lecture sous RLS : seules les conversations transférées sont visibles par l'équipe
  const { data: conv } = await (await createClient()).from("ai_conversations").select("id").eq("id", id).eq("status", "handed_off").maybeSingle();
  if (!conv) return { error: "Conversation introuvable." };
  const db = createAdminClient();
  await db.from("ai_messages").insert({ conversation_id: id, role: "notice", content: `Réponse de l'équipe Uny : ${text}` });
  await db.from("ai_conversations").update({ status: "closed", updated_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/admin/ia");
  return { ok: true, message: "Réponse ajoutée à la conversation." };
}
