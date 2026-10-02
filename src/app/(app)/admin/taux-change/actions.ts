"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigerEspace } from "@/lib/auth/session";
import { schemaDateIso } from "@/lib/formulaires/dates";
import { erreursZod, messageErreurBase, valeursFormulaire, type EtatFormulaire } from "@/lib/formulaires/etat";
import { lireNombre } from "@/lib/formulaires/nombres";
import { clientServeur } from "@/lib/supabase/serveur";

const schema = z.object({
  date_effet: z.string().regex(schemaDateIso, "Date invalide."),
  taux_gnf: z
    .string()
    .transform((t) => lireNombre(t))
    .refine((n): n is number => n !== null && n > 0 && n < 1_000_000, "Saisissez un taux valide (ex. 9 450)."),
  note: z.string().trim().max(200),
});

export async function ajouterTaux(_e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("admin");
  const valeurs = valeursFormulaire(fd);
  const lecture = schema.safeParse(valeurs);
  if (!lecture.success) return { erreurs: erreursZod(lecture.error), valeurs };
  const supabase = await clientServeur();
  const { error } = await supabase.from("taux_change").insert({ devise: "USD", ...lecture.data, note: lecture.data.note || null });
  if (error) {
    const msg = error.code === "23505" ? "Un taux existe déjà pour cette date." : messageErreurBase(error);
    return { message: msg, valeurs };
  }
  revalidatePath("/admin/taux-change");
  return { ok: true, message: "Taux enregistré." };
}
