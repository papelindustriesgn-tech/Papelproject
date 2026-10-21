"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { exigerEspace } from "@/lib/auth/session";
import { schemaDateIso } from "@/lib/formulaires/dates";
import { erreursZod, messageErreurBase, valeursFormulaire, type EtatFormulaire } from "@/lib/formulaires/etat";
import { lireNombre } from "@/lib/formulaires/nombres";
import { avecSucces } from "@/lib/formulaires/succes";
import { KG_PAR_TONNE, tonnes, tonnesVersKg } from "@/lib/metier/unites";
import { clientServeur } from "@/lib/supabase/serveur";

const uuid = (m: string) => z.string().regex(/^[0-9a-f-]{36}$/i, m);
const dateOptionnelle = z
  .string()
  .optional()
  .transform((t) => (t ? t : null))
  .refine((t) => t === null || schemaDateIso.test(t), "Date invalide.");
const positif = (m: string) =>
  z
    .string()
    .transform((t) => lireNombre(t))
    .refine((n): n is number => n !== null && n > 0, m);

function rafraichir() {
  revalidatePath("/achats", "layout");
}

// -----------------------------------------------------------------------------
// Demandes d'achat
// -----------------------------------------------------------------------------
export async function traiterDemande(id: string, decision: "approuvee" | "refusee", _e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  const u = await exigerEspace("achats");
  const supabase = await clientServeur();
  const { error } = await supabase
    .from("demandes_achat")
    .update({ statut: decision, traite_par: u.id, commentaire: String(fd.get("commentaire") ?? "").slice(0, 300) })
    .eq("id", id)
    .eq("statut", "soumise");
  if (error) return { message: messageErreurBase(error) };
  rafraichir();
  return { ok: true, message: decision === "approuvee" ? "Demande approuvée." : "Demande refusée." };
}

// -----------------------------------------------------------------------------
// Bons de commande
// -----------------------------------------------------------------------------
const schemaBc = z.object({
  fournisseur_id: uuid("Choisissez le fournisseur."),
  devise: z.enum(["USD", "GNF"], { error: "Choisissez la devise." }),
  date_commande: z.string().regex(schemaDateIso, "Date invalide."),
  incoterm: z.string().trim().max(40),
  date_livraison_prevue: dateOptionnelle,
  frais_estimes_gnf: z
    .string()
    .optional()
    .transform((t) => (t && t.trim() ? lireNombre(t) : 0))
    .refine((n): n is number => n !== null && n >= 0 && Number.isInteger(n), "Montant entier en GNF."),
  notes: z.string().trim().max(500),
});

export async function creerBc(_e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("achats");
  const valeurs = valeursFormulaire(fd);
  const lecture = schemaBc.safeParse(valeurs);
  if (!lecture.success) return { erreurs: erreursZod(lecture.error), valeurs };
  const supabase = await clientServeur();
  const { data, error } = await supabase.from("bons_commande").insert(lecture.data).select("id").single();
  if (error) return { message: messageErreurBase(error), valeurs };
  // Rattache les demandes approuvées cochées.
  const demandes = fd.getAll("demandes").map(String).filter((d) => /^[0-9a-f-]{36}$/i.test(d));
  if (demandes.length) await supabase.from("demandes_achat").update({ bc_id: data.id }).in("id", demandes).eq("statut", "approuvee");
  rafraichir();
  redirect(`/achats/commandes/${data.id}`);
}

const schemaLigne = z.object({
  article_id: uuid("Choisissez l'article."),
  quantite: positif("Quantité invalide."),
  unite_saisie: z.enum(["stock", "tonne"]),
  prix_unitaire: z
    .string()
    .transform((t) => lireNombre(t))
    .refine((n): n is number => n !== null && n >= 0, "Prix invalide."),
});

/** Ligne de commande. Pour un article au kg, la quantité et le prix peuvent être saisis à la tonne (conversion centralisée). */
export async function ajouterLigneBc(bcId: string, _e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("achats");
  const valeurs = valeursFormulaire(fd);
  const lecture = schemaLigne.safeParse(valeurs);
  if (!lecture.success) return { erreurs: erreursZod(lecture.error), valeurs };
  const d = lecture.data;
  const supabase = await clientServeur();
  const { data: article } = await supabase.from("articles").select("unite").eq("id", d.article_id).single();
  let quantite = d.quantite;
  let prix = d.prix_unitaire;
  if (d.unite_saisie === "tonne") {
    if (article?.unite !== "kg") return { erreurs: { unite_saisie: "La saisie en tonnes n'est possible que pour un article géré en kg." }, valeurs };
    quantite = tonnesVersKg(tonnes(d.quantite));
    prix = d.prix_unitaire / KG_PAR_TONNE; // prix à la tonne → prix au kg
  }
  const { error } = await supabase.from("lignes_bc").insert({ bc_id: bcId, article_id: d.article_id, quantite, prix_unitaire: prix });
  if (error) return { message: messageErreurBase(error), valeurs };
  revalidatePath(`/achats/commandes/${bcId}`);
  return { ok: true, message: "Ligne ajoutée." };
}

export async function supprimerLigneBc(ligneId: string, bcId: string): Promise<void> {
  await exigerEspace("achats");
  const supabase = await clientServeur();
  const { error } = await supabase.from("lignes_bc").delete().eq("id", ligneId);
  if (error) throw new Error(messageErreurBase(error));
  revalidatePath(`/achats/commandes/${bcId}`);
}

