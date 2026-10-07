"use client";

import { useActionState, useState, useTransition } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Field, FormMessage, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import { EMAIL_PROVIDERS, type StudentEmailSettings } from "@/lib/student-email";
import { checkEmailDns, saveEmailSettings, type DnsCheck } from "../university-actions";

export function EmailSettingsForm({ settings }: { settings: StudentEmailSettings }) {
  const [state, run] = useActionState(saveEmailSettings, {});
  const fe = state.fieldErrors ?? {};
  return (
    <form action={run} className="space-y-4">
      <FormMessage type={state.ok ? "success" : "error"}>{state.message ?? state.error}</FormMessage>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Domaine des adresses étudiantes"
          htmlFor="domain"
          error={fe.domain}
          hint="Ex. etu.unyafrica.com (après achat du domaine)"
        >
          <Input id="domain" name="domain" defaultValue={settings.domain ?? ""} placeholder="etu.unyafrica.com" />
        </Field>
        <Field label="Fournisseur de messagerie" htmlFor="provider">
          <Select id="provider" name="provider" defaultValue={settings.provider}>
            {Object.entries(EMAIL_PROVIDERS).map(([k, p]) => (
              <option key={k} value={k}>
                {p.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Fin du statut étudiant" htmlFor="expiry_policy">
          <Select id="expiry_policy" name="expiry_policy" defaultValue={settings.expiry_policy}>
            <option value="suspend">Suspendre l&apos;adresse (réactivable)</option>
            <option value="alumni">Passer en adresse alumni</option>
          </Select>
        </Field>
        <Field label="Délai de grâce (jours)" htmlFor="grace_days">
          <Input id="grace_days" name="grace_days" type="number" min={0} max={365} defaultValue={settings.grace_days} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" name="auto_allocate" defaultChecked={settings.auto_allocate} className="accent-brand-600 size-4" />
        Réserver automatiquement une adresse à chaque étudiant vérifié par son université
      </label>
      <SubmitButton className="w-full" pendingLabel="Enregistrement…">
        Enregistrer
      </SubmitButton>
    </form>
  );
}

export function DnsChecker() {
  const [result, setResult] = useState<{ checks?: DnsCheck; error?: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        className="h-auto min-h-11 w-full py-2.5 whitespace-normal"
        disabled={pending}
        onClick={() => start(async () => setResult(await checkEmailDns()))}
      >
        {pending ? "Vérification DNS…" : "Vérifier SPF, DKIM et DMARC"}
      </Button>
      {result?.error && <FormMessage>{result.error}</FormMessage>}
      {result?.checks && (
        <ul className="space-y-2 text-sm">
          {result.checks.map((c) => (
            <li key={c.label} className="flex items-start gap-2">
              {c.ok ? (
                <CheckCircle2 className="text-mint-500 mt-0.5 size-4 shrink-0" aria-label="OK" />
              ) : (
                <XCircle className="text-coral-500 mt-0.5 size-4 shrink-0" aria-label="Manquant" />
              )}
              <span className="min-w-0">
                <strong>{c.label}</strong> <span className="text-muted font-mono text-xs break-all">{c.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
