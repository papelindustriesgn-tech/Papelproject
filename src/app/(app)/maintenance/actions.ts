"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { exigerEspace } from "@/lib/auth/session";
import { erreursZod, messageErreurBase, valeursFormulaire, type EtatFormulaire } from "@/lib/formulaires/etat";
import { lireNombre } from "@/lib/formulaires/nombres";
import { avecSucces } from "@/lib/formulaires/succes";
import { lireDateHeure } from "@/lib/maintenance/libelles";
import { clientServeur } from "@/lib/supabase/serveur";

const uuid = (m: string) => z.string().regex(/^[0-9a-f-]{36}$/i, m);
const montant = z
  .string()
  .optional()
  .transform((t) => (t && t.trim() ? lireNombre(t) : 0))
  .refine((n): n is number => n !== null && n >= 0 && Number.isInteger(n), "Montant entier en GNF.");

function rafraichir() {
  revalidatePath("/maintenance", "layout");
}

// -----------------------------------------------------------------------------
// Ordres de travail
// -----------------------------------------------------------------------------
const schemaOt = z.object({
  equipement_id: uuid("Choisissez l'équipement."),
  type_intervention: z.enum(["curative", "preventive", "amelioration"]),
  priorite: z.enum(["urgente", "normale", "basse"]),
  description: z.string().trim().min(3, "Décrivez l'intervention.").max(500),
  arret_machine: z.string().optional().transform((v) => v === "on"),
});

export async function creerIntervention(_e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("maintenance");
  const valeurs = valeursFormulaire(fd);
  const lecture = schemaOt.safeParse(valeurs);
  if (!lecture.success) return { erreurs: erreursZod(lecture.error), valeurs };
  const supabase = await clientServeur();
  const { data, error } = await supabase.from("interventions").insert(lecture.data).select("id").single();
  if (error) return { message: messageErreurBase(error), valeurs };
  rafraichir();
  redirect(`/maintenance/interventions/${data.id}`);
}

const schemaSuivi = z
  .object({
    debut: z.string().optional(),
    fin: z.string().optional(),
    intervenant: z.string().trim().max(80),
    cause: z.string().trim().max(300),
    travaux: z.string().trim().max(1000),
    arret_machine: z.string().optional().transform((v) => v === "on"),
    cout_main_oeuvre_gnf: montant,
    cout_externe_gnf: montant,
  })
  .transform((d) => ({ ...d, debut: lireDateHeure(d.debut), fin: lireDateHeure(d.fin) }))
  .superRefine((d, ctx) => {
    if (d.debut && d.fin && d.fin < d.debut) ctx.addIssue({ code: "custom", path: ["fin"], message: "La fin est avant le début." });
  });

/** Enregistre le suivi ; avec « terminer », clôture l'intervention (pièces sorties du stock). */
export async function enregistrerIntervention(id: string, _e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("maintenance");
  const valeurs = valeursFormulaire(fd);
  const lecture = schemaSuivi.safeParse(valeurs);
  if (!lecture.success) return { erreurs: erreursZod(lecture.error), valeurs };
  const supabase = await clientServeur();
  const d = lecture.data;
  const { error } = await supabase
    .from("interventions")
    .update({ ...d, statut: d.debut ? "en_cours" : "demandee" })
    .eq("id", id);
  if (error) return { message: messageErreurBase(error), valeurs };
  if (fd.get("terminer") === "1") {
    const { error: e2 } = await supabase.rpc("terminer_intervention", { p_intervention: id });
    if (e2) return { message: messageErreurBase(e2), valeurs };
    rafraichir();
    redirect(avecSucces(`/maintenance/interventions/${id}`, "Intervention terminée : pièces sorties du stock."));
  }
  rafraichir();
  return { ok: true, message: "Suivi enregistré." };
}

export async function annulerIntervention(id: string): Promise<void> {
  await exigerEspace("maintenance");
  const supabase = await clientServeur();
  const { error } = await supabase.from("interventions").update({ statut: "annulee" }).eq("id", id);
  if (error) throw new Error(messageErreurBase(error));
  rafraichir();
}

const schemaPiece = z.object({
  article_id: uuid("Choisissez la pièce."),
  quantite: z
    .string()
    .transform((t) => lireNombre(t))
    .refine((n): n is number => n !== null && n > 0, "Quantité invalide."),
});

