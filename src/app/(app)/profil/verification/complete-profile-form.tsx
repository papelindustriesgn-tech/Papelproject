"use client";

import { useActionState } from "react";
import { Field, FormMessage, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { STUDY_LEVELS } from "@/lib/constants";
import { completeProfile } from "./actions";

type Defaults = { phone: string | null; birth_date: string | null; field_of_study: string | null; study_level: string | null };

export function CompleteProfileForm({ defaults }: { defaults: Defaults }) {
  const [state, run] = useActionState(completeProfile, {});
  const v = { ...defaults, ...(state.values ?? {}) };
  const fe = state.fieldErrors ?? {};
  return (
    <form action={run} className="space-y-4" key={JSON.stringify(state.values ?? {})}>
      <FormMessage>{state.error}</FormMessage>
      <Field label="Téléphone" htmlFor="phone" error={fe.phone} hint="Tu pourras aussi te connecter avec ce numéro.">
        <div className="flex gap-2">
          <span className="border-line bg-canvas text-muted flex h-12 shrink-0 items-center rounded-2xl border px-3 text-sm font-semibold whitespace-nowrap">
            🇬🇳 +224
          </span>
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="620 00 00 00"
            required
            minLength={8}
            defaultValue={v.phone ?? ""}
            aria-invalid={!!fe.phone}
          />
        </div>
      </Field>
      <Field label="Date de naissance" htmlFor="birth_date" error={fe.birth_date}>
        <Input
          id="birth_date"
          name="birth_date"
          type="date"
          required
          autoComplete="bday"
          defaultValue={v.birth_date ?? ""}
          max={new Date().toISOString().slice(0, 10)}
          aria-invalid={!!fe.birth_date}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Filière" htmlFor="field_of_study" error={fe.field_of_study}>
          <Input
            id="field_of_study"
            name="field_of_study"
            placeholder="Ex. : Droit"
            required
            maxLength={120}
            defaultValue={v.field_of_study ?? ""}
            aria-invalid={!!fe.field_of_study}
          />
        </Field>
        <Field label="Niveau" htmlFor="study_level" error={fe.study_level}>
          <Select id="study_level" name="study_level" required defaultValue={v.study_level ?? ""} aria-invalid={!!fe.study_level}>
            <option value="" disabled>
              Niveau
            </option>
            {STUDY_LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <SubmitButton size="lg" className="w-full" pendingLabel="Enregistrement…">
        Continuer
      </SubmitButton>
    </form>
  );
}
