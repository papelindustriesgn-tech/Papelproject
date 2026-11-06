"use client";

import { useState, useTransition, type BaseSyntheticEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { submitContact } from "@/app/actions/forms";
import { Field, Input, Textarea } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { contactSchema } from "@/lib/validation";

type In = z.input<typeof contactSchema>;
type Out = z.output<typeof contactSchema>;

export function ContactForm() {
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  // Anti-robots : heure de la première interaction + champ leurre lu à l'envoi
  const [startedAt, setStartedAt] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<In, unknown, Out>({ resolver: zodResolver(contactSchema) });

  const onSubmit = (values: Out, event?: BaseSyntheticEvent) => {
    const form = event?.target as HTMLFormElement | undefined;
    const website = (form?.elements.namedItem("website") as HTMLInputElement | null)?.value;
    setServerError(null);
    startTransition(async () => {
      const res = await submitContact(values, { website, startedAt: startedAt ?? undefined });
      if (res.ok) return setDone(true);
      setServerError(res.error);
      for (const [name, message] of Object.entries(res.fieldErrors ?? {})) setError(name as keyof In, { message });
    });
  };

  if (done) {
    return (
      <div role="status" className="rounded-card bg-papel-50 p-8 text-center ring-1 ring-papel-200">
        <CheckCircle2 className="mx-auto size-12 text-papel-600" aria-hidden />
        <h3 className="mt-4 text-2xl font-bold text-papel-950">Merci, votre message est bien envoyé.</h3>
        <p className="mt-3 text-muted">Nous vous répondrons dans les meilleurs délais.</p>
      </div>
    );
  }

  const err = (k: keyof In) => errors[k]?.message as string | undefined;
  const aria = (k: keyof In) => ({
    "aria-invalid": Boolean(errors[k]),
    "aria-describedby": errors[k] ? `c-${k}-error` : undefined,
  });

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      onFocusCapture={() => setStartedAt((v) => v ?? Date.now())}
      noValidate
      className="relative grid gap-5 sm:grid-cols-2"
    >
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Site web
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <Field id="c-full_name" label="Nom et prénom" error={err("full_name")} className="sm:col-span-2">
        <Input id="c-full_name" autoComplete="name" {...aria("full_name")} {...register("full_name")} />
      </Field>
      <Field id="c-phone" label="Téléphone / WhatsApp" error={err("phone")} hint="Téléphone ou e-mail : au moins l'un des deux.">
        <Input
          id="c-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+224 6XX XX XX XX"
          {...aria("phone")}
          {...register("phone")}
        />
      </Field>
      <Field id="c-email" label="Adresse e-mail" error={err("email")}>
        <Input id="c-email" type="email" inputMode="email" autoComplete="email" {...aria("email")} {...register("email")} />
      </Field>
      <Field id="c-subject" label="Objet" error={err("subject")} className="sm:col-span-2">
        <Input id="c-subject" {...aria("subject")} {...register("subject")} />
      </Field>
      <Field id="c-message" label="Message" error={err("message")} className="sm:col-span-2">
        <Textarea id="c-message" {...aria("message")} {...register("message")} />
      </Field>
      {serverError && (
        <p role="alert" className="rounded-xl bg-corail/10 p-4 text-sm font-medium text-corail sm:col-span-2">
          {serverError}
        </p>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Envoyer le message
        </Button>
      </div>
    </form>
  );
}
