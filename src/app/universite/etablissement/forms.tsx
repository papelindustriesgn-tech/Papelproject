"use client";

import { useActionState } from "react";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { requestApiConnection, submitUniversityVetting, updateUniversityProfile } from "../actions";

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

type Vetting = {
  legal_name: string | null;
  accreditation_ref: string | null;
  accreditation_date: string | null;
  signatory_name: string | null;
  signatory_title: string | null;
  official_phone: string | null;
  official_email: string | null;
  document_path: string | null;
};

/** Dossier de vérification : pièces officielles contrôlées par l'équipe Uny avant l'approbation. */
export function VettingForm({ v }: { v: Vetting | null }) {
  const [state, run] = useActionState(submitUniversityVetting, {});
  const fe = state.fieldErrors ?? {};
  const val = (k: keyof Vetting) => (state.values?.[k] as string | undefined) ?? v?.[k] ?? "";
  return (
    <form action={run} className="space-y-4" data-testid="vetting-form">
      <FormMessage type={state.ok ? "success" : "error"}>{state.message ?? state.error}</FormMessage>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom légal de l'établissement" htmlFor="legal_name" error={fe.legal_name}>
          <Input id="legal_name" name="legal_name" defaultValue={val("legal_name")} maxLength={200} required />
        </Field>
        <Field label="N° d'agrément ou d'arrêté de création" htmlFor="accreditation_ref" error={fe.accreditation_ref}>
          <Input id="accreditation_ref" name="accreditation_ref" defaultValue={val("accreditation_ref")} maxLength={120} required />
        </Field>
        <Field label="Date de l'agrément" htmlFor="accreditation_date" optional error={fe.accreditation_date}>
          <Input id="accreditation_date" name="accreditation_date" type="date" defaultValue={val("accreditation_date")} />
        </Field>
        <Field label="Téléphone du standard officiel" htmlFor="official_phone" error={fe.official_phone}>
          <Input id="official_phone" name="official_phone" type="tel" defaultValue={val("official_phone")} maxLength={30} required />
        </Field>
        <Field label="Signataire (nom complet)" htmlFor="signatory_name" error={fe.signatory_name}>
          <Input id="signatory_name" name="signatory_name" defaultValue={val("signatory_name")} maxLength={120} required />
        </Field>
        <Field label="Fonction du signataire" htmlFor="signatory_title" error={fe.signatory_title}>
          <Input
            id="signatory_title"
            name="signatory_title"
            defaultValue={val("signatory_title")}
            maxLength={120}
            placeholder="Recteur, Directeur général, Secrétaire général…"
            required
          />
        </Field>
        <Field label="Email officiel" htmlFor="official_email" optional error={fe.official_email}>
          <Input id="official_email" name="official_email" type="email" defaultValue={val("official_email")} maxLength={200} />
        </Field>
        <Field
          label="Lettre officielle signée et cachetée"
          htmlFor="document"
          hint={v?.document_path ? "Déjà envoyée. Ajoutez un fichier pour la remplacer." : "PDF, JPG ou PNG · 5 Mo max"}
        >
          <Input id="document" name="document" type="file" accept="application/pdf,image/jpeg,image/png" required={!v?.document_path} />
        </Field>
      </div>
      <SubmitButton pendingLabel="Envoi…">Envoyer le dossier</SubmitButton>
    </form>
  );
}
