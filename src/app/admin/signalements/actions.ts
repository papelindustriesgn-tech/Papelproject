"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/actions/types";

/** Décision sur les signalements d'une annonce : classer (annonce conforme) ou retirer l'annonce (motif obligatoire). */
export async function moderateListing(itemId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const decision = String(formData.get("decision"));
  const note = String(formData.get("note") ?? "")
    .trim()
    .slice(0, 500);
  if (!z.uuid().safeParse(itemId).success || !["dismiss", "remove"].includes(decision)) return { error: "Demande invalide." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("moderate_listing", { p_item: itemId, p_decision: decision, p_note: note || undefined });
  if (error) return { error: error.code === "P0001" ? error.message : "Décision impossible. Réessaie." };
  revalidatePath("/admin/signalements");
  revalidatePath("/marketplace", "layout");
  return { ok: true, message: decision === "remove" ? "Annonce retirée, vendeur notifié." : "Signalements classés." };
}
