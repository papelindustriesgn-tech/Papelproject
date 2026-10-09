"use client";

import { useActionState, useState } from "react";
import { FormMessage, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { MultiChoice, ProjectIntro, Question, SingleChoice, ThankYou } from "@/components/survey/questions";
import { SURVEY_CATEGORIES, SURVEY_PAYMENT, SURVEY_UNDERSTOOD, SURVEY_WOULD_USE } from "@/lib/survey";
import { submitSurvey } from "./actions";

export type SurveyValues = {
  understood: string;
  categories: string[];
  would_use: string;
  payment_pref: string;
  missing: string;
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
        text="Grâce à toi, on sait quels commerçants démarcher et quoi améliorer."
        href="/accueil"
        cta="Retour à l'accueil"
      />
    );

  return (
    <form action={action} className="space-y-4" noValidate>
      <ProjectIntro
        title="Uny en 3 points"
        steps={[
          { emoji: "🪪", text: "Ta carte étudiante dans ton téléphone, vérifiée par ton université." },
          { emoji: "🎟️", text: "Des codes promo chez les commerçants partenaires : restos, internet, sport…" },
          { emoji: "🟠", text: "Tu paies directement le commerçant avec Orange Money. C'est gratuit pour toi." },
        ]}
      />
      {state.error && <FormMessage>{state.error}</FormMessage>}

      <Question n={1} title="C'est clair pour toi, à quoi sert Uny ?" error={err.understood}>
        <SingleChoice name="understood" options={SURVEY_UNDERSTOOD} value={v.understood} onChange={(x) => set("understood", x)} />
      </Question>

      <Question n={2} title="Où veux-tu des réductions en priorité ?" hint="Plusieurs choix possibles." error={err.categories}>
        <MultiChoice name="categories" options={SURVEY_CATEGORIES} value={v.categories} onChange={(x) => set("categories", x)} />
      </Question>

      <Question n={3} title="Utiliserais-tu Uny pour avoir tes réductions ?" error={err.would_use}>
        <SingleChoice name="would_use" options={SURVEY_WOULD_USE} value={v.would_use} onChange={(x) => set("would_use", x)} />
      </Question>

      <Question n={4} title="Comment préfères-tu payer ?" error={err.payment_pref}>
        <SingleChoice
          name="payment_pref"
          options={SURVEY_PAYMENT}
          value={v.payment_pref}
          onChange={(x) => set("payment_pref", x)}
        />
      </Question>

      <Question
        n={5}
        title="Une idée pour améliorer Uny ?"
        hint="Facultatif : un avantage, une enseigne que tu aimerais voir, un problème…"
        error={err.missing}
      >
        <Textarea
          name="missing"
          rows={3}
          maxLength={1000}
          value={v.missing}
          onChange={(e) => set("missing", e.target.value)}
          placeholder="Ex. : des réductions sur les forfaits internet"
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
