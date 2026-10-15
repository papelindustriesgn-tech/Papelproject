import type { Metadata } from "next";
import { PageTitle } from "@/components/ui/section-header";
import { FormMessage } from "@/components/ui/field";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SURVEY_MIN_VERSION } from "@/lib/survey";
import { SurveyForm, type SurveyValues } from "./survey-form";

export const metadata: Metadata = { title: "Ton avis" };

export default async function SurveyPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data: r } = await supabase.from("survey_responses").select("*").eq("user_id", profile.id).maybeSingle();

  const initial: SurveyValues = {
    understood: r?.understood ?? "",
    categories: r?.categories ?? [],
    would_use: r?.would_use ?? "",
    payment_pref: r?.payment_pref ?? "",
    missing: r?.missing ?? "",
    contact_ok: r?.contact_ok ?? false,
  };

  return (
    <div className="animate-fade-up mx-auto max-w-2xl space-y-5">
      <PageTitle
        title="Ton avis sur Uny 🙏"
        subtitle={`${profile.first_name}, 5 questions rapides (1 minute) pour nous aider à améliorer Uny. Réponses confidentielles.`}
      />
      {r &&
        (r.version < SURVEY_MIN_VERSION ? (
          <FormMessage type="info">Uny a évolué : 5 nouvelles questions rapides t&apos;attendent.</FormMessage>
        ) : (
          <FormMessage type="info">Tu as déjà répondu, merci ! Tu peux modifier tes réponses ci-dessous.</FormMessage>
        ))}
      <SurveyForm initial={initial} />
    </div>
  );
}
