"use client";

import { FormDraft } from "@/components/ui/form-draft";
import { useActionState } from "react";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { STUDY_LEVELS } from "@/lib/constants";
import { sendAnnouncement } from "./actions";

export function AnnouncementForm({ faculties }: { faculties: string[] }) {
  const [state, action] = useActionState(sendAnnouncement, {});
  const fe = state.fieldErrors ?? {};
  const v = state.values ?? {};
  return (
    <form action={action} className="space-y-4" key={state.ok ? state.message : "form"}>
      <FormDraft id="university-announcement" />
      {state.ok ? <FormMessage type="success">{state.message}</FormMessage> : <FormMessage>{state.error}</FormMessage>}
      <Field label="Titre" htmlFor="title" error={fe.title}>
        <Input id="title" name="title" required maxLength={80} defaultValue={v.title} placeholder="Examens du 1er semestre" />
      </Field>
      <Field label="Message" htmlFor="body" error={fe.body} hint="500 caractères maximum.">
        <Textarea
          id="body"
          name="body"
          required
          maxLength={500}
          rows={4}
          defaultValue={v.body}
          placeholder="Les examens commencent le 3 novembre. Le planning est affiché au rectorat."
        />
      </Field>
      <Field label="Destinataires" htmlFor="audience">
        <Select id="audience" name="audience" defaultValue={v.audience ?? "all"}>
          <option value="all">Tous nos étudiants sur Uny</option>
          <option value="verified">Seulement les inscriptions confirmées</option>
        </Select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Niveau" htmlFor="study_level" optional>
          <Select id="study_level" name="study_level" defaultValue={v.study_level ?? ""}>
            <option value="">Tous les niveaux</option>
            {STUDY_LEVELS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </Select>
        </Field>
        {faculties.length > 0 && (
          <Field label="Faculté" htmlFor="faculty" optional>
            <Select id="faculty" name="faculty" defaultValue={v.faculty ?? ""}>
              <option value="">Toutes les facultés</option>
              {faculties.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </Select>
          </Field>
        )}
      </div>
      <SubmitButton pendingLabel="Envoi…">Envoyer l&apos;annonce</SubmitButton>
    </form>
  );
}
