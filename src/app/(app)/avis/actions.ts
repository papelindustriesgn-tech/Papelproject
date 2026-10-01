"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { zodFieldErrors, type FormState } from "@/lib/actions/types";
import { SURVEY_MODULES, SURVEY_SOURCES, SURVEY_WOULD_PAY } from "@/lib/survey";

const values = <T extends readonly { value: string }[]>(list: T) =>
  list.map((o) => o.value) as [T[number]["value"], ...T[number]["value"][]];

const schema = z.object({
  source: z.enum(values(SURVEY_SOURCES), { error: "Choisis une réponse" }),
  rating: z.coerce.number({ error: "Donne une note" }).int().min(1, "Donne une note").max(5),
  modules: z.array(z.enum(values(SURVEY_MODULES))).min(1, "Choisis au moins un service"),
  nps: z.coerce.number({ error: "Choisis une note" }).int().min(0).max(10),
  would_pay: z.enum(values(SURVEY_WOULD_PAY), { error: "Choisis une réponse" }),
  missing: z.string().trim().max(1000, "1 000 caractères maximum"),
  partners: z.string().trim().max(500, "500 caractères maximum"),
});

export async function submitSurvey(_prev: FormState, formData: FormData): Promise<FormState> {
  const str = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" && v !== "" ? v : undefined;
  };
  const parsed = schema.safeParse({
    source: str("source"),
    rating: str("rating"),
    modules: formData.getAll("modules"),
    nps: str("nps"),
    would_pay: str("would_pay"),
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
    source: d.source,
    rating: d.rating,
    modules: d.modules,
    nps: d.nps,
    would_pay: d.would_pay,
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