export async function ajouterPiece(interventionId: string, _e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("maintenance");
  const valeurs = valeursFormulaire(fd);
  const lecture = schemaPiece.safeParse(valeurs);
  if (!lecture.success) return { erreurs: erreursZod(lecture.error), valeurs };
  const supabase = await clientServeur();
  const { error } = await supabase.from("intervention_pieces").insert({ intervention_id: interventionId, ...lecture.data });
  if (error) return { message: error.code === "23505" ? "Cette pièce est déjà sur l'intervention." : messageErreurBase(error), valeurs };
  revalidatePath(`/maintenance/interventions/${interventionId}`);
  return { ok: true, message: "Pièce ajoutée (sortie du stock à la clôture)." };
}

export async function retirerPiece(id: string, interventionId: string): Promise<void> {
  await exigerEspace("maintenance");
  const supabase = await clientServeur();
  const { error } = await supabase.from("intervention_pieces").delete().eq("id", id);
  if (error) throw new Error(messageErreurBase(error));
  revalidatePath(`/maintenance/interventions/${interventionId}`);
}

// -----------------------------------------------------------------------------
// Préventif
// -----------------------------------------------------------------------------
const schemaPlan = z.object({
  equipement_id: uuid("Choisissez l'équipement."),
  libelle: z.string().trim().min(3, "Libellé obligatoire.").max(120),
  frequence_jours: z
    .string()
    .transform((t) => lireNombre(t))
    .refine((n): n is number => n !== null && Number.isInteger(n) && n > 0, "Fréquence : nombre entier de jours."),
  duree_estimee_min: z
    .string()
    .optional()
    .transform((t) => (t && t.trim() ? lireNombre(t) : null))
    .refine((n) => n === null || (Number.isInteger(n) && n > 0), "Durée en minutes."),
  consignes: z.string().trim().max(500),
});

export async function creerPlan(_e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("maintenance");
  const valeurs = valeursFormulaire(fd);
  const lecture = schemaPlan.safeParse(valeurs);
  if (!lecture.success) return { erreurs: erreursZod(lecture.error), valeurs };
  const supabase = await clientServeur();
  const { error } = await supabase.from("plans_preventifs").insert(lecture.data);
  if (error) return { message: messageErreurBase(error), valeurs };
  rafraichir();
  return { ok: true, message: "Plan préventif créé (échéance : aujourd'hui, puis selon la fréquence)." };
}

export async function archiverPlan(id: string): Promise<void> {
  await exigerEspace("maintenance");
  const supabase = await clientServeur();
  const { error } = await supabase.from("plans_preventifs").update({ actif: false }).eq("id", id);
  if (error) throw new Error(messageErreurBase(error));
  rafraichir();
}

export async function genererPreventifs(_e: EtatFormulaire): Promise<EtatFormulaire> {
  await exigerEspace("maintenance");
  const supabase = await clientServeur();
  const { data, error } = await supabase.rpc("generer_preventifs", { p_horizon_jours: 7 });
  if (error) return { message: messageErreurBase(error) };
  rafraichir();
  return { ok: true, message: data ? `${data} ordre(s) de travail préventif(s) créé(s).` : "Aucune nouvelle échéance dans les 7 jours." };
}

// -----------------------------------------------------------------------------
// Pièces de rechange d'un équipement
// -----------------------------------------------------------------------------
export async function associerPiece(equipementId: string, _e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("maintenance");
  const articleId = String(fd.get("article_id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(articleId)) return { erreurs: { article_id: "Choisissez la pièce." } };
  const supabase = await clientServeur();
  const { error } = await supabase.from("equipement_pieces").insert({ equipement_id: equipementId, article_id: articleId, critique: fd.get("critique") === "on" });
  if (error) return { message: error.code === "23505" ? "Pièce déjà associée." : messageErreurBase(error) };
  revalidatePath(`/maintenance/equipements/${equipementId}`);
  return { ok: true, message: "Pièce associée." };
}

export async function dissocierPiece(id: string, equipementId: string): Promise<void> {
  await exigerEspace("maintenance");
  const supabase = await clientServeur();
  const { error } = await supabase.from("equipement_pieces").delete().eq("id", id);
  if (error) throw new Error(messageErreurBase(error));
  revalidatePath(`/maintenance/equipements/${equipementId}`);
}
