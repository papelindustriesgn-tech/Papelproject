"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { signUp } from "../actions";
import { Field, FormMessage, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

type University = { id: number; name: string; short_name: string | null };

/** Inscription en un seul écran : 5 informations. Le reste est demandé au moment de la vérification. */
export function SignUpForm({ universities }: { universities: University[] }) {
  const [state, action] = useActionState(signUp, {});
  const [showPwd, setShowPwd] = useState(false);
  const [uni, setUni] = useState(state.values?.university_id ?? "");
  const v = state.values ?? {};
  const fe = state.fieldErrors ?? {};

  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    if (state.values?.university_id) setUni(state.values.university_id);
  }

  return (
    <form action={action} className="space-y-4" key={JSON.stringify(v)}>
      <FormMessage>{state.error}</FormMessage>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Prénom" htmlFor="first_name" error={fe.first_name}>
          <Input
            id="first_name"
            name="first_name"
            autoComplete="given-name"
            required
            maxLength={60}
            defaultValue={v.first_name}
            aria-invalid={!!fe.first_name}
          />
        </Field>
        <Field label="Nom" htmlFor="last_name" error={fe.last_name}>
          <Input
            id="last_name"
            name="last_name"
            autoComplete="family-name"
            required
            maxLength={60}
            defaultValue={v.last_name}
            aria-invalid={!!fe.last_name}
          />
        </Field>
      </div>
      <Field label="Email" htmlFor="email" error={fe.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="toi@email.com"
          required
          defaultValue={v.email}
          aria-invalid={!!fe.email}
        />
      </Field>
      <Field
        label="Mot de passe"
        htmlFor="password"
        error={fe.password}
        hint="8 caractères minimum, avec une lettre et un chiffre."
      >
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPwd ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={8}
            pattern="(?=.*[A-Za-z])(?=.*\d).{8,}"
            className="pr-12"
            aria-invalid={!!fe.password}
          />
          <button
            type="button"
            onClick={() => setShowPwd((s) => !s)}
            className="text-muted hover:bg-canvas absolute top-1/2 right-2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full"
            aria-label={showPwd ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            {showPwd ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </div>
      </Field>
      <Field label="Établissement" htmlFor="university_id" error={fe.university_id}>
        <Select
          id="university_id"
          name="university_id"
          required
          value={uni}
          onChange={(e) => setUni(e.target.value)}
          aria-invalid={!!fe.university_id}
        >
          <option value="" disabled>
            Choisis ton établissement
          </option>
          {universities.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
              {u.short_name ? ` (${u.short_name})` : ""}
            </option>
          ))}
          <option value="other">Autre établissement…</option>
        </Select>
      </Field>
      {uni === "other" && (
        <Field label="Nom de l'établissement" htmlFor="university_other" error={fe.university_other}>
          <Input id="university_other" name="university_other" required maxLength={120} defaultValue={v.university_other} />
        </Field>
      )}

      <label className="text-muted flex items-start gap-3 rounded-2xl bg-white p-4 text-sm">
        <input
          type="checkbox"
          name="terms"
          required
          className="accent-brand-600 mt-0.5 size-5 shrink-0"
          defaultChecked={v.terms === "on"}
        />
        <span>
          J&apos;accepte les{" "}
          <Link href="/conditions" className="text-brand-600 font-semibold underline" target="_blank">
            conditions générales d&apos;utilisation
          </Link>{" "}
          et la{" "}
          <Link href="/confidentialite" className="text-brand-600 font-semibold underline" target="_blank">
            politique de confidentialité
          </Link>
          .
        </span>
      </label>
      {fe.terms && <p className="text-coral-600 text-sm">{fe.terms}</p>}
      <SubmitButton size="lg" className="w-full" pendingLabel="Création du compte…">
        Créer mon compte
      </SubmitButton>
    </form>
  );
}
