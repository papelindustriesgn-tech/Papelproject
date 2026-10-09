"use client";

import { useActionState, useState } from "react";
import { FormMessage, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { MultiChoice, Question, SingleChoice, ThankYou } from "@/components/survey/questions";
import {
  BENEFIT_TYPES,
  PARTNER_DISCOUNT,
  PARTNER_EXPECTATIONS,
  PARTNER_EXPECTED_STUDENTS,
  PARTNER_PAYMENT_METHODS,
  SURVEY_WOULD_PAY,
} from "@/lib/survey";
import { submitPartnerSurvey } from "./actions";

export type PartnerSurveyValues = {
  offer_types: string[];
  discount_range: string;
  expectations: string[];
  expected_students: string;
  payment_methods: string[];
  would_pay: string;
  comments: string;
};

export function PartnerSurveyForm({ initial }: { initial: PartnerSurveyValues }) {
  const [state, action] = useActionState(submitPartnerSurvey, {});
  const [v, setV] = useState(initial);
  const set = <K extends keyof PartnerSurveyValues>(k: K, val: PartnerSurveyValues[K]) => setV((p) => ({ ...p, [k]: val }));
  const err = state.fieldErrors ?? {};

  if (state.ok)
    return (
      <ThankYou
        text="Vos réponses nous aident à vous amener les bons clients étudiants."
        href="/partenaire"
        cta="Retour au tableau de bord"
      />
    );

  return (
    <form action={action} className="space-y-4" noValidate>
      {state.error && <FormMessage>{state.error}</FormMessage>}

      <Question
        n={1}
        title="Quels avantages êtes-vous prêt à offrir aux étudiants ?"
        hint="Plusieurs choix possibles."
        error={err.offer_types}
      >
        <MultiChoice name="offer_types" options={BENEFIT_TYPES} value={v.offer_types} onChange={(x) => set("offer_types", x)} />
      </Question>

      <Question n={2} title="Quelle réduction pouvez-vous accorder aux étudiants ?" error={err.discount_range}>
        <SingleChoice
          name="discount_range"
          options={PARTNER_DISCOUNT}
          value={v.discount_range}
          onChange={(x) => set("discount_range", x)}
        />
      </Question>

      <Question n={3} title="Qu'attendez-vous d'Uny en priorité ?" hint="Plusieurs choix possibles." error={err.expectations}>
        <MultiChoice
          name="expectations"
          options={PARTNER_EXPECTATIONS}
          value={v.expectations}
          onChange={(x) => set("expectations", x)}
        />
      </Question>

      <Question n={4} title="Combien de nouveaux clients étudiants espérez-vous par mois ?" error={err.expected_students}>
        <SingleChoice
          name="expected_students"
          options={PARTNER_EXPECTED_STUDENTS}
          value={v.expected_students}
          onChange={(x) => set("expected_students", x)}
        />
      </Question>

      <Question
        n={5}
        title="Quels moyens de paiement acceptez-vous ?"
        hint="Plusieurs choix possibles."
        error={err.payment_methods}
      >
        <MultiChoice
          name="payment_methods"
          options={PARTNER_PAYMENT_METHODS}
          value={v.payment_methods}
          onChange={(x) => set("payment_methods", x)}
        />
      </Question>

      <Question
        n={6}
        title="Seriez-vous prêt à payer pour être mis en avant auprès des étudiants ?"
        hint="Uny est gratuit pendant le lancement. La mise en avant serait une option."
        error={err.would_pay}
      >
        <SingleChoice name="would_pay" options={SURVEY_WOULD_PAY} value={v.would_pay} onChange={(x) => set("would_pay", x)} />
      </Question>

      <Question
        n={7}
        title="Autre chose que vous attendez d'Uny ?"
        hint="Facultatif : une idée, un besoin, une remarque…"
        error={err.comments}
      >
        <Textarea
          name="comments"
          rows={3}
          maxLength={1000}
          value={v.comments}
          onChange={(e) => set("comments", e.target.value)}
          placeholder="Ex. : faire venir les étudiants le midi en semaine"
        />
      </Question>

      <SubmitButton className="w-full" pendingLabel="Envoi…">
        Envoyer mes réponses
      </SubmitButton>
    </form>
  );
}
