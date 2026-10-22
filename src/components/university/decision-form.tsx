"use client";

import { useActionState, useState } from "react";
import { Check, X } from "lucide-react";
import { FormMessage, Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/actions/types";

type Decision = "verify" | "incomplete" | "reject" | "expire" | "revoke" | "reactivate";

const LABELS: Record<Decision, string> = {
  verify: "Confirmer l'inscription",
  incomplete: "Demander un complément",
  reject: "Refuser",
  expire: "Expirer la carte",
  revoke: "Révoquer la carte",
  reactivate: "Réactiver",
};

const REGISTRY_CHECKS = [
  { key: "student_number", label: "Matricule" },
  { key: "last_name", label: "Nom" },
  { key: "first_name", label: "Prénom" },
  { key: "birth_date", label: "Date de naissance" },
] as const;

/**
 * Boutons de décision ; le refus et la révocation demandent un motif (envoyé à l'étudiant).
 * Confirmer (ou réactiver) sans correspondance automatique complète exige la preuve du registre officiel :
 * référence consultée + 4 informations vérifiées (contrôlé aussi par la base).
 */
export function DecisionForm({
  action,
  decisions,
  fullMatch = false,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  decisions: Decision[];
  fullMatch?: boolean;
}) {
  const [state, run] = useActionState(action, {});
  const [asking, setAsking] = useState<Decision | null>(null);
  if (state.ok) return <FormMessage type="success">{state.message}</FormMessage>;
  return (
    <form action={run} className="space-y-2">
      <FormMessage>{state.error}</FormMessage>
      {asking === "verify" || asking === "reactivate" ? (
        <div className="bg-canvas space-y-2 rounded-xl p-3 text-sm" data-testid="registry-proof">
          <p className="font-semibold">Vérifié dans notre registre officiel :</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {REGISTRY_CHECKS.map((c) => (
              <label key={c.key} className="flex items-center gap-1.5">
                <input type="checkbox" name={`checked_${c.key}`} className="accent-brand-600 size-4" /> {c.label}
              </label>
            ))}
          </div>
          <Input
            name="source_ref"
            required
            minLength={3}
            maxLength={120}
            aria-label="Référence du registre"
            placeholder="Référence consultée (n° de dossier ou d'inscription)"
            className="h-10 text-sm"
          />
          <div className="flex gap-2">
            <SubmitButton name="decision" value={asking} size="sm" className="flex-1" pendingLabel="Envoi…">
              <Check className="size-4" aria-hidden /> {LABELS[asking]}
            </SubmitButton>
            <Button size="sm" variant="ghost" onClick={() => setAsking(null)}>
              Annuler
            </Button>
          </div>
        </div>
      ) : asking ? (
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
              asking === "reject"
                ? "Motif du refus (ex. matricule inconnu pour 2026-2027)"
                : asking === "incomplete"
                  ? "Ce que l'étudiant doit corriger (ex. matricule incomplet)"
                  : "Motif (visible par l'étudiant)"
            }
          />
          <div className="flex gap-2">
            <SubmitButton
              name="decision"
              value={asking}
              variant={asking === "incomplete" ? "outline" : "danger"}
              size="sm"
              className="flex-1"
              pendingLabel="Envoi…"
            >
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
            (d === "verify" || d === "reactivate") && !fullMatch ? (
              <Button key={d} size="sm" onClick={() => setAsking(d)}>
                <Check className="size-4" aria-hidden /> {LABELS[d]}
              </Button>
            ) : d === "reject" || d === "revoke" || d === "incomplete" ? (
              <Button key={d} size="sm" variant={d === "incomplete" ? "outline" : "danger"} onClick={() => setAsking(d)}>
                {d !== "incomplete" && <X className="size-4" aria-hidden />} {LABELS[d]}
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
