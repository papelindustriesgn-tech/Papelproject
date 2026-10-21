"use server";

import { revalidatePath } from "next/cache";
import { exigerEspace } from "@/lib/auth/session";
import { messageErreurBase } from "@/lib/formulaires/etat";
import { clientServeur } from "@/lib/supabase/serveur";

export interface EtatCle {
  cle?: string;
  message?: string;
}

/** Crée une clé Excel : elle n'est montrée qu'une fois (seul son hachage est conservé). */
export async function creerCle(_e: EtatCle, fd: FormData): Promise<EtatCle> {
  await exigerEspace("finance");
  const libelle = String(fd.get("libelle") ?? "").trim();
  if (!libelle) return { message: "Donnez un nom à la connexion (ex. « Excel du comptable »)." };
  const supabase = await clientServeur();
  const { data, error } = await supabase.rpc("creer_cle_export", { p_libelle: libelle });
  if (error || !data) return { message: messageErreurBase(error) };
  revalidatePath("/finance/excel");
  return { cle: data };
}

export async function revoquerCle(id: string): Promise<void> {
  await exigerEspace("finance");
  const supabase = await clientServeur();
  const { error } = await supabase.from("cles_export").update({ actif: false }).eq("id", id);
  if (error) throw new Error(messageErreurBase(error));
  revalidatePath("/finance/excel");
}
