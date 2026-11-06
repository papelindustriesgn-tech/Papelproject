"use client";

import { useState } from "react";
import { saveNews } from "@/app/admin/actions";
import { Card } from "@/components/admin/shared";
import { FormMessage, SubmitButton } from "@/components/admin/ui";
import { useFormAction } from "@/components/admin/use-form-action";
import { Field, Input, Select, Textarea } from "@/components/forms/fields";
import { NEWS_CATEGORY_LABEL, PUBLICATION_LABEL } from "@/lib/labels";
import { slugify } from "@/lib/slug";
import type { NewsPost } from "@/lib/types";

/** Valeur pour <input type="datetime-local"> en heure de Conakry (UTC+0). */
function toLocalInput(iso: string | null | undefined) {
  return iso ? new Date(iso).toISOString().slice(0, 16) : "";
}

export function NewsForm({ post }: { post?: NewsPost }) {
  const { state, onSubmit, pending } = useFormAction(saveNews);
  const [slug, setSlug] = useState(post?.slug ?? "");
  const e = state?.errors ?? {};
  return (
    <form onSubmit={onSubmit} className="grid gap-6 xl:grid-cols-3">
      {post && <input type="hidden" name="id" value={post.id} />}
      <div className="space-y-6 xl:col-span-2">
        <Card className="space-y-5">
          <Field id="title" label="Titre" error={e.title}>
            <Input
              id="title"
              name="title"
              required
              defaultValue={post?.title}
              onChange={(ev) => !post && setSlug(slugify(ev.target.value))}
            />
          </Field>
          <Field id="slug" label="Adresse (slug)" hint={`/actualites/${slug || "…"}`} error={e.slug}>
            <Input id="slug" name="slug" required value={slug} onChange={(ev) => setSlug(ev.target.value)} />
          </Field>
          <Field id="excerpt" label="Chapô (résumé)" error={e.excerpt}>
            <Textarea id="excerpt" name="excerpt" rows={2} maxLength={300} defaultValue={post?.excerpt ?? ""} />
          </Field>
          <Field
            id="content"
            label="Contenu de l'article"
            hint="Paragraphes séparés par une ligne vide · « ## » pour un intertitre · « - » pour une liste · **gras** · [lien](https://…)"
            error={e.content}
          >
            <Textarea id="content" name="content" rows={16} defaultValue={post?.content ?? ""} />
          </Field>
        </Card>
        <Card className="space-y-5">
          <h2 className="font-bold text-papel-950">Image de couverture</h2>
          <Field id="cover_image" label="Image actuelle (chemin ou URL)" error={e.cover_image}>
            <Input id="cover_image" name="cover_image" defaultValue={post?.cover_image ?? ""} className="font-mono text-sm" />
          </Field>
          <Field id="new_cover" label="Ou téléverser une image">
            <input
              id="new_cover"
              name="new_cover"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-papel-50 file:px-4 file:py-2 file:font-semibold file:text-papel-800"
            />
          </Field>
        </Card>
      </div>
      <div className="space-y-6">
        <Card className="space-y-5">
          <Field id="status" label="Statut">
            <Select id="status" name="status" defaultValue={post?.status ?? "draft"}>
              {Object.entries(PUBLICATION_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="category" label="Catégorie">
            <Select id="category" name="category" defaultValue={post?.category ?? "nouveautes"}>
              {Object.entries(NEWS_CATEGORY_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            id="published_at"
            label="Date de publication (heure de Conakry)"
            hint="Vide : date du jour lors de la publication. Une date future programme l'article."
            error={e.published_at}
          >
            <Input id="published_at" name="published_at" type="datetime-local" defaultValue={toLocalInput(post?.published_at)} />
          </Field>
        </Card>
        <Card className="space-y-5">
          <h2 className="font-bold text-papel-950">Référencement (SEO)</h2>
          <Field id="seo_title" label="Titre SEO" error={e.seo_title}>
            <Input id="seo_title" name="seo_title" maxLength={70} defaultValue={post?.seo_title ?? ""} />
          </Field>
          <Field id="seo_description" label="Description SEO" error={e.seo_description}>
            <Textarea
              id="seo_description"
              name="seo_description"
              rows={3}
              maxLength={170}
              defaultValue={post?.seo_description ?? ""}
            />
          </Field>
        </Card>
        <div className="sticky bottom-4 space-y-3 rounded-2xl bg-white/95 p-4 shadow-card ring-1 ring-line backdrop-blur">
          <FormMessage state={state} />
          <SubmitButton pending={pending}>Enregistrer l&apos;actualité</SubmitButton>
        </div>
      </div>
    </form>
  );
}
