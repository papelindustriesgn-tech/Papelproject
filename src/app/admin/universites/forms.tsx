"use client";

import { useActionState, useState, useTransition } from "react";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/actions/types";
import { createUniversity } from "../university-actions";

export function NewUniversityForm({ cities }: { cities: { id: number; name: string }[] }) {
  const [state, run] = useActionState(createUniversity, {});
  const fe = state.fieldErrors ?? {};
  return (
    <form action={run} className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
      <div className="sm:col-span-4">
        <FormMessage>{state.error}</FormMessage>
      </div>
      <Field label="Nom officiel" htmlFor="name" error={fe.name}>
        <Input id="name" name="name" required maxLength={200} defaultValue={state.values?.name} />
      </Field>
      <Field label="Sigle" htmlFor="short_name" optional>
        <Input id="short_name" name="short_name" maxLength={40} defaultValue={state.values?.short_name} />
      </Field>
      <Field label="Ville" htmlFor="city_id">
        <Select id="city_id" name="city_id" defaultValue="">
          <option value="">—</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <SubmitButton pendingLabel="Création…">Créer</SubmitButton>
    </form>
  );
}

type Integration = {
  status: string;
  base_url: string | null;
  auth_type: string;
  secret_ref: string | null;
  field_mapping: unknown;
  agreement_reference: string | null;
  agreement_signed_at: string | null;
};

export function IntegrationForm({
  action,
  test,
  initial,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  test: () => Promise<FormState>;
  initial: Integration | null;
}) {
  const [state, run] = useActionState(action, {});
  const [testState, setTestState] = useState<FormState>({});
  const [testing, start] = useTransition();
  const fe = state.fieldErrors ?? {};
  const v = state.values;
  const mapping =
    initial?.field_mapping && Object.keys(initial.field_mapping as object).length
      ? JSON.stringify(initial.field_mapping, null, 2)
      : "";
  return (
    <form action={run} className="space-y-4">
      <FormMessage type={state.ok ? "success" : "error"}>{state.message ?? state.error}</FormMessage>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Statut" htmlFor="status">
          <Select id="status" name="status" defaultValue={v?.status ?? initial?.status ?? "not_configured"}>
            <option value="not_configured">Non configuré</option>
            <option value="testing">En test (non utilisé pour vérifier)</option>
            <option value="active">Actif (vérification automatique)</option>
            <option value="disabled">Désactivé</option>
          </Select>
        </Field>
        <Field label="Authentification" htmlFor="auth_type">
          <Select id="auth_type" name="auth_type" defaultValue={v?.auth_type ?? initial?.auth_type ?? "bearer"}>
            <option value="bearer">Authorization: Bearer</option>
            <option value="api_key_header">En-tête X-API-Key</option>
          </Select>
        </Field>
        <Field label="URL de base de l'API (HTTPS)" htmlFor="base_url" error={fe.base_url}>
          <Input
            id="base_url"
            name="base_url"
            type="url"
            placeholder="https://api.universite.gn/v1"
            defaultValue={v?.base_url ?? initial?.base_url ?? ""}
          />
        </Field>
        <Field
          label="Variable secrète (serveur)"
          htmlFor="secret_ref"
          error={fe.secret_ref}
          hint="Nom de la variable d'environnement Vercel qui contient la clé. La clé n'est jamais saisie ici."
        >
          <Input
            id="secret_ref"
            name="secret_ref"
            placeholder="UNIV_UGANC_API_KEY"
            className="font-mono uppercase"
            defaultValue={v?.secret_ref ?? initial?.secret_ref ?? ""}
          />
        </Field>
        <Field label="Référence de l'accord signé" htmlFor="agreement_reference" optional>
          <Input
            id="agreement_reference"
            name="agreement_reference"
            maxLength={200}
            defaultValue={v?.agreement_reference ?? initial?.agreement_reference ?? ""}
          />
        </Field>
        <Field label="Date de signature" htmlFor="agreement_signed_at" optional>
          <Input
            id="agreement_signed_at"
            name="agreement_signed_at"
            type="date"
            defaultValue={v?.agreement_signed_at ?? initial?.agreement_signed_at ?? ""}
          />
        </Field>
      </div>
      <Field
        label="Correspondance des champs (JSON)"
        htmlFor="field_mapping"
        optional
        error={fe.field_mapping}
        hint='Ex. { "verify_path": "etudiants/verifier", "enrolled": "data.inscrit", "last_name": "data.nom" }'
      >
        <Textarea
          id="field_mapping"
          name="field_mapping"
          rows={4}
          className="font-mono text-sm"
          defaultValue={v?.field_mapping ?? mapping}
        />
      </Field>
      <FormMessage type={testState.ok ? "success" : "error"}>{testState.message ?? testState.error}</FormMessage>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button variant="outline" disabled={testing} onClick={() => start(async () => setTestState(await test()))}>
          {testing ? "Test en cours…" : "Tester la connexion"}
        </Button>
        <SubmitButton pendingLabel="Enregistrement…">Enregistrer</SubmitButton>
      </div>
    </form>
  );
}

export function ResultButton({
  action,
  label,
  variant = "outline",
}: {
  action: () => Promise<FormState>;
  label: string;
  variant?: "outline" | "primary";
}) {
  const [state, setState] = useState<FormState>({});
  const [pending, start] = useTransition();
  return (
    <div className="space-y-2">
      <FormMessage type={state.ok ? "success" : "error"}>{state.message ?? state.error}</FormMessage>
      <Button
        variant={variant}
        className="h-auto min-h-11 w-full py-2.5 whitespace-normal"
        disabled={pending}
        onClick={() => start(async () => setState(await action()))}
      >
        {pending ? "En cours…" : label}
      </Button>
    </div>
  );
}
