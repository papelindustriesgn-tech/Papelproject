"use client";

import { useActionState } from "react";
import { applyToJob } from "../actions";
import { Field, FormMessage, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function ApplyForm({ jobId, firstName }: { jobId: string; firstName: string }) {
  const [state, action] = useActionState(applyToJob, {});
  if (state.ok) return <FormMessage type="success">{state.message}</FormMessage>;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="job_id" value={jobId} />
      <FormMessage>{state.error}</FormMessage>
      <Field
        label="Ton message"
        htmlFor="message"
        error={state.fieldErrors?.message}
        hint="Présente-toi en quelques lignes : disponibilités, motivation, expériences."
      >
        <Textarea
          id="message"
          name="message"
          required
          minLength={10}
          maxLength={2000}
          rows={5}
          defaultValue={state.values?.message}
          placeholder={`Bonjour, je m'appelle ${firstName}…`}
        />
      </Field>
      <SubmitButton size="lg" className="w-full" pendingLabel="Envoi…">
        Envoyer ma candidature
      </SubmitButton>
    </form>
  );
}
