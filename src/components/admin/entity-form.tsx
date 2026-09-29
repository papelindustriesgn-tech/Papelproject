"use client";

import Image from "next/image";
import { useActionState, useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import type { FieldSpec } from "@/lib/admin-entities";
import type { FormState } from "@/lib/actions/types";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { createClient } from "@/lib/supabase/client";
import { compressImage, randomName } from "@/lib/image-client";

type Values = Record<string, unknown>;

async function uploadContent(file: File) {
  const blob = await compressImage(file, 1600, 0.82);
  const supabase = createClient();
  const path = `admin/${randomName("jpg")}`;
  const { error } = await supabase.storage.from("content").upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
  if (error) throw error;
  return supabase.storage.from("content").getPublicUrl(path).data.publicUrl;
}

function ImagesField({ name, initial, max, single }: { name: string; initial: string[]; max: number; single?: boolean }) {
  const [urls, setUrls] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  return (
    <div>
      <input type="hidden" name={name} value={single ? (urls[0] ?? "") : JSON.stringify(urls)} />
      <div className="flex flex-wrap gap-2">
        {urls.map((u) => (
          <div key={u} className="relative size-24 overflow-hidden rounded-xl bg-canvas ring-1 ring-line">
            <Image src={u} alt="" fill sizes="96px" className="object-cover" />
            <button type="button" onClick={() => setUrls((x) => x.filter((y) => y !== u))} className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-white shadow" aria-label="Retirer">
              <X className="size-3.5" />
            </button>
          </div>
        ))}
        {urls.length < max && (
          <button type="button" onClick={() => input.current?.click()} className="flex size-24 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-brand-200 text-xs font-semibold text-brand-700">
            {busy ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
            Ajouter
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={!single}
        className="hidden"
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []).slice(0, max - urls.length);
          setBusy(true);
          setErr(null);
          try {
            const added: string[] = [];
            for (const f of files) added.push(await uploadContent(f));
            setUrls((x) => (single ? added.slice(0, 1) : [...x, ...added]));
          } catch {
            setErr("Envoi impossible.");
          } finally {
            setBusy(false);
            e.target.value = "";
          }
        }}
      />
      {!single && (
        <p className="mt-1 text-xs text-muted">Ou colle des URL d&apos;images (une par ligne) :</p>
      )}
      {!single && (
        <Textarea
          aria-label="URL d'images"
          className="mt-1 min-h-16 text-sm"
          placeholder="https://…"
          onBlur={(e) => {
            const extra = e.target.value.split(/\s+/).filter((l) => /^https?:\/\//.test(l));
            if (extra.length) setUrls((x) => [...x, ...extra].slice(0, max));
            e.target.value = "";
          }}
        />
      )}
      {single && (
        <Input
          className="mt-2 h-10 text-sm"
          placeholder="…ou URL https://"
          aria-label="URL de l'image"
          defaultValue=""
          onBlur={(e) => {
            if (/^https?:\/\//.test(e.target.value)) setUrls([e.target.value]);
            e.target.value = "";
          }}
        />
      )}
      {err && <p className="mt-1 text-sm text-coral-600">{err}</p>}
    </div>
  );
}

export function EntityForm({
  fields,
  initial,
  action,
  partners,
  districts,
  submitLabel,
}: {
  fields: FieldSpec[];
  initial: Values;
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  partners: { id: string; name: string }[];
  districts: string[];
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const fe = state.fieldErrors ?? {};
  const val = (n: string) => (state.values ? state.values[n] : initial[n]);

  return (
    <form action={formAction} className="space-y-4" key={state.values ? JSON.stringify(state.values) : "init"}>
      <FormMessage>{state.error}</FormMessage>
      {fields.map((f) => {
        const v = val(f.name);
        if (f.type === "checkbox") {
          const checked = state.values ? v === "on" : v === undefined ? !!f.defaultValue : !!v;
          return (
            <label key={f.name} className="flex items-start gap-3 rounded-2xl bg-canvas p-3 text-sm">
              <input type="checkbox" name={f.name} defaultChecked={checked} className="mt-0.5 size-5 accent-brand-600" />
              <span>
                <span className="font-semibold">{f.label}</span>
                {f.hint && <span className="block text-xs text-muted">{f.hint}</span>}
              </span>
            </label>
          );
        }
        return (
          <Field key={f.name} label={f.label} htmlFor={f.name} error={fe[f.name]} hint={"hint" in f ? f.hint : undefined} optional={!("required" in f && f.required) && !["image", "images", "tags"].includes(f.type)}>
            {f.type === "textarea" ? (
              <Textarea id={f.name} name={f.name} defaultValue={(v as string) ?? ""} maxLength={f.max} rows={4} />
            ) : f.type === "select" ? (
              <Select id={f.name} name={f.name} defaultValue={(v as string) ?? ""} required={f.required}>
                <option value="">—</option>
                {(f.options === "partners" ? partners.map((p) => ({ value: p.id, label: p.name })) : f.options === "districts" ? districts.map((d) => ({ value: d, label: d })) : f.options).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            ) : f.type === "tags" ? (
              <Input id={f.name} name={f.name} defaultValue={Array.isArray(v) ? v.join(", ") : ((v as string) ?? "")} />
            ) : f.type === "images" ? (
              <ImagesField name={f.name} initial={Array.isArray(v) ? (v as string[]) : typeof v === "string" && v ? (JSON.parse(v) as string[]) : []} max={f.max ?? 8} />
            ) : f.type === "image" ? (
              <ImagesField name={f.name} initial={v ? [v as string] : []} max={1} single />
            ) : (
              <Input
                id={f.name}
                name={f.name}
                type={f.type}
                defaultValue={(v as string | number | undefined) ?? ""}
                required={"required" in f ? f.required : false}
                {...(f.type === "number" ? { min: f.min, max: f.max, step: f.step ?? 1, inputMode: "numeric" as const } : {})}
                {...("placeholder" in f ? { placeholder: f.placeholder } : {})}
              />
            )}
          </Field>
        );
      })}
      <SubmitButton size="lg" className="w-full" pendingLabel="Enregistrement…">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
