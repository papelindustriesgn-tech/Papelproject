"use client";

import { useActionState, useState } from "react";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { applyAsUniversity } from "./actions";

export function UniversityApplicationForm({
  universities,
  cities,
}: {
  universities: { id: number; name: string }[];
  cities: { id: number; name: string }[];
}) {
  const [state, action] = useActionState(applyAsUniversity, {});
  const v = state.values ?? {};
  const fe = state.fieldErrors ?? {};
  const [uni, setUni] = useState(v.university_id ?? "");
  if (state.ok)
    return (
      <div className="bg-mint-50 rounded-[var(--radius-card)] p-8 text-center">
        <p className="text-5xl" aria-hidden>
          🎓
        </p>
        <p className="mt-3 text-xl font-extrabold">Merci !</p>
        <p className="text-ink/80 mt-1">{state.message}</p>
      </div>
    );
  return (
    <form action={action} className="space-y-4">
      <FormMessage>{state.error}</FormMessage>
      <input type="text" name="website2" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <Field label="Établissement" htmlFor="university_id">
        <Select id="university_id" name="university_id" value={uni} onChange={(e) => setUni(e.target.value)}>
          <option value="">Autre établissement (préciser)</option>
          {universities.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </Select>
      </Field>
      {uni ? (
        <input type="hidden" name="university_name" value={universities.find((u) => String(u.id) === uni)?.name ?? ""} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom officiel" htmlFor="university_name" error={fe.university_name}>
            <Input id="university_name" name="university_name" required maxLength={200} defaultValue={v.university_name} />
          </Field>
          <Field label="Ville" htmlFor="city_id">
            <Select id="city_id" name="city_id" defaultValue={v.city_id ?? ""}>
              <option value="">—</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Votre nom" htmlFor="contact_name" error={fe.contact_name}>
          <Input id="contact_name" name="contact_name" required maxLength={120} defaultValue={v.contact_name} />
        </Field>
        <Field label="Fonction" htmlFor="contact_title" optional>
          <Input
            id="contact_title"
            name="contact_title"
            maxLength={120}
            placeholder="Ex. Directeur de la scolarité"
            defaultValue={v.contact_title}
          />
        </Field>
        <Field label="Téléphone" htmlFor="phone" error={fe.phone}>
          <Input id="phone" name="phone" type="tel" required defaultValue={v.phone} />
        </Field>
        <Field label="Email professionnel" htmlFor="email" error={fe.email}>
          <Input id="email" name="email" type="email" required defaultValue={v.email} />
        </Field>
        <Field label="Nombre d'étudiants" htmlFor="student_count" optional>
          <Input id="student_count" name="student_count" type="number" min={0} defaultValue={v.student_count} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" name="has_api" defaultChecked={v.has_api === "on"} className="accent-brand-600 size-4" />
        Notre scolarité dispose d&apos;un logiciel avec API (service web)
      </label>
      <Field label="Message" htmlFor="message" optional>
        <Textarea id="message" name="message" rows={3} maxLength={1000} defaultValue={v.message} />
      </Field>
      <SubmitButton size="lg" className="w-full" pendingLabel="Envoi…">
        Demander l&apos;ouverture du portail
      </SubmitButton>
    </form>
  );
}
