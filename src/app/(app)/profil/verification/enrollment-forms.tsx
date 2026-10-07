"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2 } from "lucide-react";
import { Field, FormMessage, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { createClient } from "@/lib/supabase/client";
import { compressImage, randomName } from "@/lib/image-client";
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

const MAX = 5 * 1024 * 1024;

export function BacForm({ userId }: { userId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    if (!file) return setError("Ajoute ton relevé de notes ou ton attestation de réussite.");
    start(async () => {
      let blob: Blob = file;
      let ext = "pdf";
      if (file.type.startsWith("image/")) {
        blob = await compressImage(file, 2000, 0.85);
        ext = "jpg";
      } else if (file.type !== "application/pdf") return setError("Formats acceptés : photo ou PDF.");
      if (blob.size > MAX) return setError("Fichier trop lourd (5 Mo maximum).");
      const path = `${userId}/bac-${randomName(ext)}`;
      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from("verification-docs")
        .upload(path, blob, { contentType: ext === "pdf" ? "application/pdf" : "image/jpeg" });
      if (upErr) return setError("Envoi impossible. Vérifie ta connexion et réessaie.");
      form.set("document_path", path);
      const res = await submitBac({}, form);
      if (res.error) setError(res.error);
      else {
        setDone(res.message ?? "Envoyé");
        router.refresh();
      }
    });
  }

  if (done) return <FormMessage type="success">{done}</FormMessage>;
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormMessage>{error}</FormMessage>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Année du BAC" htmlFor="exam_year">
          <Input id="exam_year" name="exam_year" type="number" min={1990} max={new Date().getFullYear()} required />
        </Field>
        <Field label="Numéro de candidat (PV)" htmlFor="candidate_number">
          <Input id="candidate_number" name="candidate_number" required maxLength={30} className="font-mono" autoComplete="off" />
        </Field>
      </div>
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="border-brand-200 bg-brand-50/40 hover:bg-brand-50 flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-4 py-5 text-center"
      >
        <FileUp className="text-brand-600 size-6" aria-hidden />
        <span className="text-brand-800 max-w-full truncate text-sm font-semibold">
          {file ? file.name : "Relevé de notes ou attestation de réussite"}
        </span>
        <span className="text-muted text-xs">Photo ou PDF · 5 Mo max · supprimé après vérification</span>
      </button>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        data-testid="bac-input"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <Button type="submit" variant="outline" className="w-full" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        Envoyer pour vérification
      </Button>
    </form>
  );
}
