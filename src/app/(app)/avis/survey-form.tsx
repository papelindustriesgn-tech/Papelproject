"use client";

import { useActionState, useState } from "react";
import { FormMessage, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { MultiChoice, Question, SingleChoice, ThankYou } from "@/components/survey/questions";
import { BENEFIT_TYPES, SURVEY_BUDGET, SURVEY_CATEGORIES, SURVEY_MIN_DISCOUNT, SURVEY_PAYMENT } from "@/lib/survey";
import { submitSurvey } from "./actions";

export type SurveyValues = {
  categories: string[];
  benefit_types: string[];
  min_discount: string;
  monthly_budget: string;
  payment_pref: string;
  missing: string;
  partners: string;
  contact_ok: boolean;
};

export function SurveyForm({ initial }: { initial: SurveyValues }) {
  const [state, action] = useActionState(submitSurvey, {});
  const [v, setV] = useState(initial);
  const set = <K extends keyof SurveyValues>(k: K, val: SurveyValues[K]) => setV((p) => ({ ...p, [k]: val }));
  const err = state.fieldErrors ?? {};

  if (state.ok)
    return (
      <ThankYou
        text="Tes réponses nous disent quels commerçants démarcher et quels avantages négocier pour toi."
        href="/accueil"
        cta="Retour à l'accueil"
      />
    );

  return (
    <form action={action} className="space-y-4" noValidate>
      {state.error && <FormMessage>{state.error}</FormMessage>}

      <Question n={1} title="Où veux-tu des réductions en priorité ?" hint="Plusieurs choix possibles." error={err.categories}>
        <MultiChoice name="categories" options={SURVEY_CATEGORIES} value={v.categories} onChange={(x) => set("categories", x)} />
      </Question>

      <Question n={2} title="Quels types d'avantages préfères-tu ?" hint="Plusieurs choix possibles." error={err.benefit_types}>
        <MultiChoice
          name="benefit_types"
          options={BENEFIT_TYPES}
          value={v.benefit_types}
          onChange={(x) => set("benefit_types", x)}
        />
      </Question>

      <Question n={3} title="À partir de quelle réduction changerais-tu de commerce ?" error={err.min_discount}>
        <SingleChoice
          name="min_discount"
          options={SURVEY_MIN_DISCOUNT}
          value={v.min_discount}
          onChange={(x) => set("min_discount", x)}
        />
      </Question>

      <Question
        n={4}
        title="Combien dépenses-tu par mois en repas, sorties, transport et internet ?"
        hint="Une estimation suffit : ça nous aide à négocier les bonnes offres."
        error={err.monthly_budget}
      >
        <SingleChoice
          name="monthly_budget"
          options={SURVEY_BUDGET}
          value={v.monthly_budget}
          onChange={(x) => set("monthly_budget", x)}
        />
      </Question>

      <Question n={5} title="Comment préfères-tu payer chez les partenaires ?" error={err.payment_pref}>
        <SingleChoice
          name="payment_pref"
          options={SURVEY_PAYMENT}
          value={v.payment_pref}
          onChange={(x) => set("payment_pref", x)}
        />
      </Question>

      <Question
        n={6}
        title="Quelles enseignes aimerais-tu voir sur Uny ?"
        hint="Facultatif : restaurants, boutiques, salles de sport, opérateurs…"
        error={err.partners}
      >
        <Textarea
          name="partners"
          rows={2}
          maxLength={500}
          value={v.partners}
          onChange={(e) => set("partners", e.target.value)}
          placeholder="Ex. : un fast-food près de l'université, une salle de sport à Kipé"
        />
      </Question>

      <Question
        n={7}
        title="Un avantage que tu aimerais vraiment avoir ?"
        hint="Facultatif : une idée, une envie…"
        error={err.missing}
      >
        <Textarea
          name="missing"
          rows={3}
          maxLength={1000}
          value={v.missing}
          onChange={(e) => set("missing", e.target.value)}
          placeholder="Ex. : -30 % sur les forfaits internet"
        />
      </Question>

      <label className="flex items-start gap-3 rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <input
          type="checkbox"
          name="contact_ok"
          checked={v.contact_ok}
          onChange={(e) => set("contact_ok", e.target.checked)}
          className="accent-brand-600 mt-1 size-5 shrink-0"
        />
        <span>
          <span className="block font-semibold">J&apos;accepte d&apos;être contacté(e) pour en parler</span>
          <span className="text-muted block text-sm">Par l&apos;équipe Uny, sur le téléphone ou l&apos;email de ton compte.</span>
        </span>
      </label>

      <SubmitButton className="w-full" pendingLabel="Envoi…">
        Envoyer mon avis
      </SubmitButton>
    </form>
  );
}
