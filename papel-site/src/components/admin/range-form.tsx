"use client";

import { useState } from "react";
import { saveRange } from "@/app/admin/actions";
import { Card } from "@/components/admin/shared";
import { FormMessage, SubmitButton } from "@/components/admin/ui";
import { useFormAction } from "@/components/admin/use-form-action";
import { Field, Input, Select, Textarea } from "@/components/forms/fields";
import { PUBLICATION_LABEL } from "@/lib/labels";
import { slugify } from "@/lib/slug";
import type { ProductRange } from "@/lib/types";

export function RangeForm({ range }: { range?: ProductRange }) {
  const { state, onSubmit, pending } = useFormAction(saveRange);
  const [slug, setSlug] = useState(range?.slug ?? "");
  const e = state?.errors ?? {};
  return (
    <form onSubmit={onSubmit} className="grid gap-6 xl:grid-cols-3">
      {range && <input type="hidden" name="id" value={range.id} />}
      <Card className="space-y-5 xl:col-span-2">
        <Field id="name" label="Nom de la gamme" error={e.name}>
          <Input
            id="name"
            name="name"
            required
            defaultValue={range?.name}
            onChange={(ev) => !range && setSlug(slugify(ev.target.value))}
          />
        </Field>
        <Field id="slug" label="Identifiant (slug)" hint={`/produits#${slug || "…"}`} error={e.slug}>
          <Input id="slug" name="slug" required value={slug} onChange={(ev) => setSlug(ev.target.value)} />
        </Field>
        <Field id="tagline" label="Accroche" error={e.tagline}>
          <Input id="tagline" name="tagline" maxLength={160} defaultValue={range?.tagline ?? ""} />
        </Field>
        <Field id="description" label="Description" error={e.description}>
          <Textarea id="description" name="description" rows={5} defaultValue={range?.description ?? ""} />
        </Field>
        <Field id="image_url" label="Image (chemin ou URL)" error={e.image_url}>
          <Input id="image_url" name="image_url" defaultValue={range?.image_url ?? ""} className="font-mono text-sm" />
        </Field>
        <Field id="new_image" label="Ou téléverser une image">
          <input
            id="new_image"
            name="new_image"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-papel-50 file:px-4 file:py-2 file:font-semibold file:text-papel-800"
          />
        </Field>
      </Card>
      <div className="space-y-6">
        <Card className="space-y-5">
          <Field id="status" label="Statut de publication">
            <Select id="status" name="status" defaultValue={range?.status ?? "draft"}>
              {Object.entries(PUBLICATION_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="is_commercialized"
              defaultChecked={range?.is_commercialized}
              className="mt-0.5 size-4 accent-papel-700"
            />
            <span>
              <span className="font-medium">Gamme commercialisée</span>
              <span className="block text-muted">Ne cochez que si les produits sont effectivement disponibles à la vente.</span>
            </span>
          </label>
          <Field id="sort_order" label="Ordre d'affichage" error={e.sort_order}>
            <Input id="sort_order" name="sort_order" type="number" min={0} defaultValue={range?.sort_order ?? 100} />
          </Field>
        </Card>
        <div className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-line">
          <FormMessage state={state} />
          <SubmitButton pending={pending}>Enregistrer la gamme</SubmitButton>
        </div>
      </div>
    </form>
  );
}
