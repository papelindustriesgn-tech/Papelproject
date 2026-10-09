"use client";

import { useActionState } from "react";
import { resendConfirmation } from "../../actions";
import { FormMessage } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function ResendForm({ email }: { email: string }) {
  const [state, action] = useActionState(resendConfirmation, {});
  if (!email) return null;
  return (
    <form action={action} className="mt-6 space-y-3">
      <input type="hidden" name="email" value={email} />
      <FormMessage type={state.ok ? "success" : "error"}>{state.message ?? state.error}</FormMessage>
      <SubmitButton variant="secondary" className="w-full" pendingLabel="Envoi…">
        Renvoyer l&apos;email
      </SubmitButton>
    </form>
  );
}
