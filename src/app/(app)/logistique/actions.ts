"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { exigerEspace } from "@/lib/auth/session";
import { schemaDateIso } from "@/lib/formulaires/dates";
import { erreursZod, messageErreurBase, valeursFormulaire, type EtatFormulaire } from "@/lib/formulaires/etat";
import { lireNombre } from "@/lib/formulaires/nombres";
import { avecSucces } from "@/lib/formulaires/succes";
import { clientServeur } from "@/lib/supabase/serveur";

const uuid = (m: string) => z.string().regex(/^[0-9a-f-]{36}$/i, m);
const kilometrage = z
  .string()
  .optional()
  .transform((t) => (t && t.trim() ? lireNombre(t) : null))
  .refine((n) => n === null || (Number.isInteger(n) && n >= 0), "Kilométrage : nombre entier de km.");

function rafraichir() {
  revalidatePath("/logistique", "layout");
}

// -----------------------------------------------------------------------------
// Tournées
// -----------------------------------------------------------------------------
const schemaTournee = z.object({
  date_tournee: z.string().regex(schemaDateIso, "Date invalide."),
  vehicule_id: uuid("Choisissez le véhicule."),
  chauffeur_id: uuid("Choisissez le chauffeur."),
  notes: z.string().trim().max(300),
});

export async function creerTournee(_e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("logistique");
  const valeurs = valeursFormulaire(fd);
  const lecture = schemaTournee.safeParse(valeurs);
  if (!lecture.success) return { erreurs: erreursZod(lecture.error), valeurs };
  const supabase = await clientServeur();
  const { data, error } = await supabase.from("tournees_livraison").insert(lecture.data).select("id").single();
  if (error) return { message: messageErreurBase(error), valeurs };
  rafraichir();
  redirect(`/logistique/tournees/${data.id}`);
}

export async function affecterLivraison(tourneeId: string, livraisonId: string): Promise<EtatFormulaire> {
  await exigerEspace("logistique");
  const supabase = await clientServeur();
  const { error } = await supabase.rpc("affecter_livraison", { p_tournee: tourneeId, p_livraison: livraisonId });
  if (error) return { message: messageErreurBase(error) };
  revalidatePath(`/logistique/tournees/${tourneeId}`);
  return { ok: true, message: "Bon de livraison ajouté au chargement." };
}

export async function retirerLivraison(tourneeId: string, livraisonId: string): Promise<void> {
  await exigerEspace("logistique");
  const supabase = await clientServeur();
  const { error } = await supabase.rpc("retirer_livraison", { p_livraison: livraisonId });
  if (error) throw new Error(messageErreurBase(error));
  revalidatePath(`/logistique/tournees/${tourneeId}`);
}

export async function demarrerTournee(tourneeId: string, _e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("logistique");
  const km = kilometrage.safeParse(fd.get("km_depart") ?? "");
  if (!km.success || km.data === null) return { erreurs: { km_depart: "Relevez le compteur kilométrique au départ." }, valeurs: valeursFormulaire(fd) };
  const supabase = await clientServeur();
  const { error } = await supabase.rpc("demarrer_tournee", { p_tournee: tourneeId, p_km: km.data });
  if (error) return { message: messageErreurBase(error) };
  rafraichir();
  redirect(avecSucces(`/logistique/tournees/${tourneeId}`, "Tournée partie : saisissez chaque remise chez le client."));
}

export async function terminerTournee(tourneeId: string, _e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("logistique");
  const km = kilometrage.safeParse(fd.get("km_retour") ?? "");
  if (!km.success || km.data === null) return { erreurs: { km_retour: "Relevez le compteur kilométrique au retour." }, valeurs: valeursFormulaire(fd) };
  const supabase = await clientServeur();
  const { error } = await supabase.rpc("terminer_tournee", { p_tournee: tourneeId, p_km: km.data });
  if (error) return { message: messageErreurBase(error) };
  rafraichir();
  redirect(avecSucces(`/logistique/tournees/${tourneeId}`, "Tournée clôturée."));
}

export async function annulerTournee(tourneeId: string): Promise<void> {
  await exigerEspace("logistique");
  const supabase = await clientServeur();
  const { error } = await supabase.from("tournees_livraison").update({ statut: "annulee" }).eq("id", tourneeId);
  if (error) throw new Error(messageErreurBase(error));
  rafraichir();
}

const schemaDepense = z.object({
  type_id: uuid("Choisissez le type de dépense."),
  montant_gnf: z
    .string()
    .transform((t) => lireNombre(t))
    .refine((n): n is number => n !== null && n > 0 && Number.isInteger(n), "Montant entier en GNF."),
  reference: z.string().trim().max(60),
});

