"use client";

import { useActionState } from "react";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { requestApiConnection, updateUniversityProfile } from "../actions";

type Uni = {
  short_name: string | null;
  website: string | null;
  contact_email: string | null;
  city_id: number | null;
  faculties: string[];
};

export function UniversityProfileForm({ uni, cities }: { uni: Uni; cities: { id: number; name: string }[] }) {
  const [state, run] = useActionState(updateUniversityProfile, {});
  const fe = state.fieldErrors ?? {};
  return (
    <form action={run} className="space-y-4">
      <FormMessage type={state.ok ? "success" : "error"}>{state.message ?? state.error}</FormMessage>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Sigle" htmlFor="short_name" optional error={fe.short_name}>
          <Input id="short_name" name="short_name" defaultValue={uni.short_name ?? ""} maxLength={40} />
        </Field>
        <Field label="Ville" htmlFor="city_id">
          <Select id="city_id" name="city_id" defaultValue={uni.city_id ?? ""}>
            <option value="">—</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Site web" htmlFor="website" optional error={fe.website}>
          <Input id="website" name="website" type="url" defaultValue={uni.website ?? ""} placeholder="https://" />
        </Field>
        <Field label="Email de la scolarité" htmlFor="contact_email" optional error={fe.contact_email}>
          <Input id="contact_email" name="contact_email" type="email" defaultValue={uni.contact_email ?? ""} />
        </Field>
      </div>
      <Field
        label="Facultés / écoles (une par ligne)"
        htmlFor="faculties"
        optional
        hint="Proposées aux étudiants lors de leur demande, pour des cartes homogènes."
      >
        <Textarea id="faculties" name="faculties" rows={5} defaultValue={uni.faculties.join("\n")} />
      </Field>
      <SubmitButton className="w-full" pendingLabel="Enregistrement…">
        Enregistrer la fiche
      </SubmitButton>
    </form>
  );
}

export function ApiRequestForm() {
  const [state, run] = useActionState(requestApiConnection, {});
  const fe = state.fieldErrors ?? {};
  if (state.ok) return <FormMessage type="success">{state.message}</FormMessage>;
  return (
    <form action={run} className="space-y-4">
      <FormMessage>{state.error}</FormMessage>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Responsable technique" htmlFor="tech_name" error={fe.tech_name}>
          <Input id="tech_name" name="tech_name" required maxLength={120} />
        </Field>
        <Field label="Email technique" htmlFor="tech_email" error={fe.tech_email}>
          <Input id="tech_email" name="tech_email" type="email" required />
        </Field>
      </div>
      <Field label="Logiciel de scolarité utilisé" htmlFor="system" optional>
        <Input id="system" name="system" maxLength={200} placeholder="Ex. logiciel maison, Apogée, Excel…" />
      </Field>
      <Field label="Précisions" htmlFor="notes" optional>
        <Textarea id="notes" name="notes" rows={3} maxLength={1000} placeholder="Documentation d'API disponible, contraintes…" />
      </Field>
      <SubmitButton variant="outline" className="w-full" pendingLabel="Envoi…">
        Demander le raccordement
      </SubmitButton>
    </form>
  );
}
