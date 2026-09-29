"use client";

import { useActionState, useState } from "react";
import { Lock } from "lucide-react";
import { updateProfile } from "../actions";
import { Field, FormMessage, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { GENDERS, STUDY_LEVELS } from "@/lib/constants";

type Defaults = Record<
  "first_name" | "last_name" | "birth_date" | "gender" | "phone" | "university_id" | "university_other" | "field_of_study" | "study_level" | "city_id",
  string
>;

export function EditProfileForm({
  defaults,
  locked,
  universities,
  cities,
}: {
  defaults: Defaults;
  locked: boolean;
  universities: { id: number; name: string; short_name: string | null }[];
  cities: { id: number; name: string }[];
}) {
  const [state, action] = useActionState(updateProfile, {});
  const v = { ...defaults, ...(state.values ?? {}) } as Defaults;
  const fe = state.fieldErrors ?? {};
  const [uni, setUni] = useState(v.university_id);

  return (
    <form action={action} className="space-y-4">
      <FormMessage type={state.ok ? "success" : "error"}>{state.message ?? state.error}</FormMessage>
      {locked && (
        <p className="flex items-start gap-2 rounded-2xl bg-brand-50 p-3 text-sm text-brand-900">
          <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
          Ton statut est vérifié : nom, date de naissance et établissement sont verrouillés. Contacte le support pour les corriger.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Prénom" htmlFor="first_name" error={fe.first_name}>
          <Input id="first_name" name="first_name" defaultValue={v.first_name} required disabled={locked} />
        </Field>
        <Field label="Nom" htmlFor="last_name" error={fe.last_name}>
          <Input id="last_name" name="last_name" defaultValue={v.last_name} required disabled={locked} />
        </Field>
      </div>
      {locked && (
        <>
          <input type="hidden" name="first_name" value={v.first_name} />
          <input type="hidden" name="last_name" value={v.last_name} />
          <input type="hidden" name="birth_date" value={v.birth_date} />
          <input type="hidden" name="university_id" value={v.university_id} />
          <input type="hidden" name="university_other" value={v.university_other} />
        </>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date de naissance" htmlFor="birth_date" error={fe.birth_date}>
          <Input id="birth_date" name="birth_date" type="date" defaultValue={v.birth_date} disabled={locked} />
        </Field>
        <Field label="Genre" htmlFor="gender" optional>
          <Select id="gender" name="gender" defaultValue={v.gender}>
            <option value="">—</option>
            {GENDERS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Téléphone" htmlFor="phone" error={fe.phone}>
        <Input id="phone" name="phone" type="tel" defaultValue={v.phone} required />
      </Field>
      <Field label="Établissement" htmlFor="university_id" error={fe.university_id}>
        <Select id="university_id" name="university_id" value={uni} onChange={(e) => setUni(e.target.value)} disabled={locked}>
          <option value="">—</option>
          {universities.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
          <option value="other">Autre établissement…</option>
        </Select>
      </Field>
      {uni === "other" && !locked && (
        <Field label="Nom de l'établissement" htmlFor="university_other">
          <Input id="university_other" name="university_other" defaultValue={v.university_other} />
        </Field>
      )}
      <Field label="Filière" htmlFor="field_of_study" error={fe.field_of_study}>
        <Input id="field_of_study" name="field_of_study" defaultValue={v.field_of_study} required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Niveau" htmlFor="study_level">
          <Select id="study_level" name="study_level" defaultValue={v.study_level} required>
            {STUDY_LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Ville" htmlFor="city_id">
          <Select id="city_id" name="city_id" defaultValue={v.city_id} required>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <SubmitButton size="lg" className="w-full" pendingLabel="Enregistrement…">
        Enregistrer
      </SubmitButton>
    </form>
  );
}