export async function ajouterDepense(tourneeId: string, _e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("logistique");
  const valeurs = valeursFormulaire(fd);
  const lecture = schemaDepense.safeParse(valeurs);
  if (!lecture.success) return { erreurs: erreursZod(lecture.error), valeurs };
  const supabase = await clientServeur();
  const { error } = await supabase.from("depenses_tournee").insert({ tournee_id: tourneeId, ...lecture.data });
  if (error) return { message: messageErreurBase(error), valeurs };
  revalidatePath(`/logistique/tournees/${tourneeId}`);
  return { ok: true, message: "Dépense enregistrée." };
}

export async function supprimerDepense(id: string, tourneeId: string): Promise<void> {
  await exigerEspace("logistique");
  const supabase = await clientServeur();
  const { error } = await supabase.from("depenses_tournee").delete().eq("id", id);
  if (error) throw new Error(messageErreurBase(error));
  revalidatePath(`/logistique/tournees/${tourneeId}`);
}

// -----------------------------------------------------------------------------
// Remise chez le client (preuve de livraison)
// -----------------------------------------------------------------------------
const schemaRemise = z
  .object({
    statut: z.enum(["livree", "partielle", "refusee"], { error: "Choisissez le résultat de la livraison." }),
    receptionnaire: z.string().trim().max(80),
    commentaire: z.string().trim().max(300),
    signature: z.string().max(300).nullable(),
    photo: z.string().max(300).nullable(),
    latitude: z.number().min(-90).max(90).nullable(),
    longitude: z.number().min(-180).max(180).nullable(),
    precision: z.number().min(0).nullable(),
    retours: z.array(z.object({ ligne_id: uuid("Ligne invalide."), paquets: z.number().int().min(0) })),
  })
  .superRefine((d, ctx) => {
    if (d.statut !== "refusee" && !d.receptionnaire) ctx.addIssue({ code: "custom", path: ["receptionnaire"], message: "Nom de la personne qui réceptionne obligatoire." });
    if (d.statut !== "refusee" && !d.signature) ctx.addIssue({ code: "custom", path: ["signature"], message: "Faites signer le client." });
    if (d.statut === "refusee" && !d.commentaire) ctx.addIssue({ code: "custom", path: ["commentaire"], message: "Indiquez le motif du refus." });
    if (d.statut === "partielle" && !d.retours.some((r) => r.paquets > 0)) ctx.addIssue({ code: "custom", path: ["retours"], message: "Indiquez les paquets rapportés." });
  });

export type DonneesRemise = z.input<typeof schemaRemise>;

/** Les fichiers (signature, photo) sont déjà envoyés par le navigateur dans « preuves-livraison/<livraison>/ ». */
export async function enregistrerRemise(livraisonId: string, donnees: DonneesRemise): Promise<EtatFormulaire> {
  await exigerEspace("logistique");
  const lecture = schemaRemise.safeParse(donnees);
  if (!lecture.success) return { erreurs: erreursZod(lecture.error) };
  const d = lecture.data;
  const prefixe = `${livraisonId}/`;
  if ((d.signature && !d.signature.startsWith(prefixe)) || (d.photo && !d.photo.startsWith(prefixe))) return { message: "Fichier de preuve invalide." };
  const supabase = await clientServeur();
  const { error } = await supabase.rpc("enregistrer_remise", {
    p_livraison: livraisonId,
    p_statut: d.statut,
    p_receptionnaire: d.receptionnaire,
    p_signature: d.signature ?? undefined,
    p_photo: d.photo ?? undefined,
    p_latitude: d.latitude ?? undefined,
    p_longitude: d.longitude ?? undefined,
    p_precision: d.precision ?? undefined,
    p_commentaire: d.commentaire,
    p_retours: d.statut === "partielle" ? d.retours.filter((r) => r.paquets > 0) : [],
  });
  if (error) return { message: messageErreurBase(error) };
  rafraichir();
  return { ok: true, message: d.statut === "refusee" ? "Refus enregistré : les paquets reviennent en stock." : "Livraison enregistrée." };
}

/** Lien temporaire (5 minutes) vers une preuve (signature ou photo). */
export async function lienPreuve(chemin: string): Promise<string | null> {
  await exigerEspace("logistique");
  const supabase = await clientServeur();
  const { data } = await supabase.storage.from("preuves-livraison").createSignedUrl(chemin, 300);
  return data?.signedUrl ?? null;
}
