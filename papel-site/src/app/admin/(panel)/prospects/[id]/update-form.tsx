"use client";

import { updateLead } from "@/app/admin/actions";
import { FormMessage, SubmitButton } from "@/components/admin/ui";
import { useFormAction } from "@/components/admin/use-form-action";
import { Field, Select, Textarea } from "@/components/forms/fields";
import { LEAD_STATUS_LABEL, LEAD_STATUSES } from "@/lib/labels";
import type { LeadStatus } from "@/lib/types";

export function LeadUpdateForm({ id, status, notes }: { id: string; status: LeadStatus; notes: string }) {
  const { state, onSubmit, pending } = useFormAction(updateLead);
  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-4">
      <input type="hidden" name="id" value={id} />
      <Field id="status" label="Statut">
        <Select id="status" name="status" defaultValue={status}>
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {LEAD_STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
      </Field>
      <Field id="internal_notes" label="Notes internes" error={state?.errors?.internal_notes}>
        <Textarea
          id="internal_notes"
          name="internal_notes"
          rows={6}
          defaultValue={notes}
          placeholder="Échanges, prochaines étapes…"
        />
      </Field>
      <FormMessage state={state} />
      <SubmitButton pending={pending}>Enregistrer</SubmitButton>
    </form>
  );
}