export async function envoyerBc(bcId: string, _e: EtatFormulaire): Promise<EtatFormulaire> {
  await exigerEspace("achats");
  const supabase = await clientServeur();
  const { data, error } = await supabase.rpc("envoyer_bc", { p_bc: bcId });
  if (error) return { message: messageErreurBase(error) };
  rafraichir();
  redirect(avecSucces(`/achats/commandes/${bcId}`, `Bon de commande ${data} envoyé (taux du jour figé).`));
}

export async function changerStatutBc(bcId: string, statut: "recu" | "annule"): Promise<void> {
  await exigerEspace("achats");
  const supabase = await clientServeur();
  const { error } = await supabase.from("bons_commande").update({ statut }).eq("id", bcId);
  if (error) throw new Error(messageErreurBase(error));
  rafraichir();
}

// -----------------------------------------------------------------------------
// Conteneurs
// -----------------------------------------------------------------------------
const schemaConteneur = z.object({
  reference: z.string().trim().min(1, "Référence du conteneur obligatoire (ex. MSCU1234567).").max(40),
  navire: z.string().trim().max(60),
  poids_net_prevu_kg: z
    .string()
    .transform((t) => lireNombre(t))
    .refine((n): n is number => n !== null && n > 0, "Poids net déclaré (kg) invalide."),
  date_embarquement_prevue: dateOptionnelle,
  date_arrivee_port_prevue: dateOptionnelle,
  date_dedouanement_prevue: dateOptionnelle,
  date_livraison_prevue: dateOptionnelle,
});

export async function ajouterConteneur(bcId: string, _e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("achats");
  const valeurs = valeursFormulaire(fd);
  const lecture = schemaConteneur.safeParse(valeurs);
  if (!lecture.success) return { erreurs: erreursZod(lecture.error), valeurs };
  const supabase = await clientServeur();
  const { data, error } = await supabase.from("conteneurs").insert({ bc_id: bcId, ...lecture.data }).select("id").single();
  if (error) return { message: error.code === "23505" ? "Cette référence existe déjà sur ce bon de commande." : messageErreurBase(error), valeurs };
  rafraichir();
  redirect(`/achats/conteneurs/${data.id}`);
}

const champsDates = [
  "date_embarquement_prevue", "date_embarquement_reelle", "date_arrivee_port_prevue", "date_arrivee_port_reelle",
  "date_dedouanement_prevue", "date_dedouanement_reelle", "date_livraison_prevue", "date_livraison_reelle",
] as const;

export async function enregistrerSuivi(conteneurId: string, _e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("achats");
  const maj: Record<string, string | null> = {};
  const erreurs: Record<string, string> = {};
  for (const c of champsDates) {
    const v = String(fd.get(c) ?? "").trim();
    if (v && !schemaDateIso.test(v)) erreurs[c] = "Date invalide.";
    maj[c] = v || null;
  }
  if (Object.keys(erreurs).length) return { erreurs };
  const supabase = await clientServeur();
  const { error } = await supabase.from("conteneurs").update({ ...maj, notes: String(fd.get("notes") ?? "").slice(0, 500) }).eq("id", conteneurId);
  if (error) return { message: messageErreurBase(error) };
  rafraichir();
  return { ok: true, message: "Suivi enregistré : le statut est mis à jour selon les dates réelles." };
}

const schemaFrais = z.object({
  type_frais_id: uuid("Choisissez le type de frais."),
  devise: z.enum(["GNF", "USD"]),
  montant: positif("Montant invalide."),
  date_frais: z.string().regex(schemaDateIso, "Date invalide."),
  prestataire: z.string().trim().max(100),
  reference: z.string().trim().max(60),
});

export async function ajouterFrais(conteneurId: string, _e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("achats");
  const valeurs = valeursFormulaire(fd);
  const lecture = schemaFrais.safeParse(valeurs);
  if (!lecture.success) return { erreurs: erreursZod(lecture.error), valeurs };
  const d = lecture.data;
  // Montants entiers : GNF, ou centimes d'USD (le taux du jour du frais est appliqué par la base).
  const montant = d.devise === "USD" ? Math.round(d.montant * 100) : Math.round(d.montant);
  const supabase = await clientServeur();
  const { error } = await supabase.from("frais_approche").insert({ conteneur_id: conteneurId, ...d, montant });
  if (error) return { message: messageErreurBase(error), valeurs };
  rafraichir();
  return { ok: true, message: "Frais ajouté : le coût de revient est recalculé." };
}

export async function supprimerFrais(id: string, conteneurId: string): Promise<void> {
  await exigerEspace("achats");
  const supabase = await clientServeur();
  const { error } = await supabase.from("frais_approche").delete().eq("id", id);
  if (error) throw new Error(messageErreurBase(error));
  revalidatePath(`/achats/conteneurs/${conteneurId}`);
}

// -----------------------------------------------------------------------------
// Documents joints
// -----------------------------------------------------------------------------
export async function enregistrerDocument(objetType: "bon_commande" | "conteneur", objetId: string, info: { chemin: string; nom: string; taille: number; typeDocumentId: string | null }): Promise<EtatFormulaire> {
  await exigerEspace("achats");
  const supabase = await clientServeur();
  const { error } = await supabase.from("documents").insert({ objet_type: objetType, objet_id: objetId, chemin: info.chemin, nom_fichier: info.nom, taille_octets: info.taille, type_document_id: info.typeDocumentId });
  if (error) return { message: messageErreurBase(error) };
  rafraichir();
  return { ok: true, message: "Document joint." };
}

/** Lien de téléchargement temporaire (5 minutes) d'un document privé. */
export async function lienDocument(chemin: string): Promise<string | null> {
  await exigerEspace("achats");
  const supabase = await clientServeur();
  const { data } = await supabase.storage.from("documents-achats").createSignedUrl(chemin, 300);
  return data?.signedUrl ?? null;
}
