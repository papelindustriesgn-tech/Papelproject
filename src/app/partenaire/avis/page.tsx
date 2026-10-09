import { FormMessage } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/server";
import { requirePartner } from "@/lib/partner";
import { PartnerSurveyForm, type PartnerSurveyValues } from "./partner-survey-form";

export const metadata = { title: "Vos attentes" };

export default async function PartnerSurveyPage() {
  const { partner } = await requirePartner();
  const supabase = await createClient();
  const { data: r } = await supabase.from("partner_survey_responses").select("*").eq("partner_id", partner.id).maybeSingle();

  const initial: PartnerSurveyValues = {
    offer_types: r?.offer_types ?? [],
    discount_range: r?.discount_range ?? "",
    expectations: r?.expectations ?? [],
    expected_students: r?.expected_students ?? "",
    payment_methods: r?.payment_methods ?? [],
    would_pay: r?.would_pay ?? "",
    comments: r?.comments ?? "",
  };

  return (
    <div className="animate-fade-up mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Vos attentes 🤝</h1>
        <p className="text-muted text-sm">
          2 minutes pour nous dire ce que {partner.name} peut offrir aux étudiants et ce que vous attendez d&apos;Uny.
        </p>
      </div>
      {r && <FormMessage type="info">Vous avez déjà répondu, merci ! Vous pouvez modifier vos réponses.</FormMessage>}
      <PartnerSurveyForm initial={initial} />
    </div>
  );
}
