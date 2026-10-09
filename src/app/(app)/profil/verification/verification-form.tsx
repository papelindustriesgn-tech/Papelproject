"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { compressImage, randomName } from "@/lib/image-client";
import { submitVerification } from "../actions";
import { Field, FormMessage, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { DOCUMENT_TYPES } from "@/lib/constants";
import { Loader2 } from "lucide-react";

const MAX = 5 * 1024 * 1024;

export function VerificationForm({ userId }: { userId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    if (!form.get("document_type")) return setError("Choisis le type de document.");
    if (!file) return setError("Ajoute une photo ou un PDF de ton justificatif.");

    start(async () => {
      let blob: Blob = file;
      let ext = "pdf";
      if (file.type.startsWith("image/")) {
        blob = await compressImage(file, 2000, 0.85);
        ext = "jpg";
      } else if (file.type !== "application/pdf") {
        setError("Formats acceptés : photo (JPG, PNG, WebP) ou PDF.");
        return;
      }
      if (blob.size > MAX) {
        setError("Fichier trop lourd (5 Mo maximum).");
        return;
      }
      const path = `${userId}/${randomName(ext)}`;
      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from("verification-docs")
        .upload(path, blob, { contentType: ext === "pdf" ? "application/pdf" : "image/jpeg" });
      if (upErr) {
        setError("Envoi impossible. Vérifie ta connexion et réessaie.");
        return;
      }
      form.set("document_path", path);
      const res = await submitVerification({}, form);
      if (res.error) setError(res.error);
      else {
        setSuccess(res.message ?? "Envoyé !");
        router.refresh();
      }
    });
  }

  if (success) return <FormMessage type="success">{success}</FormMessage>;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormMessage>{error}</FormMessage>
      <Field label="Type de justificatif" htmlFor="document_type">
        <Select id="document_type" name="document_type" defaultValue="" required>
          <option value="" disabled>
            Choisir
          </option>
          {Object.entries(DOCUMENT_TYPES).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </Select>
      </Field>
      <div>
        <p className="mb-1.5 text-sm font-semibold">Document</p>
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="border-brand-200 bg-brand-50/40 hover:bg-brand-50 flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-center"
        >
          <FileUp className="text-brand-600 size-7" aria-hidden />
          <span className="text-brand-800 max-w-full truncate text-sm font-semibold">
            {file ? file.name : "Prendre une photo ou choisir un fichier"}
          </span>
          <span className="text-muted text-xs">JPG, PNG, WebP ou PDF · 5 Mo max</span>
        </button>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          data-testid="doc-input"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>
      <Field label="Commentaire" htmlFor="note" optional>
        <Textarea id="note" name="note" maxLength={500} rows={3} placeholder="Une précision pour l'équipe de vérification ?" />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        {pending ? "Envoi en cours…" : "Envoyer mon justificatif"}
      </Button>
    </form>
  );
}
