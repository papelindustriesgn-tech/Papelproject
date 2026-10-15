"use client";

import { useActionState, useState } from "react";
import { Field, FormMessage, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { STUDY_LEVELS } from "@/lib/constants";
import { submitBac, submitEnrollment } from "./actions";

type PartnerUniversity = { id: number; name: string; faculties: string[] };

export function EnrollmentForm({
  universities,
  defaultUniversity,
  defaults,
}: {
  universities: PartnerUniversity[];
  defaultUniversity: number | null;
  defaults: { field_of_study: string | null; study_level: string | null };
}) {
  const [state, run] = useActionState(submitEnrollment, {});
  const v = state.values ?? {};
  const fe = state.fieldErrors ?? {};
  const [uni, setUni] = useState(String(v.university_id ?? defaultUniversity ?? universities[0]?.id ?? ""));
  const faculties = universities.find((u) => String(u.id) === uni)?.faculties ?? [];
  if (state.ok) return <FormMessage type="success">{state.message}</FormMessage>;
  return (
    <form action={run} className="space-y-4">
      <FormMessage>{state.error}</FormMessage>
      <Field label="Établissement" htmlFor="university_id" error={fe.university_id}>
        <Select id="university_id" name="university_id" value={uni} onChange={(e) => setUni(e.target.value)} required>
          {universities.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field
        label="Matricule étudiant"
        htmlFor="student_number"
        error={fe.student_number}
        hint="Tel qu'il figure sur ta carte ou ton attestation d'inscription."
      >
        <Input
          id="student_number"
          name="student_number"
          required
          maxLength={40}
          autoComplete="off"
          className="font-mono"
          defaultValue={v.student_number}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Faculté / école" htmlFor="faculty" optional={!faculties.length} error={fe.faculty}>
          {faculties.length ? (
            <Select id="faculty" name="faculty" defaultValue={v.faculty ?? ""} key={uni}>
              <option value="">Choisir</option>
              {faculties.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </Select>
          ) : (
            <Input id="faculty" name="faculty" maxLength={120} defaultValue={v.faculty} />
          )}
        </Field>
        <Field label="Département" htmlFor="department" optional>
          <Input id="department" name="department" maxLength={120} defaultValue={v.department} />
        </Field>
        <Field label="Filière / programme" htmlFor="program" error={fe.program}>
          <Input id="program" name="program" required maxLength={120} defaultValue={v.program ?? defaults.field_of_study ?? ""} />
        </Field>
        <Field label="Niveau" htmlFor="study_level" error={fe.study_level}>
          <Select id="study_level" name="study_level" required defaultValue={v.study_level ?? defaults.study_level ?? ""}>
            <option value="" disabled>
              Choisir
            </option>
            {STUDY_LEVELS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </Select>
        </Field>
      </div>
      <p className="text-muted text-xs">
        Uny compare ton matricule, ton nom et ta date de naissance avec la source officielle de ton université. Seul le résultat
        (correspond / ne correspond pas) est conservé.
      </p>
      <SubmitButton size="lg" className="w-full" pendingLabel="Vérification…">
        Faire confirmer mon inscription
      </SubmitButton>
    </form>
  );
}

export function BacForm() {
  const [state, run] = useActionState(submitBac, {});
  const fe = state.fieldErrors ?? {};
  if (state.ok) return <FormMessage type="success">{state.message}</FormMessage>;
  return (
    <form action={run} className="space-y-4">
      <FormMessage>{state.error}</FormMessage>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Année du BAC" htmlFor="exam_year" error={fe.exam_year}>
          <Input
            id="exam_year"
            name="exam_year"
            type="number"
            min={1990}
            max={new Date().getFullYear()}
            required
            defaultValue={state.values?.exam_year}
          />
        </Field>
        <Field label="Numéro de PV du candidat" htmlFor="candidate_number" error={fe.candidate_number}>
          <Input
            id="candidate_number"
            name="candidate_number"
            required
            maxLength={30}
            className="font-mono uppercase"
            autoComplete="off"
            defaultValue={state.values?.candidate_number}
          />
        </Field>
      </div>
      <p className="text-muted text-xs">
        Aucun document à envoyer : l&apos;équipe Uny vérifie ton numéro de PV dans les résultats officiels du BAC, puis
        l&apos;efface. Seule la preuve de vérification est gardée.
      </p>
      <SubmitButton variant="outline" className="w-full" pendingLabel="Envoi…">
        Faire vérifier mon BAC
      </SubmitButton>
    </form>
  );
}
