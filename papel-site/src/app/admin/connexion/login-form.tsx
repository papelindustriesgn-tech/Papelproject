"use client";

import { useActionState } from "react";
import { signIn } from "@/app/admin/actions";
import { FormMessage, SubmitButton } from "@/components/admin/ui";
import { Field, Input } from "@/components/forms/fields";

export function LoginForm() {
  const [state, action] = useActionState(signIn, undefined);
  return (
    <form action={action} className="mt-6 space-y-4">
      <Field id="email" label="Adresse e-mail" error={state?.errors?.email}>
        <Input id="email" name="email" type="email" autoComplete="username" required />
      </Field>
      <Field id="password" label="Mot de passe" error={state?.errors?.password}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <FormMessage state={state} />
      <SubmitButton>Se connecter</SubmitButton>
    </form>
  );
}
