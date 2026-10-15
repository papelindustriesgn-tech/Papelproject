"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type ReviewState = { ok?: boolean; message?: string; error?: string };

const schema = z.object({
  ids: z.array(z.uuid()).min(1, "Sélectionne au moins un compte").max(1000),
  decision: z.enum(["approved", "rejected", "pending"]),
  note: z.string().trim().max(300),
});

export async function reviewSignups(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  await requireAdmin();
  const parsed = schema.safeParse({
    ids: formData.getAll("ids"),
    decision: formData.get("decision"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Sélection invalide" };
  const { ids, decision, note } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("review_signups", { p_ids: ids, p_decision: decision, p_note: note || undefined });
  if (error) return { error: "Décision impossible. Réessaie." };
  revalidatePath("/admin", "layout");
  const n = data ?? 0;
  const verb = decision === "approved" ? "validé" : decision === "rejected" ? "refusé" : "remis en attente";
  return { ok: true, message: `${n} compte${n > 1 ? "s" : ""} ${verb}${n > 1 ? "s" : ""} ✅` };
}
