"use client";

import { useActionState } from "react";
import { deleteDemoContent } from "@/app/admin/actions";
import { FormMessage, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function DemoCleanup() {
  const [state, action] = useActionState(deleteDemoContent, {});
  return (
    <form action={action} className="space-y-3">
      <FormMessage type={state.ok ? "success" : "error"}>{state.message ?? state.error}</FormMessage>
      <Input name="confirm" placeholder="Tape SUPPRIMER pour confirmer" aria-label="Confirmation" className="h-11" autoComplete="off" />
      <SubmitButton variant="danger" pendingLabel="Suppression…">
        Supprimer tout le contenu « Démo »
      </SubmitButton>
    </form>
  );
}
