"use client";

import { useActionState } from "react";
import { updatePassword } from "../actions";
import { Field, FormMessage, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function ResetForm({ submitLabel = "Enregistrer" }: { submitLabel?: string }) {
  const [state, action] = useActionState(updatePassword, {});
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4">
      <FormMessage>{state.error}</FormMessage>
      <Field
        label="Nouveau mot de passe"
        htmlFor="password"
        error={fe.password}
        hint="8 caractères minimum, avec au moins une lettre et un chiffre."
      >
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <Field label="Confirme le mot de passe" htmlFor="password_confirm" error={fe.password_confirm}>
        <Input id="password_confirm" name="password_confirm" type="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <SubmitButton size="lg" className="w-full" pendingLabel="Enregistrement…">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
