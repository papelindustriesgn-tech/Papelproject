"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/actions/types";

const schema = z.object({
  job_id: z.uuid(),
  message: z.string().trim().min(10, "Écris au moins quelques mots (10 caractères).").max(2000, "2000 caractères maximum."),
});

export async function applyToJob(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: { message: parsed.error.issues[0].message }, values: { message: String(formData.get("message") ?? "") } };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Connecte-toi pour candidater." };

  const { data: job } = await supabase.from("jobs").select("id, is_demo, deadline").eq("id", parsed.data.job_id).single();
  if (!job) return { error: "Annonce introuvable." };
  if (job.deadline && new Date(`${job.deadline}T23:59:59`) < new Date()) return { error: "Les candidatures sont closes." };

  const { error } = await supabase.from("job_applications").insert({ job_id: job.id, user_id: auth.user.id, message: parsed.data.message });
  if (error) {
    if (error.code === "23505") return { error: "Tu as déjà candidaté à cette offre." };
    return { error: "Envoi impossible, réessaie." };
  }
  revalidatePath(`/jobs/${job.id}`);
  return { ok: true, message: "Candidature envoyée ! Ton profil Uny est transmis avec ton message." };
}

export async function withdrawApplication(jobId: string) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user || !z.uuid().safeParse(jobId).success) return;
  await supabase.from("job_applications").delete().match({ job_id: jobId, user_id: auth.user.id });
  revalidatePath(`/jobs/${jobId}`);
}
