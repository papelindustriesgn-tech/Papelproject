"use client";

import { useActionState } from "react";
import { Field, FormMessage, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { FormState } from "@/lib/actions/types";

/** Bouton « Accepter » d'une demande : affiche les identifiants créés (une seule fois). */
export function ApproveButton({
  action,
  label = "Accepter et créer l'accès",
}: {
  action: () => Promise<FormState>;
  label?: string;
}) {
  const [state, run] = useActionState<FormState>(() => action(), {});
  return (
    <form action={run} className="space-y-2">
      <FormMessage type={state.ok ? "success" : "error"}>{state.message ?? state.error}</FormMessage>
      {!state.ok && (
        <SubmitButton size="sm" pendingLabel="Création…">
          {label}
        </SubmitButton>
      )}
    </form>
  );
}

/** Ajout d'un membre (compte d'accès) à un partenaire existant. */
export function GrantAccessForm({
  action,
  submitLabel = "Donner l'accès à l'espace partenaire",
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  submitLabel?: string;
}) {
  const [state, run] = useActionState(action, {});
  const fe = state.fieldErrors ?? {};
  return (
    <form action={run} className="space-y-3">
      <FormMessage type={state.ok ? "success" : "error"}>{state.message ?? state.error}</FormMessage>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Prénom" htmlFor="first_name" error={fe.first_name}>
          <Input id="first_name" name="first_name" required />
        </Field>
        <Field label="Nom" htmlFor="last_name" error={fe.last_name}>
          <Input id="last_name" name="last_name" required />
        </Field>
      </div>
      <Field label="Email (identifiant)" htmlFor="member_email" error={fe.email}>
        <Input id="member_email" name="email" type="email" required />
      </Field>
      <SubmitButton className="w-full" pendingLabel="Création…">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
