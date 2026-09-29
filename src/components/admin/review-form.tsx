"use client";

import { useActionState, useState } from "react";
import { reviewVerification } from "@/app/admin/actions";
import { FormMessage, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const REASONS = ["Document illisible", "Document expiré", "Nom différent du profil", "Document non reconnu"];

export function ReviewForm({ id }: { id: string }) {
  const [state, action] = useActionState(reviewVerification, {});
  const [reason, setReason] = useState("");
  if (state.ok) return <FormMessage type="success">{state.message}</FormMessage>;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <FormMessage>{state.error}</FormMessage>
      <div className="flex flex-wrap gap-1.5">
        {REASONS.map((r) => (
          <button key={r} type="button" onClick={() => setReason(r)} className="rounded-full bg-canvas px-2.5 py-1 text-xs font-semibold ring-1 ring-line hover:ring-brand-300">
            {r}
          </button>
        ))}
      </div>
      <Input name="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motif en cas de refus" aria-label="Motif du refus" className="h-11" />
      <div className="grid grid-cols-2 gap-2">
        <SubmitButton name="decision" value="reject" variant="danger">
          Refuser
        </SubmitButton>
        <SubmitButton name="decision" value="approve" className="bg-mint-500 hover:bg-mint-700">
          Valider
        </SubmitButton>
      </div>
    </form>
  );
}
