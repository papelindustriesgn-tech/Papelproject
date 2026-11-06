"use client";

import { useState } from "react";
import { saveProduct } from "@/app/admin/actions";
import { Card } from "@/components/admin/shared";
import { FormMessage, SubmitButton } from "@/components/admin/ui";
import { useFormAction } from "@/components/admin/use-form-action";
import { Field, Input, Select, Textarea } from "@/components/forms/fields";
import { AVAILABILITY_LABEL, PUBLICATION_LABEL } from "@/lib/labels";
import { slugify } from "@/lib/slug";
import type { Product, ProductRange } from "@/lib/types";

export function ProductForm({ product, ranges }: { product?: Product; ranges: ProductRange[] }) {
  const { state, onSubmit, pending } = useFormAction(saveProduct);
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(product));
  const e = state?.errors ?? {};
  const pendingHint = "Laisser vide si non validé — le site affichera « En cours de validation »";

  return (
    <form onSubmit={onSubmit} className="grid gap-6 xl:grid-cols-3">
      {product && <input type="hidden" name="id" value={product.id} />}
      <div className="space-y-6 xl:col-span-2">
        <Card className="space-y-5">
          <h2 className="font-bold text-papel-950">Informations commerciales</h2>
          <Field id="name" label="Nom commercial" error={e.name}>
            <Input
              id="name"
              name="name"
              required
              value={name}
              onChange={(ev) => {
                setName(ev.target.value);
                if (!slugTouched) setSlug(slugify(ev.target.value));
              }}
            />
          </Field>
          <Field id="slug" label="Adresse de la page (slug)" hint={`/produits/${slug || "…"}`} error={e.slug}>
            <Input
              id="slug"
              name="slug"
              required
              value={slug}
              onChange={(ev) => {
                setSlugTouched(true);
                setSlug(ev.target.value);
              }}
            />
          </Field>
          <Field id="short_description" label="Accroche (carte produit)" error={e.short_description}>
            <Input
              id="short_description"
              name="short_description"
              maxLength={240}
              defaultValue={product?.short_description ?? ""}
            />
          </Field>
          <Field id="description" label="Description" hint="Paragraphes séparés par une ligne vide." error={e.description}>
            <Textarea id="description" name="description" rows={7} defaultValue={product?.description ?? ""} />
          </Field>
        </Card>

        <Card className="space-y-5">
          <h2 className="font-bold text-papel-950">Caractéristiques</h2>
          <p className="text-sm text-muted">{pendingHint}.</p>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="format" label="Format" error={e.format}>
              <Input id="format" name="format" defaultValue={product?.format ?? ""} />
            </Field>
            <Field id="dimensions" label="Dimensions" error={e.dimensions}>
              <Input id="dimensions" name="dimensions" defaultValue={product?.dimensions ?? ""} />
            </Field>
            <Field id="sheet_count" label="Nombre de feuilles" error={e.sheet_count}>
              <Input id="sheet_count" name="sheet_count" defaultValue={product?.sheet_count ?? ""} />
            </Field>
            <Field id="ply_count" label="Nombre de plis" error={e.ply_count}>
              <Input id="ply_count" name="ply_count" defaultValue={product?.ply_count ?? ""} />
            </Field>
          </div>
          <Field id="packaging" label="Conditionnement" error={e.packaging}>
            <Input id="packaging" name="packaging" defaultValue={product?.packaging ?? ""} />
          </Field>
          <Field id="recommended_uses" label="Utilisations recommandées" hint="Une par ligne." error={e.recommended_uses}>
            <Textarea
              id="recommended_uses"
              name="recommended_uses"
              rows={4}
              defaultValue={product?.recommended_uses.join("\n") ?? ""}
            />
          </Field>
          <Field id="technical_info" label="Informations techniques validées" error={e.technical_info}>
            <Textarea id="technical_info" name="technical_info" rows={4} defaultValue={product?.technical_info ?? ""} />
          </Field>
        </Card>

        <Card className="space-y-5">
          <h2 className="font-bold text-papel-950">Photographies</h2>
          <Field
            id="images"
            label="Images actuelles"
            hint="Une par ligne, la première est l'image principale. Supprimez une ligne pour retirer l'image."
            error={e.images}
          >
            <Textarea
              id="images"
              name="images"
              rows={4}
              defaultValue={product?.images.join("\n") ?? ""}
              className="font-mono text-sm"
            />
          </Field>
          <Field id="new_images" label="Ajouter des photos" hint="JPG, PNG, WebP — 5 Mo maximum par image.">
            <input
              id="new_images"
              name="new_images"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              multiple
              className="block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-papel-50 file:px-4 file:py-2 file:font-semibold file:text-papel-800"
            />
          </Field>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="space-y-5">
          <h2 className="font-bold text-papel-950">Publication</h2>
          <Field id="status" label="Statut">
            <Select id="status" name="status" defaultValue={product?.status ?? "draft"}>
              {Object.entries(PUBLICATION_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="range_id" label="Gamme" error={e.range_id}>
            <Select id="range_id" name="range_id" defaultValue={product?.range_id ?? ranges[0]?.id}>
              {ranges.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                  {r.status !== "published" ? " (non publiée)" : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="availability" label="Disponibilité commerciale">
            <Select id="availability" name="availability" defaultValue={product?.availability ?? "coming_soon"}>
              {Object.entries(AVAILABILITY_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="sort_order" label="Ordre d'affichage" error={e.sort_order}>
            <Input id="sort_order" name="sort_order" type="number" min={0} defaultValue={product?.sort_order ?? 100} />
          </Field>
          <label className="flex items-center gap-3 text-sm font-medium">
            <input type="checkbox" name="is_featured" defaultChecked={product?.is_featured} className="size-4 accent-papel-700" />
            Mettre en avant sur l&apos;accueil
          </label>
        </Card>
        <Card className="space-y-5">
          <h2 className="font-bold text-papel-950">Référencement (SEO)</h2>
          <Field id="seo_title" label="Titre SEO" hint="70 caractères maximum" error={e.seo_title}>
            <Input id="seo_title" name="seo_title" maxLength={70} defaultValue={product?.seo_title ?? ""} />
          </Field>
          <Field id="seo_description" label="Description SEO" hint="170 caractères maximum" error={e.seo_description}>
            <Textarea
              id="seo_description"
              name="seo_description"
              rows={3}
              maxLength={170}
              defaultValue={product?.seo_description ?? ""}
            />
          </Field>
        </Card>
        <div className="sticky bottom-4 space-y-3 rounded-2xl bg-white/95 p-4 shadow-card ring-1 ring-line backdrop-blur">
          <FormMessage state={state} />
          <SubmitButton pending={pending}>Enregistrer le produit</SubmitButton>
        </div>
      </div>
    </form>
  );
}
