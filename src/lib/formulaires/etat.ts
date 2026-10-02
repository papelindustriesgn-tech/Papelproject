import type { z } from "zod";

/** État renvoyé par une Server Action de formulaire (affiché via useActionState). */
export interface EtatFormulaire {
  ok?: boolean;
  message?: string;
  erreurs?: Record<string, string>;
  /** Valeurs saisies, renvoyées pour ne pas vider le formulaire en cas d'erreur. */
  valeurs?: Record<string, string>;
}

export const ETAT_INITIAL: EtatFormulaire = {};

/** Transforme les erreurs Zod en { champ: premier message }. */
export function erreursZod(erreur: z.ZodError): Record<string, string> {
  const erreurs: Record<string, string> = {};
  for (const issue of erreur.issues) {
    const champ = issue.path.join(".") || "_";
    if (!erreurs[champ]) erreurs[champ] = issue.message;
  }
  return erreurs;
}

/** Valeurs textuelles d'un FormData (sans les champs techniques de Next). */
export function valeursFormulaire(fd: FormData): Record<string, string> {
  const v: Record<string, string> = {};
  fd.forEach((valeur, cle) => {
    if (!cle.startsWith("$ACTION") && typeof valeur === "string") v[cle] = valeur;
  });
  return v;
}

/** Traduit les erreurs PostgreSQL / Supabase les plus courantes en français. */
export function messageErreurBase(erreur: { code?: string; message?: string } | null | undefined): string {
  if (!erreur) return "Erreur inconnue.";
  switch (erreur.code) {
    case "42501":
      return "Vous n'avez pas les droits pour cette opération.";
    case "23505":
      return "Cet élément existe déjà (doublon).";
    case "23503":
      return "Opération impossible : cet élément est utilisé ailleurs.";
    case "23502":
      return "Un champ obligatoire n'est pas rempli.";
    case "23514":
      return "Valeur refusée : elle ne respecte pas les règles de saisie.";
    case "23P01":
      return "Cette période chevauche une période existante.";
    case "22023":
    case "P0001":
      return erreur.message ?? "Valeur invalide.";
    default:
      return "Une erreur est survenue. Réessayez ou contactez l'administrateur.";
  }
}
