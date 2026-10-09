"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePartner } from "@/lib/partner";
import { zodFieldErrors, type FormState } from "@/lib/actions/types";
import {
  BENEFIT_TYPES,
  PARTNER_DISCOUNT,
  PARTNER_EXPECTATIONS,
  PARTNER_EXPECTED_STUDENTS,
  PARTNER_PAYMENT_METHODS,
  SURVEY_WOULD_PAY,
  type Option,
} from "@/lib/survey";

const values = (list: readonly Option[]) => list.map((o) => o.value) as [string, ...string[]];
const one = (list: readonly Option[]) => z.enum(values(list), { error: "Choisissez une réponse" });

const schema = z.object({
  offer_types: z.array(z.enum(values(BENEFIT_TYPES))).min(1, "Choisissez au moins un avantage"),
  discount_range: one(PARTNER_DISCOUNT),
  expectations: z.array(z.enum(values(PARTNER_EXPECTATIONS))).min(1, "Choisissez au moins une attente"),
  expected_students: one(PARTNER_EXPECTED_STUDENTS),
  payment_methods: z.array(z.enum(values(PARTNER_PAYMENT_METHODS))).min(1, "Choisissez au moins un moyen de paiement"),
  would_pay: one(SURVEY_WOULD_PAY),
  comments: z.string().trim().max(1000, "1 000 caractères maximum"),
});

export async function submitPartnerSurvey(_prev: FormState, formData: FormData): Promise<FormState> {
  const { profile, partner } = await requirePartner();
  const str = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" && v !== "" ? v : undefined;
  };
  const parsed = schema.safeParse({
    offer_types: formData.getAll("offer_types"),
    discount_range: str("discount_range"),
    expectations: formData.getAll("expectations"),
    expected_students: str("expected_students"),
    payment_methods: formData.getAll("payment_methods"),
    would_pay: str("would_pay"),
    comments: formData.get("comments") ?? "",
  });
  if (!parsed.success) return { error: "Il manque quelques réponses.", fieldErrors: zodFieldErrors(parsed.error.issues) };

  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("partner_survey_responses").upsert({
    partner_id: partner.id,
    answered_by: profile.id,
    offer_types: d.offer_types,
    discount_range: d.discount_range,
    expectations: d.expectations,
    expected_students: d.expected_students,
    payment_methods: d.payment_methods,
    would_pay: d.would_pay,
    comments: d.comments || null,
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: "Envoi impossible pour le moment. Réessayez." };
  revalidatePath("/partenaire", "layout");
  revalidatePath("/admin/avis");
  return { ok: true };
}
