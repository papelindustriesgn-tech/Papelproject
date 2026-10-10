"use server";

import { revalidatePath } from "next/cache";
import { exigerEspace } from "@/lib/auth/session";
import { messageErreurBase, type EtatFormulaire } from "@/lib/formulaires/etat";
import { clientServeur } from "@/lib/supabase/serveur";

/** Réattribue un point de vente (et son client) à un autre commercial : un PVA n'a qu'un seul commercial. */
export async function reattribuer(pvaId: string, _e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("commercial");
  const commercial = String(fd.get("commercial_id") ?? "");
  if (!commercial) return { message: "Choisissez le commercial." };
  const supabase = await clientServeur();
  const { error } = await supabase.rpc("reattribuer_pva", { p_pva: pvaId, p_commercial: commercial });
  if (error) return { message: messageErreurBase(error) };
  revalidatePath("/commercial/portefeuilles");
  return { ok: true, message: "Réattribué." };
}
