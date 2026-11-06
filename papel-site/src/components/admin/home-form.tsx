"use client";

import { saveHome } from "@/app/admin/actions";
import { Card } from "@/components/admin/shared";
import { FormMessage, SubmitButton } from "@/components/admin/ui";
import { useFormAction } from "@/components/admin/use-form-action";
import { Field, Input, Textarea } from "@/components/forms/fields";
import type { HomeSettings } from "@/lib/types";

const fileCls =
  "mt-2 block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-papel-50 file:px-4 file:py-2 file:font-semibold file:text-papel-800";

export function HomeForm({ home }: { home: HomeSettings }) {
  const { state, onSubmit, pending } = useFormAction(saveHome);
  const e = state?.errors ?? {};
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card className="space-y-5">
        <h2 className="font-bold text-papel-950">Bandeau principal</h2>
        <Field id="heroEyebrow" label="Sur-titre" error={e.heroEyebrow}>
          <Input id="heroEyebrow" name="heroEyebrow" defaultValue={home.heroEyebrow} />
        </Field>
        <Field id="heroTitle" label="Titre principal" error={e.heroTitle}>
          <Input id="heroTitle" name="heroTitle" defaultValue={home.heroTitle} />
        </Field>
        <Field id="heroSubtitle" label="Sous-titre" error={e.heroSubtitle}>
          <Textarea id="heroSubtitle" name="heroSubtitle" rows={2} defaultValue={home.heroSubtitle} />
        </Field>
        <div className="grid gap-5 md:grid-cols-2">
          <Field id="heroImage" label="Visuel ordinateur (portrait)" error={e.heroImage}>
            <Input id="heroImage" name="heroImage" defaultValue={home.heroImage} className="font-mono text-sm" />
            <input
              name="new_heroImage"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              aria-label="Remplacer le visuel ordinateur"
              className={fileCls}
            />
          </Field>
          <Field id="heroImageMobile" label="Visuel mobile (paysage)" error={e.heroImageMobile}>
            <Input
              id="heroImageMobile"
              name="heroImageMobile"
              defaultValue={home.heroImageMobile}
              className="font-mono text-sm"
            />
            <input
              name="new_heroImageMobile"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              aria-label="Remplacer le visuel mobile"
              className={fileCls}
            />
          </Field>
        </div>
        <Field id="heroImageAlt" label="Description des visuels (accessibilité)" error={e.heroImageAlt}>
          <Input id="heroImageAlt" name="heroImageAlt" defaultValue={home.heroImageAlt} />
        </Field>
      </Card>
      <Card className="space-y-5">
        <h2 className="font-bold text-papel-950">Nos engagements</h2>
        <Field id="commitmentsTitle" label="Titre de la section">
          <Input id="commitmentsTitle" name="commitmentsTitle" defaultValue={home.commitmentsTitle} />
        </Field>
        <div className="grid gap-5 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-3 rounded-xl bg-sable p-4">
              <Field id={`commitment_title_${i}`} label={`Engagement ${i + 1}`}>
                <Input id={`commitment_title_${i}`} name={`commitment_title_${i}`} defaultValue={home.commitments[i]?.title} />
              </Field>
              <Field id={`commitment_text_${i}`} label="Texte">
                <Textarea
                  id={`commitment_text_${i}`}
                  name={`commitment_text_${i}`}
                  rows={4}
                  defaultValue={home.commitments[i]?.text}
                />
              </Field>
            </div>
          ))}
        </div>
        {e.commitments && <p className="text-sm text-corail">{e.commitments}</p>}
      </Card>
      <Card className="space-y-5">
        <h2 className="font-bold text-papel-950">Notre entreprise & appel à l&apos;action</h2>
        <Field id="companyTitle" label="Titre « Notre entreprise »">
          <Input id="companyTitle" name="companyTitle" defaultValue={home.companyTitle} />
        </Field>
        <Field id="companyText" label="Texte « Notre entreprise »">
          <Textarea id="companyText" name="companyText" rows={4} defaultValue={home.companyText} />
        </Field>
        <Field id="closingTitle" label="Titre final">
          <Input id="closingTitle" name="closingTitle" defaultValue={home.closingTitle} />
        </Field>
        <Field id="closingText" label="Texte final">
          <Textarea id="closingText" name="closingText" rows={2} defaultValue={home.closingText} />
        </Field>
      </Card>
      <div className="sticky bottom-4 flex flex-col gap-3 rounded-2xl bg-white/95 p-4 shadow-card ring-1 ring-line backdrop-blur sm:flex-row sm:items-center">
        <SubmitButton pending={pending}>Enregistrer</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
