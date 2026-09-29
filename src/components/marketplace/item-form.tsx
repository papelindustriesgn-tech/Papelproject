"use client";

import { useActionState } from "react";
import { saveItem } from "@/app/(app)/marketplace/actions";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { ImageUploader, type UploadedImage } from "./image-uploader";
import { ITEM_CONDITIONS, MARKET_CATEGORIES } from "@/lib/constants";

export type ItemFormDefaults = {
  id?: string;
  title?: string;
  category?: string;
  condition?: string;
  price_gnf?: number;
  is_negotiable?: boolean;
  description?: string;
  district?: string | null;
  contact_phone?: string | null;
  images?: UploadedImage[];
};

export function ItemForm({ userId, defaults, districts }: { userId: string; defaults: ItemFormDefaults; districts: string[] }) {
  const [state, action] = useActionState(saveItem, {});
  const v = state.values;
  const fe = state.fieldErrors ?? {};
  const val = (k: keyof ItemFormDefaults) => (v?.[k] ?? (defaults[k] != null ? String(defaults[k]) : "")) as string;

  return (
    <form action={action} className="space-y-5">
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}
      <FormMessage>{state.error}</FormMessage>
      <Field label="Photos" htmlFor="images" error={fe.images}>
        <ImageUploader userId={userId} initial={defaults.images ?? []} />
      </Field>
      <Field label="Titre de l'annonce" htmlFor="title" error={fe.title}>
        <Input id="title" name="title" required minLength={3} maxLength={100} placeholder="Ex. : iPhone 11 64 Go" defaultValue={val("title")} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Catégorie" htmlFor="category" error={fe.category}>
          <Select id="category" name="category" required defaultValue={val("category")}>
            <option value="" disabled>
              Choisir
            </option>
            {Object.entries(MARKET_CATEGORIES).map(([k, c]) => (
              <option key={k} value={k}>
                {c.emoji} {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="État" htmlFor="condition" error={fe.condition}>
          <Select id="condition" name="condition" required defaultValue={val("condition") || "bon_etat"}>
            {Object.entries(ITEM_CONDITIONS).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Prix (GNF)" htmlFor="price_gnf" error={fe.price_gnf}>
        <Input id="price_gnf" name="price_gnf" type="number" inputMode="numeric" min={0} step={1000} required placeholder="Ex. : 250000" defaultValue={val("price_gnf")} />
      </Field>
      <label className="flex items-center gap-3 text-sm font-semibold">
        <input type="checkbox" name="is_negotiable" className="size-5 accent-brand-600" defaultChecked={v ? v.is_negotiable === "on" : !!defaults.is_negotiable} />
        Prix négociable
      </label>
      <Field label="Description" htmlFor="description" error={fe.description} optional>
        <Textarea id="description" name="description" maxLength={2000} rows={5} placeholder="État, accessoires fournis, raison de la vente…" defaultValue={val("description")} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Quartier" htmlFor="district" error={fe.district}>
          <Select id="district" name="district" defaultValue={val("district")}>
            <option value="">—</option>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Téléphone de contact" htmlFor="contact_phone" error={fe.contact_phone}>
          <Input id="contact_phone" name="contact_phone" type="tel" inputMode="tel" required defaultValue={val("contact_phone")} />
        </Field>
      </div>
      <p className="text-xs text-muted">Ton numéro n&apos;est visible que par les membres Uny connectés. Ne partage jamais de code reçu par SMS.</p>
      <SubmitButton size="lg" className="w-full" pendingLabel="Publication…">
        {defaults.id ? "Enregistrer les modifications" : "Publier l'annonce"}
      </SubmitButton>
    </form>
  );
}
