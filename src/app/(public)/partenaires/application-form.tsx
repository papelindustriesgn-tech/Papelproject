"use client";

import { useActionState } from "react";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { DEAL_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/cn";
import { applyAsPartner } from "./actions";

const WANTS = [
  { value: "avantages", label: "🏷️ Offres étudiantes" },
  { value: "marketplace", label: "🛍️ Vendre mes produits" },
  { value: "logements", label: "🏠 Logements" },
  { value: "jobs", label: "💼 Jobs & stages" },
];

export function ApplicationForm({ cities }: { cities: { id: number; name: string; slug: string }[] }) {
  const [state, action] = useActionState(applyAsPartner, {});
  const v = state.values ?? {};
  const fe = state.fieldErrors ?? {};
  if (state.ok)
    return (
      <div className="bg-mint-50 rounded-[var(--radius-card)] p-8 text-center">
        <p className="text-5xl" aria-hidden>
          🤝
        </p>
        <p className="mt-3 text-xl font-extrabold">Merci !</p>
        <p className="text-ink/80 mt-1">{state.message}</p>
      </div>
    );
  return (
    <form action={action} className="space-y-4" key={JSON.stringify(v)}>
      <FormMessage>{state.error}</FormMessage>
      <input type="text" name="website2" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <Field label="Nom de l'établissement" htmlFor="business_name" error={fe.business_name}>
        <Input id="business_name" name="business_name" defaultValue={v.business_name} required maxLength={120} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Activité" htmlFor="category" error={fe.category}>
          <Select id="category" name="category" defaultValue={v.category ?? ""} required>
            <option value="">Choisir</option>
            {Object.entries(DEAL_CATEGORIES).map(([value, c]) => (
              <option key={value} value={value}>
                {c.emoji} {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Ville" htmlFor="city_id" error={fe.city_id}>
          <Select
            id="city_id"
            name="city_id"
            defaultValue={v.city_id ?? String(cities.find((c) => c.slug === "conakry")?.id ?? "")}
            required
          >
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Ce que tu veux proposer aux étudiants</legend>
        <div className="flex flex-wrap gap-2">
          {WANTS.map((w) => (
            <label
              key={w.value}
              className={cn(
                "ring-line has-[:checked]:bg-brand-600 has-[:checked]:ring-brand-600 cursor-pointer rounded-2xl bg-white px-3.5 py-2.5 text-sm font-semibold ring-1 has-[:checked]:text-white",
              )}
            >
              <input type="checkbox" name="wants" value={w.value} defaultChecked={w.value === "avantages"} className="sr-only" />
              {w.label}
            </label>
          ))}
        </div>
        {fe.wants && <p className="text-coral-600 mt-1 text-sm">{fe.wants}</p>}
      </fieldset>
      <Field label="Ton offre pour les étudiants" htmlFor="offer" optional hint="Ex. : -15 % sur présentation de la carte Uny">
        <Textarea id="offer" name="offer" defaultValue={v.offer} rows={3} maxLength={1000} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ton nom" htmlFor="contact_name" error={fe.contact_name}>
          <Input id="contact_name" name="contact_name" defaultValue={v.contact_name} required autoComplete="name" />
        </Field>
        <Field label="Téléphone / WhatsApp" htmlFor="phone" error={fe.phone}>
          <Input id="phone" name="phone" type="tel" inputMode="tel" defaultValue={v.phone} required placeholder="620 00 00 00" />
        </Field>
      </div>
      <Field label="Email" htmlFor="email" error={fe.email} hint="Il servira d'identifiant pour ton espace partenaire.">
        <Input id="email" name="email" type="email" defaultValue={v.email} required autoComplete="email" />
      </Field>
      <SubmitButton size="lg" className="w-full" pendingLabel="Envoi…">
        Envoyer ma demande
      </SubmitButton>
    </form>
  );
}
