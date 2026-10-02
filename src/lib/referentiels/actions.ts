"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { exigerEspace } from "@/lib/auth/session";
import { messageErreurBase, valeursFormulaire, type EtatFormulaire } from "@/lib/formulaires/etat";
import { clientServeur } from "@/lib/supabase/serveur";
import { referentiel } from "./definitions";
import { validerSaisie } from "./validation";

/** Vérifie l'accès à l'espace et que la liste y est bien proposée ; renvoie un client non typé (table dynamique). */
async function preparer(espace: string, code: string) {
  await exigerEspace(espace);
  const def = referentiel(code);
  if (!def || !def.espaces.includes(espace)) throw new Error("Liste inconnue.");
  const supabase = (await clientServeur()) as unknown as SupabaseClient;
  return { def, table: supabase.from(def.table) };
}

/** Création (id null) ou modification d'une ligne. La RLS de la table décide des droits. */
export async function enregistrerLigne(espace: string, code: string, id: string | null, _e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  const { def, table } = await preparer(espace, code);
  const valeurs = valeursFormulaire(fd);
  const r = validerSaisie(def, valeurs, id === null);
  if ("erreurs" in r) return { erreurs: r.erreurs, valeurs };

  const { data, error } = id === null ? await table.insert(r.donnees).select(def.cle) : await table.update(r.donnees).eq(def.cle, id).select(def.cle);
  if (error) return { message: messageErreurBase(error), valeurs };
  if (!data?.length) return { message: "Vous n'avez pas les droits pour modifier cette liste.", valeurs };
  revalidatePath(`/${espace}/listes/${code}`);
  return { ok: true, message: id === null ? "Ajouté." : "Enregistré." };
}

/** Archive / réactive (listes avec colonne « actif ») — on ne supprime pas ce qui a servi. */
export async function basculerActif(espace: string, code: string, id: string, actif: boolean): Promise<void> {
  const { def, table } = await preparer(espace, code);
  if (!def.archivable) throw new Error("Cette liste ne s'archive pas.");
  const { error } = await table.update({ actif }).eq(def.cle, id);
  if (error) throw new Error(messageErreurBase(error));
  revalidatePath(`/${espace}/listes/${code}`);
}

/** Suppression (listes sans archivage) : refusée par la base si l'élément est utilisé ailleurs. */
export async function supprimerLigne(espace: string, code: string, id: string, _e: EtatFormulaire): Promise<EtatFormulaire> {
  const { def, table } = await preparer(espace, code);
  if (def.archivable) return { message: "Cet élément s'archive, il ne se supprime pas." };
  const { data, error } = await table.delete().eq(def.cle, id).select(def.cle);
  if (error) return { message: error.code === "23503" ? "Suppression impossible : cet élément est utilisé ailleurs." : messageErreurBase(error) };
  if (!data?.length) return { message: "Vous n'avez pas les droits pour supprimer cet élément." };
  revalidatePath(`/${espace}/listes/${code}`);
  return { ok: true, message: "Supprimé." };
}
