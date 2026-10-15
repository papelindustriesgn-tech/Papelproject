"use client";

import { useActionState, type ReactNode } from "react";
import type { FormState } from "@/lib/actions/types";
import { FormMessage } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

/** Formulaire générique relié à une Server Action, avec message de retour. */
export function ActionForm({
  action,
  children,
  submitLabel,
  className,
  render,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  children?: ReactNode;
  submitLabel: string;
  className?: string;
  render?: (state: FormState) => ReactNode;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className={className ?? "space-y-4"}>
      <FormMessage type={state.ok ? "success" : "error"}>{state.message ?? state.error}</FormMessage>
      {render ? render(state) : children}
      <SubmitButton className="w-full" pendingLabel="Enregistrement…">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
