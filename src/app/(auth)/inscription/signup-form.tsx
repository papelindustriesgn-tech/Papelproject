"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Eye, EyeOff } from "lucide-react";
import { signUp } from "../actions";
import { Field, FormMessage, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { GENDERS, STUDY_LEVELS } from "@/lib/constants";
import { cn } from "@/lib/cn";

type University = { id: number; name: string; short_name: string | null };
type City = { id: number; name: string; is_active: boolean };

const STEP1 = ["first_name", "last_name", "birth_date", "gender", "phone", "email", "password"];

export function SignUpForm({ universities, cities }: { universities: University[]; cities: City[] }) {
  const [state, action] = useActionState(signUp, {});
  const [step, setStep] = useState(1);
  const [showPwd, setShowPwd] = useState(false);
  const [password, setPassword] = useState("");
  const [uni, setUni] = useState(state.values?.university_id ?? "");
  const formRef = useRef<HTMLFormElement>(null);
  const v = state.values ?? {};
  const fe = state.fieldErrors ?? {};

  // En cas d'erreur serveur sur un champ de l'étape 1, on y revient.
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    if (state.fieldErrors && Object.keys(state.fieldErrors).some((k) => STEP1.includes(k))) setStep(1);
    if (state.values?.university_id) setUni(state.values.university_id);
  }

  function goNext() {
    const form = formRef.current!;
    for (const name of STEP1) {
      const el = form.elements.namedItem(name) as HTMLInputElement | null;
      if (el && !el.checkValidity()) {
        el.reportValidity();
        return;
      }
    }
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const conakry = cities.find((c) => c.is_active);

  return (
    <form ref={formRef} action={action} className="space-y-4" key={JSON.stringify(v)}>
      <div className="flex items-center gap-2" aria-hidden>
        {[1, 2].map((s) => (
          <div key={s} className={cn("h-1.5 flex-1 rounded-full transition", step >= s ? "bg-brand-600" : "bg-line")} />
        ))}
      </div>
      <p className="text-muted text-sm font-semibold">
        Étape {step} sur 2 — {step === 1 ? "Toi" : "Tes études"}
      </p>
      <FormMessage>{state.error}</FormMessage>

      <fieldset className={cn("space-y-4", step !== 1 && "hidden")}>
        <legend className="sr-only">Informations personnelles</legend>
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
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date de naissance" htmlFor="birth_date" error={fe.birth_date}>
            <Input
              id="birth_date"
              name="birth_date"
              type="date"
              required
              autoComplete="bday"
              defaultValue={v.birth_date}
              max={new Date().toISOString().slice(0, 10)}
              aria-invalid={!!fe.birth_date}
            />
          </Field>
          <Field label="Genre" htmlFor="gender" optional>
            <Select id="gender" name="gender" defaultValue={v.gender ?? ""}>
              <option value="">—</option>
              {GENDERS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Téléphone" htmlFor="phone" error={fe.phone} hint="Tu pourras aussi te connecter avec ce numéro.">
          <div className="flex gap-2">
            <span className="border-line bg-canvas text-muted flex h-12 shrink-0 items-center rounded-2xl border px-3 text-sm font-semibold whitespace-nowrap">
              🇬🇳 +224
            </span>
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="620 00 00 00"
              required
              minLength={8}
              defaultValue={v.phone}
              aria-invalid={!!fe.phone}
            />
          </div>
        </Field>
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
          hint="8 caractères minimum, avec au moins une lettre et un chiffre."
        >
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPwd ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
        <Button onClick={goNext} size="lg" className="w-full">
          Continuer <ArrowRight className="size-4" />
        </Button>
      </fieldset>

      <fieldset className={cn("space-y-4", step !== 2 && "hidden")}>
        <legend className="sr-only">Études</legend>
        <Field label="Établissement" htmlFor="university_id" error={fe.university_id}>
          <Select
            id="university_id"
            name="university_id"
            required={step === 2}
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
        <Field label="Filière" htmlFor="field_of_study" error={fe.field_of_study}>
          <Input
            id="field_of_study"
            name="field_of_study"
            placeholder="Ex. : Droit, Informatique, Médecine…"
            required={step === 2}
            maxLength={120}
            defaultValue={v.field_of_study}
            aria-invalid={!!fe.field_of_study}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Niveau" htmlFor="study_level" error={fe.study_level}>
            <Select
              id="study_level"
              name="study_level"
              required={step === 2}
              defaultValue={v.study_level ?? ""}
              aria-invalid={!!fe.study_level}
            >
              <option value="" disabled>
                Niveau
              </option>
              {STUDY_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Ville" htmlFor="city_id" error={fe.city_id}>
            <Select id="city_id" name="city_id" required={step === 2} defaultValue={v.city_id ?? String(conakry?.id ?? "")}>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <label className="text-muted flex items-start gap-3 rounded-2xl bg-white p-4 text-sm">
          <input
            type="checkbox"
            name="terms"
            required={step === 2}
            className="accent-brand-600 mt-0.5 size-5 shrink-0"
            defaultChecked={v.terms === "on"}
          />
          <span>
            J&apos;accepte les{" "}
            <Link href="/conditions" className="text-brand-600 font-semibold underline" target="_blank">
              conditions d&apos;utilisation
            </Link>{" "}
            et la{" "}
            <Link href="/confidentialite" className="text-brand-600 font-semibold underline" target="_blank">
              politique de confidentialité
            </Link>
            .
          </span>
        </label>
        {fe.terms && <p className="text-coral-600 text-sm">{fe.terms}</p>}
        <div className="flex gap-3">
          <Button variant="outline" size="lg" onClick={() => setStep(1)} aria-label="Retour à l'étape 1">
            <ArrowLeft className="size-4" />
          </Button>
          <SubmitButton size="lg" className="flex-1" pendingLabel="Création du compte…">
            Créer mon compte
          </SubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
