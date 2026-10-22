"use client";

import { useActionState } from "react";
import { FormMessage, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { requestDiagnosis, runChecks, updateAlert } from "./actions";

export function RunChecksButton() {
  const [state, action] = useActionState(runChecks, {});
  return (
    <form action={action} className="space-y-2">
      <SubmitButton size="sm" pendingLabel="Évaluation…">
        Évaluer les règles maintenant
      </SubmitButton>
      <FormMessage type={state.ok ? "success" : "error"}>{state.message ?? state.error}</FormMessage>
    </form>
  );
}

export function AlertActions({ alertId, acknowledged }: { alertId: string; acknowledged: boolean }) {
  const [state, action] = useActionState(updateAlert.bind(null, alertId), {});
  const [diag, diagAction] = useActionState(requestDiagnosis.bind(null, alertId), {});
  if (state.ok) return <FormMessage type="success">{state.message}</FormMessage>;
  return (
    <div className="mt-2 space-y-2">
      <form action={action} className="flex flex-wrap items-center gap-2">
        <Input name="note" maxLength={500} placeholder="Note de résolution (facultatif)" aria-label="Note" className="h-9 max-w-xs" />
        {!acknowledged && (
          <SubmitButton name="status" value="acknowledged" size="sm" variant="outline">
            Prendre en charge
          </SubmitButton>
        )}
        <SubmitButton name="status" value="resolved" size="sm" variant="outline">
          Marquer résolue
        </SubmitButton>
      </form>
      <form action={diagAction}>
        <SubmitButton size="sm" variant="ghost" pendingLabel="Diagnostic…">
          Diagnostic IA (proposition)
        </SubmitButton>
      </form>
      <FormMessage>{state.error ?? diag.error}</FormMessage>
    </div>
  );
}
