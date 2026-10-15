"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUniversity } from "@/lib/university";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/actions/types";

const schema = z.object({
  title: z.string().trim().min(3, "3 caractères minimum").max(80),
  body: z.string().trim().min(3, "3 caractères minimum").max(500),
  audience: z.enum(["all", "verified"]),
  study_level: z.string().trim().max(40).optional(),
  faculty: z.string().trim().max(120).optional(),
});

export async function sendAnnouncement(_prev: FormState, formData: FormData): Promise<FormState> {
  const { university } = await requireUniversity();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fe = Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message]));
    return {
      error: "Vérifie les champs indiqués.",
      fieldErrors: fe,
      values: Object.fromEntries(formData) as Record<string, string>,
    };
  }
  const d = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("university_send_announcement", {
    p_university: university.id,
    p_title: d.title,
    p_body: d.body,
    p_audience: d.audience,
    p_level: d.study_level || undefined,
    p_faculty: d.faculty || undefined,
  });
  if (error) return { error: error.code === "P0001" ? error.message : "Envoi impossible. Réessaie." };
  revalidatePath("/universite/annonces");
  const n = data ?? 0;
  return {
    ok: true,
    message: n
      ? `Annonce envoyée à ${n} étudiant${n > 1 ? "s" : ""} ✅`
      : "Annonce enregistrée : aucun étudiant ne correspond pour le moment.",
  };
}

/** Demande aux étudiants qui ont choisi l'établissement d'envoyer leur matricule. */
export async function inviteDeclared(): Promise<{ message?: string; error?: string }> {
  const { university } = await requireUniversity();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("university_invite_declared", { p_university: university.id });
  if (error) return { error: error.code === "P0001" ? error.message : "Envoi impossible. Réessaie." };
  const n = data ?? 0;
  return {
    message: n
      ? `${n} étudiant${n > 1 ? "s ont" : " a"} reçu la demande. Leurs matricules arriveront dans « Demandes à traiter ».`
      : "Tous ces étudiants ont déjà été relancés cette semaine ou ont déjà envoyé leur demande.",
  };
}
