"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { exigerEspace } from "@/lib/auth/session";
import { aujourdhui, schemaDateIso } from "@/lib/formulaires/dates";
import { erreursZod, messageErreurBase, valeursFormulaire, type EtatFormulaire } from "@/lib/formulaires/etat";
import { lireNombre } from "@/lib/formulaires/nombres";
import { avecSucces } from "@/lib/formulaires/succes";
import { clientServeur } from "@/lib/supabase/serveur";

const uuidRegex = /^[0-9a-f-]{36}$/i;

function rafraichir() {
  revalidatePath("/qualite", "layout");
}

// -----------------------------------------------------------------------------
// Contrôles
// -----------------------------------------------------------------------------
const schemaControle = z
  .object({
    etape: z.enum(["reception", "production", "produit_fini"], { error: "Choisissez l'étape." }),
    date_controle: z.string().regex(schemaDateIso, "Date invalide."),
    lot_id: z.string().optional(),
    fiche_id: z.string().optional(),
  })
  .superRefine((d, ctx) => {
    if (d.etape === "reception" && !uuidRegex.test(d.lot_id ?? "")) ctx.addIssue({ code: "custom", path: ["lot_id"], message: "Choisissez la bobine contrôlée." });
    if (d.etape !== "reception" && !uuidRegex.test(d.fiche_id ?? "")) ctx.addIssue({ code: "custom", path: ["fiche_id"], message: "Choisissez le lot de produits finis (fiche)." });
  });

export async function creerControle(_e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("qualite");
  const valeurs = valeursFormulaire(fd);
  const lecture = schemaControle.safeParse(valeurs);
  if (!lecture.success) return { erreurs: erreursZod(lecture.error), valeurs };
  const d = lecture.data;
  const supabase = await clientServeur();
  const { data, error } = await supabase
    .from("controles_qualite")
    .insert({ etape: d.etape, date_controle: d.date_controle, lot_id: d.etape === "reception" ? d.lot_id : null, fiche_id: d.etape === "reception" ? null : d.fiche_id })
    .select("id")
    .single();
  if (error) return { message: messageErreurBase(error), valeurs };
  rafraichir();
  redirect(`/qualite/controles/${data.id}`);
}

/**
 * Enregistre les mesures (champs « valeur_<critère> », « visuel_<critère> », « commentaire_<critère> ») puis valide.
 * La conformité des mesures chiffrées est recalculée par la base.
 */
export async function saisirEtValiderControle(controleId: string, _e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("qualite");
  const valeurs = valeursFormulaire(fd);
  const supabase = await clientServeur();
  const { data: c } = await supabase.from("controles_qualite").select("etape").eq("id", controleId).single();
  if (!c) return { message: "Contrôle introuvable." };
  const { data: criteres } = await supabase.from("criteres_qualite").select("id, libelle, type_mesure").eq("etape", c.etape).eq("actif", true);
  const erreurs: Record<string, string> = {};
  const mesures: { controle_id: string; critere_id: string; valeur: number | null; conforme: boolean; commentaire: string }[] = [];
  for (const cr of criteres ?? []) {
    const commentaire = String(fd.get(`commentaire_${cr.id}`) ?? "").trim().slice(0, 200);
    if (cr.type_mesure === "mesure") {
      const brut = String(fd.get(`valeur_${cr.id}`) ?? "").trim();
      if (!brut) continue; // critère non mesuré ce jour-là
      const n = lireNombre(brut);
      if (n === null) {
        erreurs[`valeur_${cr.id}`] = "Nombre invalide.";
        continue;
      }
      mesures.push({ controle_id: controleId, critere_id: cr.id, valeur: n, conforme: true, commentaire });
    } else {
      const v = fd.get(`visuel_${cr.id}`);
      if (v === "conforme" || v === "non_conforme") mesures.push({ controle_id: controleId, critere_id: cr.id, valeur: null, conforme: v === "conforme", commentaire });
    }
  }
  if (Object.keys(erreurs).length) return { erreurs, valeurs };
  if (!mesures.length) return { message: "Saisissez au moins une mesure.", valeurs };
  await supabase.from("controles_qualite").update({ notes: String(fd.get("notes") ?? "").slice(0, 500) }).eq("id", controleId);
  await supabase.from("mesures_controle").delete().eq("controle_id", controleId);
  const { error } = await supabase.from("mesures_controle").insert(mesures);
  if (error) return { message: messageErreurBase(error), valeurs };
  const { data: nc, error: errV } = await supabase.rpc("valider_controle", { p_controle: controleId });
  if (errV) return { message: messageErreurBase(errV), valeurs };
  rafraichir();
  redirect(
    avecSucces(
      `/qualite/controles/${controleId}`,
      nc ? `Contrôle NON CONFORME : non-conformité ${nc} ouverte${c.etape === "reception" ? ", bobine bloquée" : ""}.` : "Contrôle conforme et validé.",
    ),
  );
}

