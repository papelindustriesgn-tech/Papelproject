"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigerEspace } from "@/lib/auth/session";
import { erreursZod, messageErreurBase, valeursFormulaire, type EtatFormulaire } from "@/lib/formulaires/etat";
import { clientServeur } from "@/lib/supabase/serveur";
import { ESPACES_TACHES } from "./libelles";

const schema = z.object({
  espace_destinataire: z.enum(ESPACES_TACHES as [string, ...string[]], { error: "Choisissez le service" }),
  titre: z.string().trim().min(3, "Décrivez la demande en quelques mots").max(200, "200 caractères au plus"),
  description: z.string().trim().max(2000, "2 000 caractères au plus"),
  echeance: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide")]),
  urgente: z.string().optional(),
  lien: z.union([z.literal(""), z.string().regex(/^\/[A-Za-z0-9/_?=&.%-]*$/, "Lien invalide")]),
});

/** Nouvelle demande d'un service (`espace`, l'émetteur) à un autre. */
export async function creerTache(espace: string, _etat: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace(espace);
  const v = valeursFormulaire(fd);
  const r = schema.safeParse({ ...v, description: v.description ?? "", echeance: v.echeance ?? "", lien: v.lien ?? "" });
  if (!r.success) return { erreurs: erreursZod(r.error), valeurs: v, message: "Vérifiez les champs en rouge." };
  if (r.data.espace_destinataire === espace) return { erreurs: { espace_destinataire: "Choisissez un autre service" }, valeurs: v };
  const supabase = await clientServeur();
  const { error } = await supabase.from("taches").insert({
    espace_emetteur: espace,
    espace_destinataire: r.data.espace_destinataire,
    titre: r.data.titre,
    description: r.data.description,
    echeance: r.data.echeance || null,
    priorite: r.data.urgente === "on" ? "urgente" : "normale",
    lien: r.data.lien,
  });
  if (error) return { message: messageErreurBase(error), valeurs: v };
  revalidatePath("/", "layout");
  return { ok: true, message: "Demande envoyée : le service la voit dans son menu « Tâches »." };
}

/** Prise en charge, fin ou annulation d'une tâche (règles contrôlées par la base : trigger `controler_tache`). */
export async function changerStatutTache(espace: string, id: string, statut: "en_cours" | "faite" | "annulee", fd: FormData): Promise<void> {
  await exigerEspace(espace);
  const compteRendu = String(fd.get("compte_rendu") ?? "").trim().slice(0, 2000);
  const supabase = await clientServeur();
  await supabase.from("taches").update(statut === "en_cours" ? { statut } : { statut, compte_rendu: compteRendu }).eq("id", id);
  revalidatePath("/", "layout");
}
