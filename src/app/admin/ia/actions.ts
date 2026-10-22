"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
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

/**
 * Réponse humaine à une conversation transférée : enregistrée puis notifiée dans l'application (lien vers Aide).
 * La clé de requête du formulaire évite tout doublon en cas de nouvelle tentative ; si la notification échoue,
 * la réponse est conservée et la notification peut être renvoyée.
 */
export async function answerConversation(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const text = String(formData.get("answer") ?? "").trim().slice(0, 2000);
  const requestId = String(formData.get("request_id") ?? "");
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(requestId).success) return { error: "Demande invalide." };
  if (text.length < 2) return { error: "Réponse vide." };
  const { data, error } = await (await createClient()).rpc("support_answer", {
    p_conversation: id,
    p_answer: text,
    p_request_id: requestId,
  });
  if (error) return { error: error.code === "P0001" || error.code === "P0002" ? error.message : "Réponse non enregistrée, réessayez." };
  revalidatePath("/admin/ia");
  const r = data as { notified: boolean; duplicate: boolean };
  if (!r.notified) return { ok: true, message: "Réponse enregistrée. ⚠ Notification non envoyée : utilisez « Renvoyer la notification »." };
  return { ok: true, message: r.duplicate ? "Réponse déjà enregistrée (aucun doublon)." : "Réponse enregistrée et notifiée à l'utilisateur." };
}

export async function retrySupportNotification(id: string, _prev: FormState): Promise<FormState> {
  await requireAdmin();
  if (!z.uuid().safeParse(id).success) return { error: "Demande invalide." };
  const { data, error } = await (await createClient()).rpc("support_retry_notification", { p_conversation: id });
  if (error || !data) return { error: "Notification toujours impossible." };
  revalidatePath("/admin/ia");
  return { ok: true, message: "Notification envoyée." };
}
