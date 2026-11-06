"use client";

import { saveCompany } from "@/app/admin/actions";
import { Card } from "@/components/admin/shared";
import { FormMessage, SubmitButton } from "@/components/admin/ui";
import { useFormAction } from "@/components/admin/use-form-action";
import { Field, Input } from "@/components/forms/fields";
import type { CompanySettings } from "@/lib/types";

type Key = keyof CompanySettings;
const GROUPS: { title: string; intro?: string; fields: { k: Key; label: string; hint?: string; type?: string }[] }[] = [
  {
    title: "Coordonnées publiques",
    intro: "Un champ vide n'est pas affiché sur le site. N'indiquez que des coordonnées officielles validées.",
    fields: [
      {
        k: "whatsapp",
        label: "Numéro WhatsApp",
        hint: "Format international : +224 6XX XX XX XX. Active les boutons WhatsApp.",
        type: "tel",
      },
      { k: "phone", label: "Téléphone", type: "tel" },
      { k: "email", label: "E-mail de contact", type: "email" },
      { k: "openingHours", label: "Horaires", hint: "Ex. Du lundi au samedi, 8 h – 18 h" },
    ],
  },
  {
    title: "Réseaux sociaux officiels",
    fields: [
      { k: "facebookUrl", label: "Page Facebook", type: "url" },
      { k: "instagramUrl", label: "Compte Instagram", type: "url" },
      { k: "linkedinUrl", label: "Page LinkedIn", type: "url" },
    ],
  },
  {
    title: "Site industriel",
    intro: "La carte n'apparaît sur la page Contact que si les coordonnées GPS sont renseignées.",
    fields: [
      { k: "factoryName", label: "Nom du site" },
      { k: "factoryArea", label: "Zone / quartier" },
      { k: "factoryCity", label: "Ville" },
      { k: "country", label: "Pays" },
      { k: "factoryLat", label: "Latitude", hint: "Ex. 9.7086" },
      { k: "factoryLng", label: "Longitude", hint: "Ex. -13.3878" },
    ],
  },
  {
    title: "Identité et mentions légales",
    fields: [
      { k: "brandName", label: "Nom commercial" },
      { k: "signature", label: "Signature" },
      { k: "legalName", label: "Raison sociale" },
      { k: "legalForm", label: "Forme juridique" },
      { k: "rccm", label: "RCCM" },
      { k: "nif", label: "NIF" },
      { k: "headOffice", label: "Siège" },
    ],
  },
];

export function CompanyForm({ company }: { company: CompanySettings }) {
  const { state, onSubmit, pending } = useFormAction(saveCompany);
  const e = state?.errors ?? {};
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {GROUPS.map((g) => (
        <Card key={g.title}>
          <h2 className="font-bold text-papel-950">{g.title}</h2>
          {g.intro && <p className="mt-1 text-sm text-muted">{g.intro}</p>}
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {g.fields.map((f) => (
              <Field key={f.k} id={f.k} label={f.label} hint={f.hint} error={e[f.k]}>
                <Input
                  id={f.k}
                  name={f.k}
                  type={f.type ?? "text"}
                  defaultValue={company[f.k] == null ? "" : String(company[f.k])}
                />
              </Field>
            ))}
          </div>
        </Card>
      ))}
      <div className="sticky bottom-4 flex flex-col gap-3 rounded-2xl bg-white/95 p-4 shadow-card ring-1 ring-line backdrop-blur sm:flex-row sm:items-center">
        <SubmitButton pending={pending}>Enregistrer</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
