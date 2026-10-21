"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { exigerEspace } from "@/lib/auth/session";
import { schemaDateIso } from "@/lib/formulaires/dates";
import { erreursZod, messageErreurBase, valeursFormulaire, type EtatFormulaire } from "@/lib/formulaires/etat";
import { lireNombre } from "@/lib/formulaires/nombres";
import { avecSucces } from "@/lib/formulaires/succes";
import { colis, colisVersPaquets, paquets as paq, somme } from "@/lib/metier/unites";
import { clientServeur } from "@/lib/supabase/serveur";
import type { Database } from "@/lib/supabase/types";

const uuid = (message: string) => z.string().regex(/^[0-9a-f-]{36}$/i, message);
const uuidOptionnel = z
  .string()
  .optional()
  .transform((t) => (t ? t : null))
  .refine((t) => t === null || /^[0-9a-f-]{36}$/i.test(t), "Sélection invalide.");
const nombre = (min: number, message: string, entier = false) =>
  z
    .string()
    .optional()
    .transform((t) => (t === undefined || t.trim() === "" ? 0 : lireNombre(t)))
    .refine((n): n is number => n !== null && n >= min && (!entier || Number.isInteger(n)), message);

function rafraichirFiche(ficheId: string) {
  revalidatePath(`/production/fiches/${ficheId}`);
  revalidatePath("/production", "layout");
}

// -----------------------------------------------------------------------------
// Fiches
// -----------------------------------------------------------------------------
const schemaFiche = z.object({
  date_production: z.string().regex(schemaDateIso, "Date invalide."),
  poste_id: uuid("Choisissez le poste."),
  ligne_id: uuid("Choisissez la ligne."),
  equipe_id: uuidOptionnel,
  of_id: uuidOptionnel,
});

export async function creerFiche(_e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("production");
  const valeurs = valeursFormulaire(fd);
  const lecture = schemaFiche.safeParse(valeurs);
  if (!lecture.success) return { erreurs: erreursZod(lecture.error), valeurs };
  const supabase = await clientServeur();
  const { data, error } = await supabase.from("fiches_production").insert(lecture.data).select("id").single();
  if (error) {
    const message = error.code === "23505" ? "Une fiche existe déjà pour ce jour, ce poste et cette ligne : ouvrez-la dans la liste." : messageErreurBase(error);
    return { message, valeurs };
  }
  revalidatePath("/production", "layout");
  redirect(`/production/fiches/${data.id}`);
}

const schemaEnTete = z.object({ equipe_id: uuidOptionnel, of_id: uuidOptionnel, notes: z.string().trim().max(1000) });

export async function modifierEnTete(ficheId: string, _e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("production");
  const valeurs = valeursFormulaire(fd);
  const lecture = schemaEnTete.safeParse(valeurs);
  if (!lecture.success) return { erreurs: erreursZod(lecture.error), valeurs };
  const supabase = await clientServeur();
  const { error } = await supabase.from("fiches_production").update(lecture.data).eq("id", ficheId);
  if (error) return { message: messageErreurBase(error), valeurs };
  rafraichirFiche(ficheId);
  return { ok: true, message: "Enregistré." };
}

export async function supprimerFiche(ficheId: string): Promise<void> {
  await exigerEspace("production");
  const supabase = await clientServeur();
  const { error } = await supabase.from("fiches_production").delete().eq("id", ficheId);
  if (error) throw new Error(messageErreurBase(error));
  revalidatePath("/production", "layout");
  redirect("/production/fiches");
}

export async function validerFiche(ficheId: string, _e: EtatFormulaire): Promise<EtatFormulaire> {
  await exigerEspace("production");
  const supabase = await clientServeur();
  const { error } = await supabase.rpc("valider_fiche_production", { p_fiche: ficheId });
  if (error) return { message: messageErreurBase(error) };
  rafraichirFiche(ficheId);
  revalidatePath("/magasin", "layout");
  redirect(avecSucces(`/production/fiches/${ficheId}`, "Fiche validée : bobines sorties du stock, produits finis entrés au coût de revient."));
}

// -----------------------------------------------------------------------------
// Lignes de la fiche
// -----------------------------------------------------------------------------
const schemaProduction = z.object({
  conditionnement_id: uuid("Choisissez le produit et le colis."),
  colis: nombre(0, "Nombre de colis invalide.", true),
  paquets_vrac: nombre(0, "Nombre de paquets invalide.", true),
  rebuts_kg: nombre(0, "Rebuts invalides (kg)."),
});

export async function ajouterProduction(ficheId: string, _e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("production");
  const valeurs = valeursFormulaire(fd);
  const lecture = schemaProduction.safeParse(valeurs);
  if (!lecture.success) return { erreurs: erreursZod(lecture.error), valeurs };
  const d = lecture.data;
  const supabase = await clientServeur();
  const { data: c } = await supabase.from("conditionnements").select("paquets_par_colis").eq("id", d.conditionnement_id).single();
  if (!c) return { message: "Conditionnement introuvable.", valeurs };
  // Conversion centralisée : colis complets → paquets, puis ajout des paquets en vrac (même unité).
  const total = somme(colisVersPaquets(colis(d.colis), { paquetsParColis: c.paquets_par_colis }), paq(d.paquets_vrac));
  if (total === 0 && d.rebuts_kg === 0) return { erreurs: { colis: "Saisissez des colis, des paquets ou des rebuts." }, valeurs };
  const { error } = await supabase.from("fiche_productions").insert({ fiche_id: ficheId, conditionnement_id: d.conditionnement_id, paquets: total, rebuts_kg: d.rebuts_kg });
  if (error) {
    const message = error.code === "23505" ? "Ce produit est déjà saisi sur la fiche : supprimez la ligne pour la corriger." : messageErreurBase(error);
    return { message, valeurs };
  }
  rafraichirFiche(ficheId);
  return { ok: true, message: `Production ajoutée : ${total.toLocaleString("fr-FR")} paquets.` };
}

