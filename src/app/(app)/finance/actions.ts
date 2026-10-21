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

const uuid = (m: string) => z.string().regex(/^[0-9a-f-]{36}$/i, m);
const uuidOptionnel = z
  .string()
  .optional()
  .transform((t) => (t ? t : null))
  .refine((t) => t === null || /^[0-9a-f-]{36}$/i.test(t), "Choix invalide.");
const date = z.string().regex(schemaDateIso, "Date invalide.");
const montantGnf = (m: string) =>
  z
    .string()
    .transform((t) => lireNombre(t))
    .refine((n): n is number => n !== null && n > 0 && Number.isInteger(n), m);
const decimal = (m: string, min = 0) =>
  z
    .string()
    .optional()
    .transform((t) => (t && t.trim() ? lireNombre(t) : 0))
    .refine((n): n is number => n !== null && n >= min, m);

function rafraichir() {
  revalidatePath("/finance", "layout");
}

// -----------------------------------------------------------------------------
// Factures fournisseurs
// -----------------------------------------------------------------------------
const schemaFacture = z
  .object({
    fournisseur_id: uuidOptionnel,
    tiers: z.string().trim().max(80),
    reference_fournisseur: z.string().trim().max(60),
    libelle: z.string().trim().min(2, "Libellé obligatoire.").max(160),
    categorie_id: uuid("Choisissez la catégorie."),
    date_facture: date,
    date_echeance: date,
    devise: z.enum(["GNF", "USD"]),
    montant_ht: decimal("Montant HT invalide."),
    montant_tva: decimal("TVA invalide."),
  })
  .superRefine((d, ctx) => {
    if (!d.fournisseur_id && !d.tiers) ctx.addIssue({ code: "custom", path: ["tiers"], message: "Choisissez un fournisseur ou indiquez le bénéficiaire." });
    if (d.montant_ht <= 0) ctx.addIssue({ code: "custom", path: ["montant_ht"], message: "Montant HT obligatoire." });
    if (d.date_echeance < d.date_facture) ctx.addIssue({ code: "custom", path: ["date_echeance"], message: "L'échéance est avant la date de facture." });
  });

export async function creerFactureFournisseur(_e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("finance");
  const valeurs = valeursFormulaire(fd);
  const lecture = schemaFacture.safeParse(valeurs);
  if (!lecture.success) return { erreurs: erreursZod(lecture.error), valeurs };
  const d = lecture.data;
  // Entiers : GNF, ou centimes d'USD (le taux de la date de facture est appliqué par la base).
  const facteur = d.devise === "USD" ? 100 : 1;
  const supabase = await clientServeur();
  const { data, error } = await supabase
    .from("factures_fournisseurs")
    .insert({ ...d, montant_ht: Math.round(d.montant_ht * facteur), montant_tva: Math.round(d.montant_tva * facteur) })
    .select("id")
    .single();
  if (error) return { message: messageErreurBase(error), valeurs };
  rafraichir();
  redirect(`/finance/fournisseurs/${data.id}`);
}

const schemaReglement = z.object({
  compte_id: uuid("Choisissez le compte."),
  montant_gnf: montantGnf("Montant entier en GNF."),
  date_reglement: date,
  reference: z.string().trim().max(60),
});

export async function reglerFacture(factureId: string, _e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("finance");
  const valeurs = valeursFormulaire(fd);
  const lecture = schemaReglement.safeParse(valeurs);
  if (!lecture.success) return { erreurs: erreursZod(lecture.error), valeurs };
  const d = lecture.data;
  const supabase = await clientServeur();
  const { error } = await supabase.rpc("regler_facture_fournisseur", { p_facture: factureId, p_compte: d.compte_id, p_montant_gnf: d.montant_gnf, p_date: d.date_reglement, p_reference: d.reference });
  if (error) return { message: messageErreurBase(error), valeurs };
  rafraichir();
  redirect(avecSucces(`/finance/fournisseurs/${factureId}`, "Règlement enregistré : la trésorerie est à jour."));
}

export async function annulerFacture(factureId: string): Promise<void> {
  await exigerEspace("finance");
  const supabase = await clientServeur();
  const { error } = await supabase.from("factures_fournisseurs").update({ statut: "annulee" }).eq("id", factureId);
  if (error) throw new Error(messageErreurBase(error));
  rafraichir();
}

export async function genererChargesMois(_e: EtatFormulaire): Promise<EtatFormulaire> {
  await exigerEspace("finance");
  const supabase = await clientServeur();
  const { data, error } = await supabase.rpc("generer_charges_mois", { p_mois: aujourdhui() });
  if (error) return { message: messageErreurBase(error) };
  rafraichir();
  return { ok: true, message: data ? `${data} facture(s) de charges fixes créée(s) pour ce mois.` : "Les charges fixes du mois sont déjà créées." };
}

// -----------------------------------------------------------------------------
// Trésorerie
// -----------------------------------------------------------------------------
const schemaMouvement = z.object({
  compte_id: uuid("Choisissez le compte."),
  sens: z.enum(["entree", "sortie"]),
  montant: decimal("Montant invalide.", 0.01),
  date_operation: date,
  categorie_id: uuidOptionnel,
  libelle: z.string().trim().min(2, "Libellé obligatoire.").max(160),
  reference: z.string().trim().max(60),
});

/** Mouvement divers (frais bancaires, apport, retrait…). Montant dans la devise du compte. */
export async function enregistrerMouvement(_e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("finance");
  const valeurs = valeursFormulaire(fd);
  const lecture = schemaMouvement.safeParse(valeurs);
  if (!lecture.success) return { erreurs: erreursZod(lecture.error), valeurs };
  const d = lecture.data;
  const supabase = await clientServeur();
  const { data: compte } = await supabase.from("comptes_tresorerie").select("devise").eq("id", d.compte_id).single();
  let montant = Math.round(d.montant);
  let taux = 1;
  if (compte?.devise === "USD") {
    const { data: t } = await supabase.rpc("taux_a_la_date", { p_devise: "USD", p_date: d.date_operation });
    taux = Number(t);
    montant = Math.round(d.montant * 100);
  }
  const montantGnfCalc = compte?.devise === "USD" ? Math.round((montant * taux) / 100) : montant;
  const { error } = await supabase.from("mouvements_tresorerie").insert({ ...d, montant, taux_change: taux, montant_gnf: montantGnfCalc, origine: "autre" });
  if (error) return { message: messageErreurBase(error), valeurs };
  rafraichir();
  return { ok: true, message: "Mouvement enregistré." };
}

const schemaVirement = z.object({
  de: uuid("Compte de départ."),
  vers: uuid("Compte d'arrivée."),
  montant_gnf: montantGnf("Montant entier en GNF."),
  date_operation: date,
  libelle: z.string().trim().max(160),
});

export async function enregistrerVirement(_e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("finance");
  const valeurs = valeursFormulaire(fd);
  const lecture = schemaVirement.safeParse(valeurs);
  if (!lecture.success) return { erreurs: erreursZod(lecture.error), valeurs };
  const d = lecture.data;
  const supabase = await clientServeur();
  const { error } = await supabase.rpc("virement_interne", { p_de: d.de, p_vers: d.vers, p_montant_gnf: d.montant_gnf, p_date: d.date_operation, p_libelle: d.libelle || "Virement interne" });
  if (error) return { message: messageErreurBase(error), valeurs };
  rafraichir();
  redirect(avecSucces("/finance/tresorerie", "Virement enregistré."));
}
