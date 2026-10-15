"use client";

import { useActionState } from "react";
import { Field, FormMessage, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveLoyaltyProgram } from "./actions";

type Program = { stamps_required: number; reward: string; is_active: boolean } | null;

export function ProgramForm({ program }: { program: Program }) {
  const [state, action] = useActionState(saveLoyaltyProgram, {});
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4">
      {state.ok ? <FormMessage type="success">{state.message}</FormMessage> : <FormMessage>{state.error}</FormMessage>}
      <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
        <Field label="Nombre de passages" htmlFor="stamps_required" error={fe.stamps_required}>
          <Input
            id="stamps_required"
            name="stamps_required"
            type="number"
            min={2}
            max={20}
            required
            defaultValue={program?.stamps_required ?? 5}
          />
        </Field>
        <Field
          label="Récompense offerte"
          htmlFor="reward"
          error={fe.reward}
          hint="Ex. : 1 menu offert, -50 % sur la prochaine commande…"
        >
          <Input
            id="reward"
            name="reward"
            required
            maxLength={120}
            defaultValue={program?.reward ?? ""}
            placeholder="1 menu offert"
          />
        </Field>
      </div>
      <label className="flex items-center gap-3 text-sm font-semibold">
        <input type="checkbox" name="is_active" defaultChecked={program?.is_active ?? true} className="accent-brand-600 size-5" />
        Programme actif
      </label>
      <SubmitButton pendingLabel="Enregistrement…">Enregistrer</SubmitButton>
    </form>
  );
}
