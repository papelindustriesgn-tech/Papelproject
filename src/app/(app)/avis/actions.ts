"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { zodFieldErrors, type FormState } from "@/lib/actions/types";
import {
  BENEFIT_TYPES,
  SURVEY_BUDGET,
  SURVEY_CATEGORIES,
  SURVEY_MIN_DISCOUNT,
  SURVEY_PAYMENT,
  SURVEY_VERSION,
  type Option,
} from "@/lib/survey";

const values = (list: readonly Option[]) => list.map((o) => o.value) as [string, ...string[]];
const one = (list: readonly Option[]) => z.enum(values(list), { error: "Choisis une réponse" });

const schema = z.object({
  categories: z.array(z.enum(values(SURVEY_CATEGORIES))).min(1, "Choisis au moins un domaine"),
  benefit_types: z.array(z.enum(values(BENEFIT_TYPES))).min(1, "Choisis au moins un type d'avantage"),
  min_discount: one(SURVEY_MIN_DISCOUNT),
  monthly_budget: one(SURVEY_BUDGET),
  payment_pref: one(SURVEY_PAYMENT),
  missing: z.string().trim().max(1000, "1 000 caractères maximum"),
  partners: z.string().trim().max(500, "500 caractères maximum"),
});

export async function submitSurvey(_prev: FormState, formData: FormData): Promise<FormState> {
  const str = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" && v !== "" ? v : undefined;
  };
  const parsed = schema.safeParse({
    categories: formData.getAll("categories"),
    benefit_types: formData.getAll("benefit_types"),
    min_discount: str("min_discount"),
    monthly_budget: str("monthly_budget"),
    payment_pref: str("payment_pref"),
    missing: formData.get("missing") ?? "",
    partners: formData.get("partners") ?? "",
  });
  if (!parsed.success) return { error: "Il manque quelques réponses.", fieldErrors: zodFieldErrors(parsed.error.issues) };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Session expirée." };

  const d = parsed.data;
  const { error } = await supabase.from("survey_responses").upsert({
    user_id: auth.user.id,
    version: SURVEY_VERSION,
    categories: d.categories,
    benefit_types: d.benefit_types,
    min_discount: d.min_discount,
    monthly_budget: d.monthly_budget,
    payment_pref: d.payment_pref,
    missing: d.missing || null,
    partners: d.partners || null,
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
