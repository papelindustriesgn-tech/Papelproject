import type { Metadata } from "next";
import { PageTitle } from "@/components/ui/section-header";
import { FormMessage } from "@/components/ui/field";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SURVEY_VERSION } from "@/lib/survey";
import { SurveyForm, type SurveyValues } from "./survey-form";

export const metadata: Metadata = { title: "Ton avis" };

export default async function SurveyPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data: r } = await supabase.from("survey_responses").select("*").eq("user_id", profile.id).maybeSingle();

  const initial: SurveyValues = {
    categories: r?.categories ?? [],
    benefit_types: r?.benefit_types ?? [],
    min_discount: r?.min_discount ?? "",
    monthly_budget: r?.monthly_budget ?? "",
    payment_pref: r?.payment_pref ?? "",
    missing: r?.missing ?? "",
    partners: r?.partners ?? "",
    contact_ok: r?.contact_ok ?? false,
  };

  return (
    <div className="animate-fade-up mx-auto max-w-2xl space-y-5">
      <PageTitle
        title="Ton avis sur Uny 🙏"
        subtitle={`${profile.first_name}, dis-nous quels avantages tu attends : on démarche les commerçants en fonction de tes réponses. 2 minutes, réponses confidentielles.`}
      />
      {r &&
        (r.version < SURVEY_VERSION ? (
          <FormMessage type="info">
            Nouveau questionnaire : dis-nous quels avantages tu attends, on négocie avec les commerçants en fonction de tes
            réponses.
          </FormMessage>
        ) : (
          <FormMessage type="info">Tu as déjà répondu, merci ! Tu peux modifier tes réponses ci-dessous.</FormMessage>
        ))}
      <SurveyForm initial={initial} />
    </div>
  );
}
