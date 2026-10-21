"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/actions/types";

const REASONS = ["scam", "prohibited", "offensive", "spam", "wrong_info", "other"] as const;

export async function reportListing(itemId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireProfile();
  const parsed = z
    .object({
      reason: z.enum(REASONS),
      details: z.string().trim().max(500).optional(),
    })
    .safeParse({ reason: formData.get("reason"), details: formData.get("details") ?? undefined });
  if (!z.uuid().safeParse(itemId).success || !parsed.success) return { error: "Choisis un motif." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("report_listing", {
    p_item: itemId,
    p_reason: parsed.data.reason,
    p_details: parsed.data.details || undefined,
  });
  if (error) return { error: error.code === "P0001" ? error.message : "Signalement impossible. Réessaie." };
  return { ok: true, message: "Merci, l'équipe Uny va examiner cette annonce." };
}

export async function blockUser(userId: string): Promise<{ error?: string }> {
  const profile = await requireProfile();
  if (!z.uuid().safeParse(userId).success || userId === profile.id) return { error: "Action impossible." };
  const supabase = await createClient();
  const { error } = await supabase.from("user_blocks").upsert({ blocker_id: profile.id, blocked_id: userId });
  if (error) return { error: "Blocage impossible. Réessaie." };
  revalidatePath("/marketplace", "layout");
  // L'annonce du vendeur bloqué n'est plus accessible : retour à la marketplace avec une confirmation
  redirect("/marketplace?bloque=1");
}

export async function unblockUser(userId: string): Promise<{ error?: string }> {
  const profile = await requireProfile();
  if (!z.uuid().safeParse(userId).success) return { error: "Action impossible." };
  const supabase = await createClient();
  await supabase.from("user_blocks").delete().eq("blocker_id", profile.id).eq("blocked_id", userId);
  revalidatePath("/marketplace", "layout");
  return {};
}
