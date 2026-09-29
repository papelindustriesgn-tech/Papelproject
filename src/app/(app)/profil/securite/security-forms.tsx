"use client";

import { ActionForm } from "@/components/ui/action-form";
import { Field, Input } from "@/components/ui/field";
import { changeEmail, changePassword } from "../actions";

export function SecurityForms({ email }: { email: string }) {
  return (
    <>
      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <h2 className="mb-4 font-bold">Changer de mot de passe</h2>
        <ActionForm
          action={changePassword}
          submitLabel="Modifier le mot de passe"
          render={(s) => (
            <>
              <Field label="Mot de passe actuel" htmlFor="current_password" error={s.fieldErrors?.current_password}>
                <Input id="current_password" name="current_password" type="password" autoComplete="current-password" required />
              </Field>
              <Field label="Nouveau mot de passe" htmlFor="password" error={s.fieldErrors?.password} hint="8 caractères minimum, lettres et chiffres.">
                <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
              </Field>
              <Field label="Confirmation" htmlFor="password_confirm" error={s.fieldErrors?.password_confirm}>
                <Input id="password_confirm" name="password_confirm" type="password" autoComplete="new-password" required minLength={8} />
              </Field>
            </>
          )}
        />
      </section>
      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <h2 className="font-bold">Adresse email</h2>
        <p className="mt-1 mb-4 text-sm text-muted">
          Actuelle : <strong className="break-all text-ink">{email}</strong>
        </p>
        <ActionForm
          action={changeEmail}
          submitLabel="Changer d'email"
          render={(s) => (
            <Field label="Nouvelle adresse" htmlFor="email" error={s.fieldErrors?.email}>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </Field>
          )}
        />
      </section>
    </>
  );
}
