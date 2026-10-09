"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import { UnyCard, type UnyCardData } from "@/components/card/uny-card";
import { FormMessage } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { LinkButton } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import {
  CARD_THEMES,
  STUDENT_CARD_LAYOUTS,
  resolveStudentCardStyle,
  type CardBranding,
  type CardTemplate,
  type CardTheme,
  type StudentCardLayout,
} from "@/lib/card-template";
import { saveCardStyle } from "./actions";

export function CardStyleEditor({
  base,
  university,
  universityName,
  initialLayout,
  initialTheme,
}: {
  base: UnyCardData;
  university: { branding: CardBranding; template: CardTemplate } | null;
  universityName: string;
  initialLayout: StudentCardLayout;
  initialTheme: CardTheme;
}) {
  const [state, run] = useActionState(saveCardStyle, {});
  const [layout, setLayout] = useState<StudentCardLayout>(initialLayout);
  const [theme, setTheme] = useState<CardTheme>(initialTheme);
  const style = resolveStudentCardStyle({ university, universityName, layout, theme });
  const layouts = (Object.keys(STUDENT_CARD_LAYOUTS) as StudentCardLayout[]).filter((l) => !university || l !== "uny");

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,26rem)_1fr]">
      <div className="lg:sticky lg:top-20 lg:self-start">
        <UnyCard data={{ ...base, ...style }} />
        <p className="text-muted mt-3 text-xs">
          Le logo uny., ton identifiant, le QR code et ton statut restent toujours visibles : les partenaires reconnaissent ta
          carte au premier coup d&apos;œil.
        </p>
      </div>

      <form action={run} className="space-y-6">
        <FormMessage type={state.ok ? "success" : "error"}>{state.message ?? state.error}</FormMessage>
        <input type="hidden" name="layout" value={layout} />
        <input type="hidden" name="theme" value={theme} />

        <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
          <h2 className="font-bold">Modèle</h2>
          <div className="mt-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Modèle de carte">
            {layouts.map((l) => (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={layout === l}
                onClick={() => setLayout(l)}
                className={cn(
                  "rounded-2xl border p-3 text-left text-sm transition",
                  layout === l ? "border-brand-500 bg-brand-50 ring-brand-100 ring-4" : "border-line hover:border-brand-300",
                )}
              >
                <span className="block font-bold">{STUDENT_CARD_LAYOUTS[l].label}</span>
                <span className="text-muted">{STUDENT_CARD_LAYOUTS[l].hint}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
          <h2 className="font-bold">Couleurs</h2>
          {university ? (
            <p className="text-muted mt-2 text-sm">
              Ta carte porte les couleurs officielles de <strong className="text-ink">{university.branding.name}</strong>. Tu peux
              choisir le modèle ci-dessus.
            </p>
          ) : (
            <div className="mt-3 grid grid-cols-4 gap-3" role="radiogroup" aria-label="Couleurs de la carte">
              {(Object.keys(CARD_THEMES) as CardTheme[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={theme === t}
                  aria-label={CARD_THEMES[t].label}
                  onClick={() => setTheme(t)}
                  className="flex flex-col items-center gap-1.5 text-xs font-semibold"
                >
                  <span
                    className={cn(
                      "relative flex size-12 items-center justify-center rounded-2xl ring-offset-2 transition",
                      theme === t ? "ring-brand-500 ring-2" : "ring-line ring-1",
                    )}
                    style={{ background: `linear-gradient(135deg, ${CARD_THEMES[t].primary}, ${CARD_THEMES[t].secondary})` }}
                  >
                    {theme === t && <Check className="size-5 text-white drop-shadow" aria-hidden />}
                  </span>
                  <span className="truncate">{CARD_THEMES[t].label}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <div className="grid gap-2 sm:grid-cols-2">
          <SubmitButton size="lg" pendingLabel="Enregistrement…">
            Enregistrer ma carte
          </SubmitButton>
          <LinkButton href="/carte" size="lg" variant="outline">
            Retour à ma carte
          </LinkButton>
        </div>
      </form>
    </div>
  );
}
