"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { backupNow } from "./actions";

export function BackupButton() {
  const [state, run] = useActionState(backupNow, {});
  return (
    <form action={run} className="space-y-3">
      {state.ok ? <FormMessage type="success">{state.message}</FormMessage> : <FormMessage>{state.error}</FormMessage>}
      <SubmitButton pendingLabel="Sauvegarde en cours…">Sauvegarder maintenant</SubmitButton>
    </form>
  );
}