const schemaConsommation = z.object({
  article_id: uuid("Choisissez l'article."),
  lot_id: uuidOptionnel,
  quantite: nombre(0, "Quantité invalide.").refine((n) => n > 0, "Saisissez une quantité supérieure à zéro."),
});

export async function ajouterConsommation(ficheId: string, _e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("production");
  const valeurs = valeursFormulaire(fd);
  const lecture = schemaConsommation.safeParse(valeurs);
  if (!lecture.success) return { erreurs: erreursZod(lecture.error), valeurs };
  const d = lecture.data;
  const supabase = await clientServeur();
  const { data: article } = await supabase.from("articles").select("suivi_par_lot").eq("id", d.article_id).single();
  if (article?.suivi_par_lot && !d.lot_id) return { erreurs: { lot_id: "Choisissez la bobine (n° de lot)." }, valeurs };
  const { error } = await supabase.from("fiche_consommations").insert({ fiche_id: ficheId, article_id: d.article_id, lot_id: article?.suivi_par_lot ? d.lot_id : null, quantite: d.quantite });
  if (error) return { message: messageErreurBase(error), valeurs };
  rafraichirFiche(ficheId);
  return { ok: true, message: "Consommation ajoutée." };
}

const schemaArret = z.object({
  cause_id: uuid("Choisissez la cause."),
  duree_min: nombre(1, "Durée en minutes (nombre entier).", true).refine((n) => n <= 1440, "Durée maximale : 1 440 minutes."),
  heure_debut: z
    .string()
    .optional()
    .transform((t) => (t ? t : null))
    .refine((t) => t === null || /^([01]\d|2[0-3]):[0-5]\d$/.test(t), "Heure invalide."),
  commentaire: z.string().trim().max(300),
});

export async function ajouterArret(ficheId: string, _e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("production");
  const valeurs = valeursFormulaire(fd);
  const lecture = schemaArret.safeParse(valeurs);
  if (!lecture.success) return { erreurs: erreursZod(lecture.error), valeurs };
  const supabase = await clientServeur();
  const { error } = await supabase.from("fiche_arrets").insert({ fiche_id: ficheId, ...lecture.data });
  if (error) return { message: messageErreurBase(error), valeurs };
  rafraichirFiche(ficheId);
  return { ok: true, message: "Arrêt ajouté." };
}

type TableLigne = "fiche_consommations" | "fiche_productions" | "fiche_arrets";

export async function supprimerLigneFiche(table: TableLigne, id: string, ficheId: string): Promise<void> {
  await exigerEspace("production");
  if (!["fiche_consommations", "fiche_productions", "fiche_arrets"].includes(table)) throw new Error("Table invalide.");
  const supabase = await clientServeur();
  const { error } = await supabase.from(table).delete().eq("id", id).eq("fiche_id", ficheId);
  if (error) throw new Error(messageErreurBase(error));
  rafraichirFiche(ficheId);
}

export async function enregistrerOperateurs(ficheId: string, _e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("production");
  const ids = fd.getAll("operateurs").map(String).filter((v) => /^[0-9a-f-]{36}$/i.test(v));
  const supabase = await clientServeur();
  const { error: e1 } = await supabase.from("fiche_operateurs").delete().eq("fiche_id", ficheId);
  if (e1) return { message: messageErreurBase(e1) };
  if (ids.length) {
    const { error: e2 } = await supabase.from("fiche_operateurs").insert(ids.map((operateur_id) => ({ fiche_id: ficheId, operateur_id })));
    if (e2) return { message: messageErreurBase(e2) };
  }
  rafraichirFiche(ficheId);
  return { ok: true, message: `${ids.length} opérateur(s) présent(s).` };
}

// -----------------------------------------------------------------------------
// Ordres de fabrication
// -----------------------------------------------------------------------------
const schemaOf = z.object({
  conditionnement_id: uuid("Choisissez le produit et le colis."),
  quantite_colis: nombre(1, "Quantité visée en colis (nombre entier).", true),
  date_debut_prevue: z.string().regex(schemaDateIso, "Date invalide."),
  date_fin_prevue: z.string().regex(schemaDateIso, "Date invalide."),
  campagne_id: uuidOptionnel,
  ligne_id: uuidOptionnel,
  notes: z.string().trim().max(500),
});

export async function creerOrdre(_e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("production");
  const valeurs = valeursFormulaire(fd);
  const lecture = schemaOf.safeParse(valeurs);
  if (!lecture.success) return { erreurs: erreursZod(lecture.error), valeurs };
  if (lecture.data.date_fin_prevue < lecture.data.date_debut_prevue) return { erreurs: { date_fin_prevue: "La fin doit être après le début." }, valeurs };
  const supabase = await clientServeur();
  const { data, error } = await supabase.from("ordres_fabrication").insert(lecture.data).select("numero").single();
  if (error) return { message: messageErreurBase(error), valeurs };
  revalidatePath("/production/ordres");
  return { ok: true, message: `Ordre ${data.numero} créé.` };
}

export async function changerStatutOrdre(id: string, statut: Database["public"]["Enums"]["statut_of"]): Promise<void> {
  await exigerEspace("production");
  const supabase = await clientServeur();
  const { error } = await supabase.from("ordres_fabrication").update({ statut }).eq("id", id);
  if (error) throw new Error(messageErreurBase(error));
  revalidatePath("/production/ordres");
}
