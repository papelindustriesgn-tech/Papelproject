"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigerEspace } from "@/lib/auth/session";
import { erreursZod, messageErreurBase, valeursFormulaire, type EtatFormulaire } from "@/lib/formulaires/etat";
import { clientServeur } from "@/lib/supabase/serveur";

const schema = z.object({
  equipement_id: z.string().regex(/^[0-9a-f-]{36}$/i, "Choisissez l'équipement."),
  description: z.string().trim().min(5, "Décrivez la panne.").max(500),
  priorite: z.enum(["urgente", "normale", "basse"]),
  arret_machine: z.string().optional().transform((v) => v === "on"),
});

/** Signalement d'une panne (production ou maintenance) : crée un ordre de travail curatif « demandé ». */
export async function signalerPanne(espace: string, _e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace(espace);
  const valeurs = valeursFormulaire(fd);
  const lecture = schema.safeParse(valeurs);
  if (!lecture.success) return { erreurs: erreursZod(lecture.error), valeurs };
  const supabase = await clientServeur();
  const { data, error } = await supabase.from("interventions").insert({ ...lecture.data, type_intervention: "curative" }).select("numero").single();
  if (error) return { message: messageErreurBase(error), valeurs };
  revalidatePath(`/${espace}`, "layout");
  revalidatePath("/maintenance", "layout");
  return { ok: true, message: `Panne signalée : ordre de travail ${data.numero} transmis à la maintenance.` };
}
