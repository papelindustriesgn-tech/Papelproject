"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "../actions";
import { Field, FormMessage, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function ForgotForm() {
  const [state, action] = useActionState(requestPasswordReset, {});
  if (state.ok) return <FormMessage type="success">{state.message}</FormMessage>;
  return (
    <form action={action} className="space-y-4">
      <FormMessage>{state.error}</FormMessage>
      <Field label="Email ou téléphone" htmlFor="identifier">
        <Input id="identifier" name="identifier" autoComplete="username" required defaultValue={state.values?.identifier} />
      </Field>
      <SubmitButton size="lg" className="w-full" pendingLabel="Envoi…">
        Recevoir le lien
      </SubmitButton>
    </form>
  );
}
