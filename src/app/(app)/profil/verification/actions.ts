"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formValues, zodFieldErrors, type FormState } from "@/lib/actions/types";
import { runVerificationEngine } from "@/lib/verification/engine";
import { hasMatchSecret, matchHash } from "@/lib/verification/hash";
import { normalizeNumber } from "@/lib/verification/normalize";
import { maskCandidate, officialBacProvider } from "@/lib/verification/bac";

const enrollmentSchema = z.object({
  university_id: z.coerce.number().int().positive("Choisis ton établissement"),
  student_number: z
    .string()
    .trim()
    .min(2, "Matricule requis")
    .max(40)
    .regex(/[0-9A-Za-z]/, "Matricule invalide"),
  faculty: z.string().trim().max(120).optional(),
  department: z.string().trim().max(120).optional(),
  program: z.string().trim().min(2, "Filière requise").max(120),
  study_level: z.string().trim().min(1, "Niveau requis").max(40),
});

/** Demande de confirmation d'inscription auprès d'une université partenaire, puis vérification automatique. */
export async function submitEnrollment(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = enrollmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return {
      error: "Vérifie les champs indiqués.",
      fieldErrors: zodFieldErrors(parsed.error.issues),
      values: formValues(formData),
    };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Session expirée." };
  const d = parsed.data;
  const { data: e, error } = await supabase.rpc("submit_enrollment", {
    p_university: d.university_id,
    p_student_number: d.student_number,
    p_faculty: d.faculty,
    p_department: d.department,
    p_program: d.program,
    p_study_level: d.study_level,
  });
  if (error)
    return { error: error.code === "P0001" ? error.message : "Envoi impossible, réessaie.", values: formValues(formData) };

  const outcome = await runVerificationEngine(e.id);
  revalidatePath("/", "layout");
  if (outcome.status === "verified")
    return {
      ok: true,
      message: "Inscription confirmée automatiquement ✅ Ta carte Uny est activée aux couleurs de ton université.",
    };
  if (outcome.status === "manual_review")
    return { ok: true, message: "Demande envoyée. Certaines informations doivent être vérifiées par ton université." };
  return { ok: true, message: "Demande envoyée à ton université. Tu seras notifié dès sa réponse." };
}

const bacSchema = z.object({
  exam_year: z.coerce.number().int().min(1990, "Année invalide").max(new Date().getFullYear(), "Année invalide"),
  candidate_number: z
    .string()
    .trim()
    .min(4, "Numéro de candidat requis")
    .max(30)
    .regex(/^[0-9A-Za-z /-]+$/, "Numéro invalide"),
  document_path: z.string().min(10, "Ajoute ton relevé ou attestation de réussite"),
});

/**
 * Vérification du BAC. Aucune source officielle n'étant raccordée, la demande est examinée par Uny
 * à partir du relevé (supprimé après décision). Seule une preuve minimale est conservée.
 */
export async function submitBac(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = bacSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return {
      error: parsed.error.issues[0].message,
      fieldErrors: zodFieldErrors(parsed.error.issues),
      values: formValues(formData),
    };
  if (!hasMatchSecret()) return { error: "Service momentanément indisponible." };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Session expirée." };
  const d = parsed.data;
  if (!d.document_path.startsWith(`${auth.user.id}/bac-`)) return { error: "Document invalide." };

  const number = normalizeNumber(d.candidate_number);
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("bac_verifications")
    .select("status, document_path")
    .eq("user_id", auth.user.id)
    .eq("exam_year", d.exam_year)
    .maybeSingle();
  if (existing && ["verified", "manual_review", "pending"].includes(existing.status))
    return { error: existing.status === "verified" ? "Ton BAC est déjà vérifié." : "Une demande est déjà en cours d'examen." };
  if (existing?.document_path) await admin.storage.from("verification-docs").remove([existing.document_path]);

  const { error } = await admin.from("bac_verifications").upsert(
    {
      user_id: auth.user.id,
      exam_year: d.exam_year,
      candidate_ref: maskCandidate(number),
      candidate_hash: matchHash("bac_candidate", `${d.exam_year}:${number}`),
      provider: officialBacProvider.isConnected() ? "official_api" : "manual",
      method: "document",
      status: "manual_review",
      document_path: d.document_path,
      rejection_reason: null,
      reviewed_by: null,
      reviewed_at: null,
      result: null,
    },
    { onConflict: "user_id,exam_year" },
  );
  if (error) return { error: "Envoi impossible, réessaie." };
  await admin.from("audit_log").insert({
    actor_id: auth.user.id,
    subject_id: auth.user.id,
    action: "bac.submitted",
    details: { exam_year: d.exam_year, provider: "manual" },
  });
  revalidatePath("/profil/verification");
  return {
    ok: true,
    message: "Relevé envoyé ✅ L'équipe Uny le vérifie puis le supprime ; seule la preuve de vérification est gardée.",
  };
}
