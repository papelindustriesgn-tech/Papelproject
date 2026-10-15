"use client";

import { useActionState, useState } from "react";
import { Check, X } from "lucide-react";
import { FormMessage, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/actions/types";

type Decision = "verify" | "reject" | "expire" | "revoke" | "reactivate";

const LABELS: Record<Decision, string> = {
  verify: "Confirmer l'inscription",
  reject: "Refuser",
  expire: "Expirer la carte",
  revoke: "Révoquer la carte",
  reactivate: "Réactiver",
};

/** Boutons de décision ; le refus et la révocation demandent un motif (envoyé à l'étudiant). */
export function DecisionForm({
  action,
  decisions,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  decisions: Decision[];
}) {
  const [state, run] = useActionState(action, {});
  const [asking, setAsking] = useState<Decision | null>(null);
  if (state.ok) return <FormMessage type="success">{state.message}</FormMessage>;
  return (
    <form action={run} className="space-y-2">
      <FormMessage>{state.error}</FormMessage>
      {asking ? (
        <>
          <Textarea
            name="reason"
            required
            minLength={3}
            maxLength={500}
            rows={2}
            autoFocus
            aria-label="Motif"
            placeholder={
              asking === "reject" ? "Motif du refus (ex. matricule inconnu pour 2026-2027)" : "Motif (visible par l'étudiant)"
            }
          />
          <div className="flex gap-2">
            <SubmitButton name="decision" value={asking} variant="danger" size="sm" className="flex-1" pendingLabel="Envoi…">
              {LABELS[asking]}
            </SubmitButton>
            <Button size="sm" variant="ghost" onClick={() => setAsking(null)}>
              Annuler
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap gap-2">
          {decisions.map((d) =>
            d === "reject" || d === "revoke" ? (
              <Button key={d} size="sm" variant="danger" onClick={() => setAsking(d)}>
                <X className="size-4" aria-hidden /> {LABELS[d]}
              </Button>
            ) : (
              <SubmitButton
                key={d}
                name="decision"
                value={d}
                size="sm"
                variant={d === "expire" ? "outline" : "primary"}
                pendingLabel="Envoi…"
              >
                {d !== "expire" && <Check className="size-4" aria-hidden />} {LABELS[d]}
              </SubmitButton>
            ),
          )}
        </div>
      )}
    </form>
  );
}
