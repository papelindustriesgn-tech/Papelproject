"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigerEspace } from "@/lib/auth/session";
import { schemaDateIso } from "@/lib/formulaires/dates";
import { erreursZod, messageErreurBase, valeursFormulaire, type EtatFormulaire } from "@/lib/formulaires/etat";
import { lireNombre } from "@/lib/formulaires/nombres";
import { clientServeur } from "@/lib/supabase/serveur";

const schema = z.object({
  article_id: z.string().regex(/^[0-9a-f-]{36}$/i, "Choisissez l'article."),
  quantite: z
    .string()
    .transform((t) => lireNombre(t))
    .refine((n): n is number => n !== null && n > 0, "Quantité invalide."),
  date_besoin: z
    .string()
    .optional()
    .transform((t) => (t ? t : null))
    .refine((t) => t === null || schemaDateIso.test(t), "Date invalide."),
  motif: z.string().trim().min(1, "Indiquez le motif (ex. couverture inférieure à 15 jours).").max(300),
});

/** Demande d'achat, depuis l'espace Magasin, Production ou Achats. */
export async function creerDemande(espace: string, _e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace(espace);
  const valeurs = valeursFormulaire(fd);
  const lecture = schema.safeParse(valeurs);
  if (!lecture.success) return { erreurs: erreursZod(lecture.error), valeurs };
  const supabase = await clientServeur();
  const { data, error } = await supabase.from("demandes_achat").insert(lecture.data).select("numero").single();
  if (error) return { message: messageErreurBase(error), valeurs };
  revalidatePath(`/${espace}`, "layout");
  revalidatePath("/achats", "layout");
  return { ok: true, message: `Demande ${data.numero} transmise au service achats.` };
}
