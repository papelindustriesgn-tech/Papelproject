"use client";

import { useActionState, useState } from "react";
import { reviewVerification } from "@/app/admin/actions";
import { FormMessage, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const REASONS = ["Document illisible", "Document expiré", "Nom différent du profil", "Document non reconnu"];

/** Contrôles obligatoires avant validation : ce que l'équipe a vérifié SUR le document, pas sur le profil. */
const CHECKS = [
  { key: "identity", label: "Nom et prénom identiques au profil" },
  { key: "institution", label: "Établissement identique au profil" },
  { key: "academic_year", label: "Document de l'année académique en cours" },
  { key: "authentic", label: "Document lisible, original, sans retouche visible" },
] as const;

export function ReviewForm({ id, academicYear, blocked }: { id: string; academicYear: string; blocked?: string | null }) {
  const [state, action] = useActionState(reviewVerification, {});
  const [reason, setReason] = useState("");
  if (state.ok) return <FormMessage type="success">{state.message}</FormMessage>;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <FormMessage>{state.error}</FormMessage>
      {blocked && <FormMessage>{blocked}</FormMessage>}
      <fieldset className="bg-canvas space-y-1.5 rounded-xl p-3 text-sm">
        <legend className="mb-1 text-xs font-semibold">Contrôles du document (obligatoires pour valider)</legend>
        {CHECKS.map((c) => (
          <label key={c.key} className="flex items-center gap-2">
            <input type="checkbox" name={`check_${c.key}`} className="accent-brand-600 size-4" />
            {c.label}
          </label>
        ))}
      </fieldset>
      <div className="grid grid-cols-2 gap-2">
        <Input name="student_number" maxLength={40} placeholder="Matricule lu sur le document" aria-label="Matricule lu sur le document" className="h-10 text-sm" />
        <Input name="academic_year" defaultValue={academicYear} maxLength={9} aria-label="Année académique du document" className="h-10 text-sm" />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {REASONS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setReason(r)}
            className="bg-canvas ring-line hover:ring-brand-300 rounded-full px-2.5 py-1 text-xs font-semibold ring-1"
          >
            {r}
          </button>
        ))}
      </div>
      <Input
        name="reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Motif en cas de refus"
        aria-label="Motif du refus"
        className="h-11"
      />
      <div className="grid grid-cols-2 gap-2">
        <SubmitButton name="decision" value="reject" variant="danger">
          Refuser
        </SubmitButton>
        <SubmitButton name="decision" value="approve" className="bg-mint-500 hover:bg-mint-700" disabled={!!blocked}>
          Valider
        </SubmitButton>
      </div>
    </form>
  );
}
