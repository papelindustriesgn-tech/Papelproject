import { z } from "zod";

/** Schémas partagés client / serveur (formulaires publics). Pas d'alias d'import : testable avec node --test. */

const phone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s.\-()]/g, ""))
  .pipe(z.string().regex(/^\+?[0-9]{8,15}$/, "Numéro invalide (ex. +224 6XX XX XX XX)"));

const optionalEmail = z
  .string()
  .trim()
  .max(160)
  .optional()
  .transform((v) => (v ? v.toLowerCase() : undefined))
  .pipe(z.email("Adresse e-mail invalide").optional());

export const ACTIVITY_VALUES = [
  "grossiste",
  "distributeur",
  "revendeur",
  "hotel",
  "restaurant",
  "entreprise",
  "administration",
  "autre",
] as const;

export const REQUEST_TYPES = ["partenariat", "devis", "information"] as const;

export const leadSchema = z.object({
  full_name: z.string().trim().min(2, "Indiquez votre nom et prénom").max(120),
  company: z.string().trim().max(160).optional(),
  city: z.string().trim().min(2, "Indiquez votre ville ou région").max(120),
  whatsapp: phone,
  email: optionalEmail,
  activity_type: z.enum(ACTIVITY_VALUES, "Choisissez votre type d'activité"),
  products_wanted: z.array(z.string().trim().max(120)).max(12).default([]),
  estimated_volume: z.string().trim().max(120).optional(),
  message: z.string().trim().max(3000).optional(),
  request_type: z.enum(REQUEST_TYPES).default("partenariat"),
});
export type LeadInput = z.input<typeof leadSchema>;

export const contactSchema = z
  .object({
    full_name: z.string().trim().min(2, "Indiquez votre nom").max(120),
    phone: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? v.replace(/[\s.\-()]/g, "") : undefined))
      .pipe(
        z
          .string()
          .regex(/^\+?[0-9]{8,15}$/, "Numéro invalide")
          .optional(),
      ),
    email: optionalEmail,
    subject: z.string().trim().min(2, "Indiquez l'objet de votre message").max(160),
    message: z.string().trim().min(10, "Votre message est trop court (10 caractères minimum)").max(3000),
  })
  .refine((v) => Boolean(v.phone || v.email), {
    message: "Indiquez un téléphone ou un e-mail pour que nous puissions vous répondre",
    path: ["phone"],
  });
export type ContactInput = z.input<typeof contactSchema>;

/** Champs anti-robots communs : leurre invisible + délai minimal de saisie. */
export function isLikelyBot(form: { website?: unknown; startedAt?: unknown }, now = Date.now()) {
  if (typeof form.website === "string" && form.website.trim() !== "") return true;
  const started = Number(form.startedAt);
  if (!Number.isFinite(started)) return true;
  return now - started < 2500; // moins de 2,5 s pour remplir : robot
}
