"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigerEspace } from "@/lib/auth/session";
import { erreursZod, messageErreurBase, valeursFormulaire, type EtatFormulaire } from "@/lib/formulaires/etat";
import { clientServeur } from "@/lib/supabase/serveur";

const uuidOptionnel = z
  .string()
  .optional()
  .transform((t) => (t ? t : null))
  .refine((t) => t === null || /^[0-9a-f-]{36}$/i.test(t), "Choix invalide.");

const schema = z.object({
  origine: z.enum(["reception", "production", "client", "interne"], { error: "Choisissez l'origine." }),
  type_id: uuidOptionnel,
  gravite: z.enum(["mineure", "majeure", "critique"]),
  description: z.string().trim().min(5, "Décrivez le problème constaté.").max(1000),
  lot_id: uuidOptionnel,
  fiche_id: uuidOptionnel,
  client_id: uuidOptionnel,
});

/** Déclaration d'une non-conformité depuis l'espace Qualité, Production, Magasin ou Commercial. */
export async function declarerNc(espace: string, _e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace(espace);
  const valeurs = valeursFormulaire(fd);
  const lecture = schema.safeParse(valeurs);
  if (!lecture.success) return { erreurs: erreursZod(lecture.error), valeurs };
  const supabase = await clientServeur();
  const { data, error } = await supabase.from("non_conformites").insert(lecture.data).select("numero").single();
  if (error) return { message: messageErreurBase(error), valeurs };
  revalidatePath(`/${espace}`, "layout");
  revalidatePath("/qualite", "layout");
  return { ok: true, message: `Non-conformité ${data.numero} enregistrée : le service qualité est informé.` };
}
