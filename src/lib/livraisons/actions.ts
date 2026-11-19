"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigerConnexion } from "@/lib/auth/session";
import { messageErreurBase, type EtatFormulaire } from "@/lib/formulaires/etat";
import { lireNombre } from "@/lib/formulaires/nombres";
import { avecSucces } from "@/lib/formulaires/succes";
import { colis, colisVersPaquets, paquets as enPaquets, somme } from "@/lib/metier/unites";
import { clientServeur } from "@/lib/supabase/serveur";

/**
 * Préparation et livraison, partagées par le Magasin et les Ventes (les droits sont vérifiés par la base :
 * magasin, ventes, logistique). `espace` ne sert qu'à revenir dans l'application d'où l'on vient.
 */
const ESPACES = new Set(["magasin", "ventes", "logistique"]);
const chemin = (espace: string, id: string) => `/${ESPACES.has(espace) ? espace : "magasin"}/livraisons/${id}`;
function rafraichir() {
  for (const e of ["/magasin", "/ventes", "/logistique", "/commercial", "/direction"]) revalidatePath(e, "layout");
}

/** Préparer les colis d'une commande : reprend le bon en cours s'il existe, sinon le crée avec tout le reste à livrer. */
export async function preparerCommande(commandeId: string, espace: string): Promise<void> {
  await exigerConnexion();
  const supabase = await clientServeur();
  const { data: enCours } = await supabase.from("livraisons").select("id").eq("commande_id", commandeId).eq("statut", "brouillon").limit(1).maybeSingle();
  if (enCours) redirect(chemin(espace, enCours.id));
  const { data, error } = await supabase.rpc("preparer_livraison", { p_commande: commandeId });
  if (error) throw new Error(messageErreurBase(error));
  rafraichir();
  redirect(chemin(espace, data));
}

/** Quantité préparée d'une ligne, saisie en colis complets + paquets en plus (0 retire la ligne). */
export async function modifierQuantitePreparee(ligneId: string, livraisonId: string, paquetsParColis: number, _e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerConnexion();
  const c = lireNombre(String(fd.get("colis") ?? "0") || "0");
  const v = lireNombre(String(fd.get("vrac") ?? "0") || "0");
  if (c === null || v === null || !Number.isInteger(c) || !Number.isInteger(v) || c < 0 || v < 0) return { erreurs: { colis: "Nombre entier de colis et de paquets." } };
  const n = Number(somme(colisVersPaquets(colis(c), { paquetsParColis }), enPaquets(v)));
  const supabase = await clientServeur();
  const { error } = n === 0 ? await supabase.from("lignes_livraison").delete().eq("id", ligneId) : await supabase.from("lignes_livraison").update({ paquets: n }).eq("id", ligneId);
  if (error) return { message: messageErreurBase(error) };
  rafraichir();
  return { ok: true, message: n === 0 ? "Ligne retirée de ce bon." : "Quantité enregistrée." };
}

/** Valider le bon : les colis sortent du stock (refusé si le stock ne suffit pas). Un second appui est sans effet. */
export async function validerBonLivraison(livraisonId: string, espace: string, _e: EtatFormulaire): Promise<EtatFormulaire> {
  await exigerConnexion();
  const supabase = await clientServeur();
  const { data: l } = await supabase.from("livraisons").select("statut, numero").eq("id", livraisonId).maybeSingle();
  if (l?.statut === "validee") redirect(avecSucces(chemin(espace, livraisonId), `Bon de livraison ${l.numero} déjà validé.`));
  const { data, error } = await supabase.rpc("valider_livraison", { p_livraison: livraisonId });
  if (error) return { message: messageErreurBase(error) };
  rafraichir();
  redirect(avecSucces(chemin(espace, livraisonId), `Bon de livraison ${data} validé : les colis sont sortis du stock. La logistique peut les livrer.`));
}

/** Supprimer un bon pas encore validé (erreur de préparation) : rien n'est sorti du stock. */
export async function abandonnerBon(livraisonId: string, retour: string): Promise<void> {
  await exigerConnexion();
  const supabase = await clientServeur();
  const { error } = await supabase.from("livraisons").delete().eq("id", livraisonId).eq("statut", "brouillon");
  if (error) throw new Error(messageErreurBase(error));
  rafraichir();
  redirect(retour);
}
