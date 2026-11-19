"use server";

import { revalidatePath } from "next/cache";
import { exigerConnexion } from "@/lib/auth/session";
import { schemaDateIso } from "@/lib/formulaires/dates";
import { messageErreurBase, valeursFormulaire, type EtatFormulaire } from "@/lib/formulaires/etat";
import { clientServeur } from "@/lib/supabase/serveur";

/**
 * Confirmer la date de livraison d'une commande (ventes, magasin ou logistique) : c'est la date promise
 * au client, montrée au commercial sur son téléphone. Les droits sont vérifiés par la base.
 */
export async function confirmerDateLivraison(commandeId: string, _e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerConnexion();
  const date = String(fd.get("date") ?? "");
  if (!schemaDateIso.test(date)) return { erreurs: { date: "Choisissez la date de livraison." }, valeurs: valeursFormulaire(fd) };
  const supabase = await clientServeur();
  const { error } = await supabase.rpc("confirmer_date_livraison", { p_commande: commandeId, p_date: date, p_note: String(fd.get("note") ?? "").slice(0, 300) });
  if (error) return { message: messageErreurBase(error), valeurs: valeursFormulaire(fd) };
  revalidatePath("/", "layout");
  return { ok: true, message: `Date de livraison confirmée : ${date.split("-").reverse().join("/")}. Le commercial la verra sur son téléphone.` };
}
