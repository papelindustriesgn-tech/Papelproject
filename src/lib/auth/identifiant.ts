import { z } from "zod";

/**
 * Connexion par IDENTIFIANT (pas d'e-mail, pas de SMS) : Supabase Auth exige un e-mail,
 * on utilise donc un e-mail technique « identifiant@papel.local » jamais utilisé pour écrire.
 */
export const DOMAINE_TECHNIQUE = "papel.local";

export const schemaIdentifiant = z
  .string({ error: "Saisissez votre identifiant." })
  .trim()
  .toLowerCase()
  .min(3, "L'identifiant doit contenir au moins 3 caractères.")
  .max(40, "L'identifiant ne doit pas dépasser 40 caractères.")
  .regex(/^[a-z0-9._-]+$/, "Utilisez uniquement des lettres sans accent, des chiffres, le point, le tiret ou le tiret bas.");

export function emailTechnique(identifiant: string): string {
  return `${identifiant.trim().toLowerCase()}@${DOMAINE_TECHNIQUE}`;
}

export const schemaMotDePasse = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
  .max(72, "Le mot de passe est trop long.");
