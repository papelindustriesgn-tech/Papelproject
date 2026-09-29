"use server";

import { revalidatePath, updateTag } from "next/cache";
import { CONTENT_TAG } from "@/lib/queries";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { sendEmail, verificationApprovedEmail, verificationRejectedEmail } from "@/lib/email";
import type { FormState } from "@/lib/actions/types";

export async function reviewVerification(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = z.uuid().safeParse(formData.get("id"));
  const decision = formData.get("decision");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);
  if (!id.success || (decision !== "approve" && decision !== "reject")) return { error: "Requête invalide." };
  if (decision === "reject" && reason.length < 3) return { error: "Indique un motif de refus (visible par l'étudiant)." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("review_verification", {
    p_verification_id: id.data,
    p_approve: decision === "approve",
    p_reason: decision === "reject" ? reason : undefined,
  });
  if (error || !data) return { error: error?.message ?? "Action impossible." };

  const { data: profile } = await supabase.from("profiles").select("email, first_name, uny_id").eq("id", data.user_id).single();
  if (profile?.email) {
    const mail = decision === "approve" ? verificationApprovedEmail(profile.first_name, profile.uny_id) : verificationRejectedEmail(profile.first_name, reason);
    after(() => sendEmail({ to: profile.email!, ...mail }));
  }
  updateTag(CONTENT_TAG);
  revalidatePath("/admin", "layout");
  const who = encodeURIComponent(`${profile?.first_name ?? ""}`.trim());
  redirect(`/admin/verifications?traite=${decision}&nom=${who}`);
}

export async function setUserVerification(userId: string, status: "unverified" | "pending" | "verified") {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.rpc("admin_set_verification", { p_user_id: userId, p_status: status });
  updateTag(CONTENT_TAG);
  revalidatePath(`/admin/utilisateurs/${userId}`);
}

export async function setUserRole(userId: string, role: "student" | "admin") {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.rpc("admin_set_role", { p_user_id: userId, p_role: role });
  updateTag(CONTENT_TAG);
  revalidatePath(`/admin/utilisateurs/${userId}`);
}

export async function moderateItem(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = z.uuid().safeParse(formData.get("id"));
  const action = String(formData.get("action"));
  const note = String(formData.get("note") ?? "").trim().slice(0, 300) || null;
  if (!id.success) return { error: "Requête invalide." };
  const supabase = await createClient();
  if (action === "delete") {
    const { data: imgs } = await supabase.from("marketplace_images").select("storage_path").eq("item_id", id.data);
    await supabase.from("marketplace_items").delete().eq("id", id.data);
    const paths = (imgs ?? []).map((i) => i.storage_path).filter((p): p is string => !!p);
    if (paths.length) await supabase.storage.from("marketplace").remove(paths);
  } else if (action === "remove") {
    await supabase.from("marketplace_items").update({ status: "removed", moderation_note: note }).eq("id", id.data);
  } else if (action === "restore") {
    await supabase.from("marketplace_items").update({ status: "active", moderation_note: null }).eq("id", id.data);
  } else return { error: "Action inconnue." };
  updateTag(CONTENT_TAG);
  revalidatePath("/admin/marketplace");
  revalidatePath("/marketplace");
  return { ok: true };
}

/** Supprime tout le contenu de démonstration (à faire avant le lancement public avec de vrais partenaires). */
export async function deleteDemoContent(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  if (formData.get("confirm") !== "SUPPRIMER") return { error: "Tape SUPPRIMER pour confirmer." };
  const supabase = await createClient();
  const results = await Promise.all([
    supabase.from("marketplace_items").delete().eq("is_demo", true),
    supabase.from("housing").delete().eq("is_demo", true),
    supabase.from("jobs").delete().eq("is_demo", true),
    supabase.from("deals").delete().eq("is_demo", true),
  ]);
  const { error } = await supabase.from("partners").delete().eq("is_demo", true);
  if (error || results.some((r) => r.error)) return { error: "Suppression partielle, réessaie." };
  updateTag(CONTENT_TAG);
  revalidatePath("/", "layout");
  return { ok: true, message: "Contenu de démonstration supprimé." };
}
