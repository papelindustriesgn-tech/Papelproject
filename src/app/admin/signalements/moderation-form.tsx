"use client";

import { useActionState } from "react";
import { FormMessage, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { moderateListing } from "./actions";

export function ModerationForm({ itemId }: { itemId: string }) {
  const [state, action] = useActionState(moderateListing.bind(null, itemId), {});
  if (state.ok) return <FormMessage type="success">{state.message}</FormMessage>;
  return (
    <form action={action} className="mt-3 space-y-2">
      <FormMessage>{state.error}</FormMessage>
      <Textarea
        name="note"
        rows={2}
        maxLength={500}
        placeholder="Motif de la décision (obligatoire pour un retrait, envoyé au vendeur)"
        aria-label="Motif"
      />
      <div className="flex flex-wrap gap-2">
        <SubmitButton name="decision" value="remove" variant="danger" size="sm">
          Retirer l&apos;annonce
        </SubmitButton>
        <SubmitButton name="decision" value="dismiss" variant="outline" size="sm">
          Classer (annonce conforme)
        </SubmitButton>
      </div>
    </form>
  );
}
