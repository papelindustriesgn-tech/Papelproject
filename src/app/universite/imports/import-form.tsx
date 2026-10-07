"use client";

import { useActionState } from "react";
import { Field, FormMessage, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { importRoster, type ImportState } from "../actions";

export function ImportForm({ years }: { years: string[] }) {
  const [state, run] = useActionState<ImportState, FormData>(importRoster, {});
  const r = state.report;
  return (
    <form action={run} className="space-y-4">
      <FormMessage type={state.ok ? "success" : "error"}>{state.message ?? state.error}</FormMessage>
      {r && (
        <div className="bg-mint-50 text-ink rounded-2xl p-4 text-sm" data-testid="import-report">
          <p>
            <strong>{r.rows.toLocaleString("fr-FR")}</strong> étudiants enregistrés (sous forme d&apos;empreintes).
            {r.skipped + r.duplicates > 0 && (
              <>
                {" "}
                {r.skipped} ligne{r.skipped > 1 ? "s" : ""} incomplète{r.skipped > 1 ? "s" : ""} et {r.duplicates} doublon
                {r.duplicates > 1 ? "s" : ""} ignorés.
              </>
            )}
          </p>
          <p className="mt-1">
            Demandes rapprochées : <strong>{r.verified}</strong> confirmée{r.verified > 1 ? "s" : ""} automatiquement,{" "}
            <strong>{r.review}</strong> à examiner.
          </p>
          <p className="text-muted mt-1 text-xs">
            Colonnes reconnues : {r.columns.join(", ")}.{r.missing.length > 0 && <> Absentes : {r.missing.join(", ")}.</>}
          </p>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Année universitaire" htmlFor="academic_year">
          <Select id="academic_year" name="academic_year" defaultValue={years[0]}>
            {years.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </Select>
        </Field>
        <Field label="Fichier Excel (.xlsx) ou CSV" htmlFor="file">
          <Input id="file" name="file" type="file" accept=".xlsx,.csv,text/csv" required className="h-auto py-2.5" />
        </Field>
      </div>
      <SubmitButton className="w-full" pendingLabel="Import et rapprochement…">
        Importer la liste
      </SubmitButton>
    </form>
  );
}
