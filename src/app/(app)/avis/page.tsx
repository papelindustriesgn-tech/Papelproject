import type { Metadata } from "next";
import { PageTitle } from "@/components/ui/section-header";
import { FormMessage } from "@/components/ui/field";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SurveyForm, type SurveyValues } from "./survey-form";

export const metadata: Metadata = { title: "Ton avis" };

export default async function SurveyPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data: r } = await supabase.from("survey_responses").select("*").eq("user_id", profile.id).maybeSingle();

  const initial: SurveyValues = {
    source: r?.source ?? "",
    rating: r?.rating ?? 0,
    modules: r?.modules ?? [],
    nps: r?.nps ?? null,
    would_pay: r?.would_pay ?? "",
    missing: r?.missing ?? "",
    partners: r?.partners ?? "",
    contact_ok: r?.contact_ok ?? false,
  };

  return (
    <div className="animate-fade-up mx-auto max-w-2xl space-y-5">
      <PageTitle
        title="Ton avis sur Uny 🙏"
        subtitle={`${profile.first_name}, 2 minutes pour nous dire ce que tu penses du projet. Tes réponses restent confidentielles et servent uniquement à améliorer Uny.`}
      />
      {r && <FormMessage type="info">Tu as déjà répondu, merci ! Tu peux modifier tes réponses ci-dessous.</FormMessage>}
      <SurveyForm initial={initial} />
    </div>
  );
}
