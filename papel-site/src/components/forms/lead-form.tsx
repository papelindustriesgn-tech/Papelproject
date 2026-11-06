"use client";

import { useState, useTransition, type BaseSyntheticEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { submitLead } from "@/app/actions/forms";
import { Field, Input, Select, Textarea } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { ACTIVITY_TYPES, VOLUME_OPTIONS } from "@/lib/labels";
import { leadSchema, REQUEST_TYPES } from "@/lib/validation";

type In = z.input<typeof leadSchema>;
type Out = z.output<typeof leadSchema>;

const REQUEST_OPTIONS: { value: (typeof REQUEST_TYPES)[number]; label: string }[] = [
  { value: "partenariat", label: "Devenir distributeur / revendeur" },
  { value: "devis", label: "Demander un devis" },
  { value: "information", label: "Demander des informations" },
];

export function LeadForm({ productOptions }: { productOptions: string[] }) {
  const params = useSearchParams();
  const presetType = REQUEST_TYPES.find((t) => t === params.get("demande")) ?? "partenariat";
  const presetProduct = params.get("produit");

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
  } = useForm<In, unknown, Out>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      request_type: presetType,
      products_wanted: presetProduct && productOptions.includes(presetProduct) ? [presetProduct] : [],
    },
  });

  const onSubmit = (values: Out, event?: BaseSyntheticEvent) => {
    const form = event?.target as HTMLFormElement | undefined;
    const website = (form?.elements.namedItem("website") as HTMLInputElement | null)?.value;
    setServerError(null);
    startTransition(async () => {
      const res = await submitLead(values, { website, startedAt: startedAt ?? undefined }, window.location.pathname);
      if (res.ok) {
        setDone(true);
        return;
      }
      setServerError(res.error);
      for (const [name, message] of Object.entries(res.fieldErrors ?? {})) setError(name as keyof In, { message });
    });
  };

  if (done) {
    return (
      <div role="status" className="rounded-card bg-papel-50 p-8 text-center ring-1 ring-papel-200">
        <CheckCircle2 className="mx-auto size-12 text-papel-600" aria-hidden />
        <h3 className="mt-4 text-2xl font-bold text-papel-950">Merci, votre demande est bien enregistrée.</h3>
        <p className="mt-3 text-muted">Notre équipe commerciale vous recontactera sur WhatsApp ou par téléphone.</p>
      </div>
    );
  }

  const err = (k: keyof In) => errors[k]?.message as string | undefined;
  const aria = (k: keyof In) => ({
    "aria-invalid": Boolean(errors[k]),
    "aria-describedby": errors[k] ? `${k}-error` : undefined,
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

      <Field id="request_type" label="Votre demande" className="sm:col-span-2">
        <Select id="request_type" {...register("request_type")}>
          {REQUEST_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field id="full_name" label="Nom et prénom" error={err("full_name")}>
        <Input id="full_name" autoComplete="name" {...aria("full_name")} {...register("full_name")} />
      </Field>
      <Field id="company" label="Entreprise" optional error={err("company")}>
        <Input id="company" autoComplete="organization" {...register("company")} />
      </Field>
      <Field id="city" label="Ville / région" error={err("city")}>
        <Input
          id="city"
          autoComplete="address-level2"
          placeholder="Ex. Conakry, Kindia, Labé…"
          {...aria("city")}
          {...register("city")}
        />
      </Field>
      <Field id="whatsapp" label="Téléphone WhatsApp" error={err("whatsapp")}>
        <Input
          id="whatsapp"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+224 6XX XX XX XX"
          {...aria("whatsapp")}
          {...register("whatsapp")}
        />
      </Field>
      <Field id="email" label="Adresse e-mail" optional error={err("email")}>
        <Input id="email" type="email" inputMode="email" autoComplete="email" {...aria("email")} {...register("email")} />
      </Field>
      <Field id="activity_type" label="Type d'activité" error={err("activity_type")}>
        <Select id="activity_type" defaultValue="" {...aria("activity_type")} {...register("activity_type")}>
          <option value="" disabled>
            Choisir…
          </option>
          {ACTIVITY_TYPES.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </Select>
      </Field>

      <fieldset className="sm:col-span-2">
        <legend className="mb-2 text-sm font-semibold text-papel-950">Produits recherchés</legend>
        <div className="flex flex-wrap gap-2">
          {[...productOptions, "Autres produits d'hygiène"].map((name) => (
            <label key={name} className="cursor-pointer">
              <input type="checkbox" value={name} className="peer sr-only" {...register("products_wanted")} />
              <span className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium ring-1 ring-line transition ring-inset peer-checked:bg-papel-700 peer-checked:text-white peer-checked:ring-papel-700 peer-focus-visible:outline-2 peer-focus-visible:outline-papel-500">
                {name}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field id="estimated_volume" label="Volume d'achat estimé" optional className="sm:col-span-2">
        <Select id="estimated_volume" defaultValue="" {...register("estimated_volume")}>
          <option value="">Non précisé</option>
          {VOLUME_OPTIONS.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </Select>
      </Field>
      <Field id="message" label="Message complémentaire" optional error={err("message")} className="sm:col-span-2">
        <Textarea
          id="message"
          rows={4}
          placeholder="Zone de distribution, fréquence d'achat, questions…"
          {...register("message")}
        />
      </Field>

      {serverError && (
        <p role="alert" className="rounded-xl bg-corail/10 p-4 text-sm font-medium text-corail sm:col-span-2">
          {serverError}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center">
        <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Envoyer ma demande
        </Button>
        <p className="text-xs text-muted">
          Vos informations servent uniquement à traiter votre demande.{" "}
          <a href="/confidentialite" className="underline underline-offset-2">
            Confidentialité
          </a>
        </p>
      </div>
    </form>
  );
}
