"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { signIn, resendConfirmation } from "../actions";
import { Field, FormMessage, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(signIn, {});
  const [resendState, resendAction] = useActionState(resendConfirmation, {});
  const [show, setShow] = useState(false);
  const unconfirmed = state.values?.unconfirmed;

  return (
    <>
      <form action={action} className="space-y-4" noValidate>
        <input type="hidden" name="next" value={next} />
        <FormMessage>{state.error}</FormMessage>
        <Field label="Email ou téléphone" htmlFor="identifier">
          <Input
            id="identifier"
            name="identifier"
            autoComplete="username"
            inputMode="email"
            placeholder="toi@email.com ou 620 00 00 00"
            defaultValue={state.values?.identifier}
            required
          />
        </Field>
        <Field label="Mot de passe" htmlFor="password">
          <div className="relative">
            <Input id="password" name="password" type={show ? "text" : "password"} autoComplete="current-password" required className="pr-12" />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute top-1/2 right-2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-canvas"
              aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            >
              {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          </div>
        </Field>
        <div className="flex justify-end">
          <Link href="/mot-de-passe-oublie" className="text-sm font-semibold text-brand-600 hover:underline">
            Mot de passe oublié ?
          </Link>
        </div>
        <SubmitButton className="w-full" size="lg" pendingLabel="Connexion…">
          Se connecter
        </SubmitButton>
      </form>
      {unconfirmed && (
        <form action={resendAction} className="mt-4 rounded-2xl bg-brand-50 p-4 text-sm">
          <input type="hidden" name="email" value={unconfirmed} />
          <p className="text-brand-900">Tu n&apos;as pas reçu l&apos;email de confirmation ?</p>
          {resendState.message && <p className="mt-2 text-mint-700">{resendState.message}</p>}
          {resendState.error && <p className="mt-2 text-coral-600">{resendState.error}</p>}
          <SubmitButton variant="secondary" size="sm" className="mt-3" pendingLabel="Envoi…">
            Renvoyer l&apos;email
          </SubmitButton>
        </form>
      )}
    </>
  );
}
