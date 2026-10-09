"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { zodFieldErrors, type FormState } from "@/lib/actions/types";
import {
  SURVEY_CATEGORIES,
  SURVEY_PAYMENT,
  SURVEY_UNDERSTOOD,
  SURVEY_VERSION,
  SURVEY_WOULD_USE,
  type Option,
} from "@/lib/survey";

const values = (list: readonly Option[]) => list.map((o) => o.value) as [string, ...string[]];
const one = (list: readonly Option[]) => z.enum(values(list), { error: "Choisis une réponse" });

const schema = z.object({
  understood: one(SURVEY_UNDERSTOOD),
  categories: z.array(z.enum(values(SURVEY_CATEGORIES))).min(1, "Choisis au moins un domaine"),
  would_use: one(SURVEY_WOULD_USE),
  payment_pref: one(SURVEY_PAYMENT),
  missing: z.string().trim().max(1000, "1 000 caractères maximum"),
});

export async function submitSurvey(_prev: FormState, formData: FormData): Promise<FormState> {
  const str = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" && v !== "" ? v : undefined;
  };
  const parsed = schema.safeParse({
    understood: str("understood"),
    categories: formData.getAll("categories"),
    would_use: str("would_use"),
    payment_pref: str("payment_pref"),
    missing: formData.get("missing") ?? "",
  });
  if (!parsed.success) return { error: "Il manque quelques réponses.", fieldErrors: zodFieldErrors(parsed.error.issues) };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Session expirée." };

  const d = parsed.data;
  const { error } = await supabase.from("survey_responses").upsert({
    user_id: auth.user.id,
    version: SURVEY_VERSION,
    understood: d.understood,
    categories: d.categories,
    would_use: d.would_use,
    payment_pref: d.payment_pref,
    missing: d.missing || null,
    contact_ok: formData.get("contact_ok") === "on",
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: "Envoi impossible pour le moment. Réessaie." };

  // L'invitation n'a plus lieu d'être : on la marque comme lue.
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", auth.user.id)
    .eq("type", "survey")
    .is("read_at", null);

  revalidatePath("/accueil");
  revalidatePath("/admin/avis");
  return { ok: true, message: "Merci ! Ton avis a bien été envoyé 💜" };
}
