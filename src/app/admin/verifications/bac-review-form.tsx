"use client";

import { useActionState } from "react";
import { FormMessage, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { reviewBac } from "../university-actions";

export function BacReviewForm({ id }: { id: string }) {
  const [state, run] = useActionState(reviewBac.bind(null, id), {});
  if (state.ok) return <FormMessage type="success">{state.message}</FormMessage>;
  return (
    <form action={run} className="space-y-2">
      <FormMessage>{state.error}</FormMessage>
      <Input
        name="source_reference"
        maxLength={120}
        placeholder="Référence de contrôle (facultatif, ex. PV n°…)"
        aria-label="Référence"
        className="h-10 text-sm"
      />
      <Input
        name="reason"
        maxLength={500}
        placeholder="Motif en cas de refus"
        aria-label="Motif du refus"
        className="h-10 text-sm"
      />
      <div className="grid grid-cols-2 gap-2">
        <SubmitButton name="decision" value="reject" variant="danger" size="sm">
          Refuser
        </SubmitButton>
        <SubmitButton name="decision" value="verify" size="sm" className="bg-mint-500 hover:bg-mint-700">
          BAC vérifié
        </SubmitButton>
      </div>
    </form>
  );
}
