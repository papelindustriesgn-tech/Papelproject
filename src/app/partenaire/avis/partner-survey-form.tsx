"use client";

import { useActionState, useState } from "react";
import { FormMessage, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { MultiChoice, ProjectIntro, Question, SingleChoice, ThankYou } from "@/components/survey/questions";
import { BENEFIT_TYPES, PARTNER_DISCOUNT, PARTNER_EXPECTATIONS, SURVEY_UNDERSTOOD } from "@/lib/survey";
import { submitPartnerSurvey } from "./actions";

export type PartnerSurveyValues = {
  understood: string;
  offer_types: string[];
  discount_range: string;
  expectations: string[];
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
      <ProjectIntro
        title="Uny en 3 points"
        steps={[
          { emoji: "🎓", text: "Les étudiants vérifiés trouvent votre offre dans l'app Uny." },
          { emoji: "🎟️", text: "Ils viennent avec un code promo : vous le validez en 2 secondes dans « Scanner »." },
          { emoji: "🟠", text: "Ils vous paient directement sur votre code marchand Orange Money. Gratuit pour vous." },
        ]}
      />
      {state.error && <FormMessage>{state.error}</FormMessage>}

      <Question n={1} title="C'est clair pour vous, comment Uny vous amène des clients ?" error={err.understood}>
        <SingleChoice name="understood" options={SURVEY_UNDERSTOOD} value={v.understood} onChange={(x) => set("understood", x)} />
      </Question>

      <Question
        n={2}
        title="Quel avantage pouvez-vous offrir aux étudiants ?"
        hint="Plusieurs choix possibles."
        error={err.offer_types}
      >
        <MultiChoice name="offer_types" options={BENEFIT_TYPES} value={v.offer_types} onChange={(x) => set("offer_types", x)} />
      </Question>

      <Question n={3} title="Quelle réduction pouvez-vous accorder ?" error={err.discount_range}>
        <SingleChoice
          name="discount_range"
          options={PARTNER_DISCOUNT}
          value={v.discount_range}
          onChange={(x) => set("discount_range", x)}
        />
      </Question>

      <Question n={4} title="Qu'attendez-vous d'Uny en priorité ?" hint="Plusieurs choix possibles." error={err.expectations}>
        <MultiChoice
          name="expectations"
          options={PARTNER_EXPECTATIONS}
          value={v.expectations}
          onChange={(x) => set("expectations", x)}
        />
      </Question>

      <Question
        n={5}
        title="Une idée pour améliorer Uny ?"
        hint="Facultatif : un besoin, une question, une remarque…"
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
