"use client";

import { useActionState, useState, type ReactNode } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { FormMessage, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/cn";
import { SURVEY_MODULES, SURVEY_SOURCES, SURVEY_WOULD_PAY } from "@/lib/survey";
import { submitSurvey } from "./actions";

export type SurveyValues = {
  source: string;
  rating: number;
  modules: string[];
  nps: number | null;
  would_pay: string;
  missing: string;
  partners: string;
  contact_ok: boolean;
};

const chip = (on: boolean) =>
  cn(
    "cursor-pointer rounded-2xl px-3.5 py-2.5 text-sm font-semibold ring-1 transition select-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500",
    on ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-ink ring-line hover:ring-brand-300",
  );

function Question({
  n,
  title,
  hint,
  error,
  children,
}: {
  n: number;
  title: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
      <legend className="sr-only">{title}</legend>
      <p className="font-bold" aria-hidden>
        <span className="text-brand-600">{n}.</span> {title}
      </p>
      {hint && <p className="text-muted mt-0.5 text-sm">{hint}</p>}
      <div className="mt-3">{children}</div>
      {error && <p className="text-coral-600 mt-2 text-sm font-medium">{error}</p>}
    </fieldset>
  );
}

export function SurveyForm({ initial }: { initial: SurveyValues }) {
  const [state, action] = useActionState(submitSurvey, {});
  const [v, setV] = useState(initial);
  const set = <K extends keyof SurveyValues>(k: K, val: SurveyValues[K]) => setV((p) => ({ ...p, [k]: val }));
  const err = state.fieldErrors ?? {};

  if (state.ok)
    return (
      <div className="rounded-[var(--radius-card)] bg-white p-8 text-center shadow-[var(--shadow-card)]">
        <p className="text-5xl" aria-hidden>
          💜
        </p>
        <h2 className="mt-3 text-xl font-extrabold">Merci pour ton avis !</h2>
        <p className="text-muted mt-1">Chaque réponse nous aide à améliorer Uny pour tous les étudiants.</p>
        <Link
          href="/accueil"
          className="bg-brand-600 mt-5 inline-flex h-12 items-center rounded-2xl px-6 font-semibold text-white"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    );

  return (
    <form action={action} className="space-y-4" noValidate>
      {state.error && <FormMessage>{state.error}</FormMessage>}

      <Question n={1} title="Comment as-tu connu Uny ?" error={err.source}>
        <div className="flex flex-wrap gap-2">
          {SURVEY_SOURCES.map((o) => (
            <label key={o.value} className={chip(v.source === o.value)}>
              <input
                type="radio"
                name="source"
                value={o.value}
                checked={v.source === o.value}
                onChange={() => set("source", o.value)}
                className="sr-only"
              />
              {o.label}
            </label>
          ))}
        </div>
      </Question>

      <Question n={2} title="Quelle note donnes-tu à Uny aujourd'hui ?" error={err.rating}>
        <div className="flex gap-1" role="radiogroup" aria-label="Note de 1 à 5">
          {[1, 2, 3, 4, 5].map((n) => (
            <label
              key={n}
              className="has-[:focus-visible]:ring-brand-500 cursor-pointer rounded-xl p-1 has-[:focus-visible]:ring-2"
            >
              <input
                type="radio"
                name="rating"
                value={n}
                checked={v.rating === n}
                onChange={() => set("rating", n)}
                className="sr-only"
                aria-label={`${n} sur 5`}
              />
              <Star
                className={cn("size-9 transition", n <= v.rating ? "fill-mango-400 text-mango-400" : "text-line")}
                aria-hidden
              />
            </label>
          ))}
        </div>
      </Question>

      <Question n={3} title="Quels services t'intéressent le plus ?" hint="Plusieurs choix possibles." error={err.modules}>
        <div className="flex flex-wrap gap-2">
          {SURVEY_MODULES.map((o) => {
            const on = v.modules.includes(o.value);
            return (
              <label key={o.value} className={chip(on)}>
                <input
                  type="checkbox"
                  name="modules"
                  value={o.value}
                  checked={on}
                  onChange={() => set("modules", on ? v.modules.filter((m) => m !== o.value) : [...v.modules, o.value])}
                  className="sr-only"
                />
                {o.label}
              </label>
            );
          })}
        </div>
      </Question>

      <Question
        n={4}
        title="Recommanderais-tu Uny à un ami étudiant ?"
        hint="0 = pas du tout · 10 = sans hésiter"
        error={err.nps}
      >
        <div className="grid grid-cols-11 gap-1" role="radiogroup" aria-label="Note de 0 à 10">
          {Array.from({ length: 11 }, (_, n) => (
            <label
              key={n}
              className={cn(
                "has-[:focus-visible]:ring-brand-500 flex h-10 cursor-pointer items-center justify-center rounded-xl text-sm font-bold ring-1 transition has-[:focus-visible]:ring-2",
                v.nps === n ? "bg-brand-600 ring-brand-600 text-white" : "ring-line hover:ring-brand-300 bg-white",
              )}
            >
              <input type="radio" name="nps" value={n} checked={v.nps === n} onChange={() => set("nps", n)} className="sr-only" />
              {n}
            </label>
          ))}
        </div>
      </Question>

      <Question
        n={5}
        title="Paierais-tu un petit abonnement pour plus d'avantages ?"
        hint="Par exemple des réductions exclusives chez les partenaires."
        error={err.would_pay}
      >
        <div className="flex flex-wrap gap-2">
          {SURVEY_WOULD_PAY.map((o) => (
            <label key={o.value} className={chip(v.would_pay === o.value)}>
              <input
                type="radio"
                name="would_pay"
                value={o.value}
                checked={v.would_pay === o.value}
                onChange={() => set("would_pay", o.value)}
                className="sr-only"
              />
              {o.label}
            </label>
          ))}
        </div>
      </Question>

      <Question
        n={6}
        title="Qu'est-ce qui te manque dans Uny ?"
        hint="Facultatif : une idée, un problème, une envie…"
        error={err.missing}
      >
        <Textarea
          name="missing"
          rows={3}
          maxLength={1000}
          value={v.missing}
          onChange={(e) => set("missing", e.target.value)}
          placeholder="Ex. : plus d'offres de stages en informatique"
        />
      </Question>

      <Question
        n={7}
        title="Quelles enseignes aimerais-tu voir sur Uny ?"
        hint="Facultatif : restaurants, boutiques, salles de sport, transport…"
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
