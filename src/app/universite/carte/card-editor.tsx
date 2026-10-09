"use client";

import { useActionState, useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { UnyCard, type UnyCardData } from "@/components/card/uny-card";
import { Field, FormMessage, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { createClient } from "@/lib/supabase/client";
import { randomName, resizeLogo } from "@/lib/image-client";
import { cn } from "@/lib/cn";
import {
  CARD_FIELD_LABELS,
  CARD_FIELDS,
  CARD_LAYOUTS,
  HEX_COLOR,
  type CardBranding,
  type CardField,
  type CardLayout,
  type CardTemplate,
} from "@/lib/card-template";
import { saveCardDesign } from "../actions";

function ColorField({
  name,
  label,
  value,
  onChange,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label} htmlFor={name}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} (sélecteur)`}
          value={HEX_COLOR.test(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="border-line h-11 w-14 shrink-0 cursor-pointer rounded-xl border bg-white p-1"
        />
        <Input
          id={name}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={7}
          className="font-mono"
        />
      </div>
    </Field>
  );
}

export function CardEditor({
  universityId,
  initial,
  template,
  uploadPrefix,
  sample,
}: {
  universityId: number;
  initial: CardBranding;
  template: CardTemplate;
  uploadPrefix: string;
  sample: UnyCardData;
}) {
  const [state, run] = useActionState(saveCardDesign.bind(null, universityId), {});
  const [b, setB] = useState(initial);
  const [layout, setLayout] = useState<CardLayout>(template.layout);
  const [fields, setFields] = useState<CardField[]>(template.fields);
  const [labels, setLabels] = useState(template.labels);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const set = (k: keyof CardBranding) => (v: string) => setB((x) => ({ ...x, [k]: v }));
  const valid = [b.primary, b.secondary, b.accent].every((c) => HEX_COLOR.test(c));
  const fe = state.fieldErrors ?? {};

  async function upload(f: File) {
    setBusy(true);
    setErr(null);
    try {
      if (f.size > 3 * 1024 * 1024) throw new Error("size");
      const blob = await resizeLogo(f);
      const supabase = createClient();
      const path = `${uploadPrefix}/${randomName("png")}`;
      const { error } = await supabase.storage
        .from("marketplace")
        .upload(path, blob, { contentType: blob.type || "image/png", cacheControl: "31536000" });
      if (error) throw error;
      setB((x) => ({ ...x, logoUrl: supabase.storage.from("marketplace").getPublicUrl(path).data.publicUrl }));
    } catch {
      setErr("Envoi impossible : PNG, JPG ou WebP de moins de 3 Mo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
      <form action={run} className="order-2 space-y-5 lg:order-1">
        <FormMessage type={state.ok ? "success" : "error"}>{state.message ?? state.error}</FormMessage>

        <section className="space-y-4 rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
          <h2 className="font-bold">Identité de l&apos;établissement</h2>
          <Field label="Nom officiel (affiché sur la carte)" htmlFor="official_name" error={fe.official_name}>
            <Input
              id="official_name"
              name="official_name"
              value={b.name}
              onChange={(e) => set("name")(e.target.value)}
              maxLength={200}
              required
            />
          </Field>
          <div>
            <p className="mb-1.5 text-sm font-semibold">Logo</p>
            <input type="hidden" name="logo_url" value={b.logoUrl ?? ""} />
            <div className="flex items-center gap-3">
              {b.logoUrl ? (
                <span className="bg-canvas ring-line relative flex size-20 items-center justify-center overflow-hidden rounded-xl ring-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain p-1" />
                  <button
                    type="button"
                    onClick={() => setB((x) => ({ ...x, logoUrl: null }))}
                    className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-white shadow"
                    aria-label="Retirer le logo"
                  >
                    <X className="size-3.5" />
                  </button>
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => file.current?.click()}
                className="border-brand-200 text-brand-700 flex h-20 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-dashed text-sm font-semibold"
              >
                {busy ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
                {b.logoUrl ? "Changer le logo" : "Ajouter le logo (PNG transparent idéalement)"}
              </button>
              <input
                ref={file}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                data-testid="logo-input"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) upload(f);
                  e.target.value = "";
                }}
              />
            </div>
            {err && <p className="text-coral-600 mt-1 text-sm">{err}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <ColorField name="primary_color" label="Couleur principale" value={b.primary} onChange={set("primary")} />
            <ColorField name="secondary_color" label="Couleur secondaire" value={b.secondary} onChange={set("secondary")} />
            <ColorField name="accent_color" label="Couleur d'accent" value={b.accent} onChange={set("accent")} />
          </div>
        </section>

        <section className="space-y-4 rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
          <h2 className="font-bold">Modèle de carte</h2>
          <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Modèle de carte">
            {(Object.keys(CARD_LAYOUTS) as CardLayout[]).map((l) => (
              <label
                key={l}
                className={cn(
                  "cursor-pointer rounded-2xl border p-3 text-sm transition",
                  layout === l ? "border-brand-500 bg-brand-50 ring-brand-100 ring-4" : "border-line hover:border-brand-300",
                )}
              >
                <input
                  type="radio"
                  name="layout"
                  value={l}
                  checked={layout === l}
                  onChange={() => setLayout(l)}
                  className="sr-only"
                />
                <span className="block font-bold">{CARD_LAYOUTS[l].label}</span>
                <span className="text-muted">{CARD_LAYOUTS[l].hint}</span>
              </label>
            ))}
          </div>
          <div>
            <p className="mb-1 text-sm font-semibold">Informations affichées</p>
            <p className="text-muted mb-3 text-xs">
              Toujours présents : nom, photo, identifiant Uny, QR code sécurisé et statut de vérification.
            </p>
            <ul className="space-y-2">
              {CARD_FIELDS.map((f) => (
                <li key={f} className="flex items-center gap-3">
                  <label className="flex w-40 shrink-0 items-center gap-2 text-sm font-semibold">
                    <input
                      type="checkbox"
                      name="fields"
                      value={f}
                      checked={fields.includes(f)}
                      onChange={(e) =>
                        setFields((x) =>
                          e.target.checked ? CARD_FIELDS.filter((y) => y === f || x.includes(y)) : x.filter((y) => y !== f),
                        )
                      }
                      className="accent-brand-600 size-4"
                    />
                    {CARD_FIELD_LABELS[f]}
                  </label>
                  <Input
                    name={`label_${f}`}
                    value={labels[f] ?? ""}
                    onChange={(e) => setLabels((x) => ({ ...x, [f]: e.target.value }))}
                    maxLength={30}
                    placeholder={`Libellé : ${CARD_FIELD_LABELS[f]}`}
                    aria-label={`Libellé personnalisé pour ${CARD_FIELD_LABELS[f]}`}
                    className="h-10 text-sm"
                    disabled={!fields.includes(f)}
                  />
                </li>
              ))}
            </ul>
          </div>
        </section>

        <SubmitButton size="lg" className="w-full" pendingLabel="Publication…" disabled={!valid || busy}>
          Enregistrer et publier la carte
        </SubmitButton>
      </form>

      <aside className="order-1 lg:order-2">
        <div className="lg:sticky lg:top-20">
          <p className="mb-2 text-sm font-semibold">Aperçu en direct</p>
          <UnyCard
            sample
            data={{
              ...sample,
              branding: valid ? b : { ...b, primary: "#1e3a8a", secondary: "#2563eb", accent: "#f59e0b" },
              template: { layout, fields, labels },
            }}
          />
          <p className="text-muted mt-3 text-xs">
            Les éléments Uny (logo uny., identifiant, QR code, statut) restent communs à toutes les universités : un partenaire
            reconnaît une carte Uny au premier coup d&apos;œil.
          </p>
        </div>
      </aside>
    </div>
  );
}