export async function supprimerControle(controleId: string): Promise<void> {
  await exigerEspace("qualite");
  const supabase = await clientServeur();
  const { error } = await supabase.from("controles_qualite").delete().eq("id", controleId);
  if (error) throw new Error(messageErreurBase(error));
  rafraichir();
  redirect("/qualite/controles");
}

export async function deciderLot(lotId: string, bloquer: boolean, _e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("qualite");
  const supabase = await clientServeur();
  const { error } = await supabase.rpc("decider_lot", { p_lot: lotId, p_bloquer: bloquer, p_motif: String(fd.get("motif") ?? "") });
  if (error) return { message: messageErreurBase(error) };
  rafraichir();
  revalidatePath("/magasin", "layout");
  return { ok: true, message: bloquer ? "Bobine bloquée : elle ne peut plus sortir du stock." : "Bobine libérée." };
}

// -----------------------------------------------------------------------------
// Non-conformités
// -----------------------------------------------------------------------------
export async function analyserNc(ncId: string, _e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("qualite");
  const statut = fd.get("statut") === "en_traitement" ? "en_traitement" : "ouverte";
  const gravite = String(fd.get("gravite") ?? "");
  if (!["mineure", "majeure", "critique"].includes(gravite)) return { erreurs: { gravite: "Gravité invalide." } };
  const supabase = await clientServeur();
  const { error } = await supabase
    .from("non_conformites")
    .update({ cause_racine: String(fd.get("cause_racine") ?? "").trim().slice(0, 1000), statut, gravite: gravite as "mineure" | "majeure" | "critique" })
    .eq("id", ncId);
  if (error) return { message: messageErreurBase(error) };
  rafraichir();
  return { ok: true, message: "Analyse enregistrée." };
}

const schemaAction = z.object({
  description: z.string().trim().min(3, "Décrivez l'action.").max(500),
  responsable: z.string().trim().max(80),
  echeance: z
    .string()
    .optional()
    .transform((t) => (t ? t : null))
    .refine((t) => t === null || schemaDateIso.test(t), "Date invalide."),
});

export async function ajouterAction(ncId: string, _e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("qualite");
  const valeurs = valeursFormulaire(fd);
  const lecture = schemaAction.safeParse(valeurs);
  if (!lecture.success) return { erreurs: erreursZod(lecture.error), valeurs };
  const supabase = await clientServeur();
  const { error } = await supabase.from("actions_correctives").insert({ nc_id: ncId, ...lecture.data });
  if (error) return { message: messageErreurBase(error), valeurs };
  // Une NC avec une action engagée passe « en traitement ».
  await supabase.from("non_conformites").update({ statut: "en_traitement" }).eq("id", ncId).eq("statut", "ouverte");
  rafraichir();
  return { ok: true, message: "Action ajoutée." };
}

export async function marquerActionRealisee(actionId: string, ncId: string, efficace: boolean): Promise<void> {
  await exigerEspace("qualite");
  const supabase = await clientServeur();
  const { error } = await supabase
    .from("actions_correctives")
    .update({ realisee_le: aujourdhui(), efficace })
    .eq("id", actionId);
  if (error) throw new Error(messageErreurBase(error));
  revalidatePath(`/qualite/non-conformites/${ncId}`);
}

export async function cloturerNc(ncId: string, _e: EtatFormulaire): Promise<EtatFormulaire> {
  await exigerEspace("qualite");
  const supabase = await clientServeur();
  const { error } = await supabase.rpc("cloturer_nc", { p_nc: ncId });
  if (error) return { message: messageErreurBase(error) };
  rafraichir();
  redirect(avecSucces(`/qualite/non-conformites/${ncId}`, "Non-conformité clôturée."));
}
