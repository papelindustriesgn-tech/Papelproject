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
import type { Database } from "@/lib/supabase/types";

type TypePiece = Database["public"]["Enums"]["type_piece"];

const uuid = (message: string) => z.string().regex(/^[0-9a-f-]{36}$/i, message);
const uuidOptionnel = z
  .string()
  .optional()
  .transform((t) => (t ? t : null))
  .refine((t) => t === null || /^[0-9a-f-]{36}$/i.test(t), "Sélection invalide.");
const entier = (min: number, message: string) =>
  z
    .string()
    .optional()
    .transform((t) => (t === undefined || t.trim() === "" ? 0 : lireNombre(t)))
    .refine((n): n is number => n !== null && Number.isInteger(n) && n >= min, message);

function rafraichir() {
  revalidatePath("/ventes", "layout");
}

// -----------------------------------------------------------------------------
// Clients
// -----------------------------------------------------------------------------
const schemaClient = z.object({
  nom: z.string().trim().min(1, "Le nom est obligatoire.").max(120),
  type_client_id: uuid("Choisissez le type de client."),
  responsable: z.string().trim().max(100),
  telephone: z.string().trim().max(30),
  adresse: z.string().trim().max(200),
  quartier_id: uuidOptionnel,
  nif: z.string().trim().max(40),
  condition_paiement: z.enum(["comptant", "credit"], { error: "Choisissez la condition de paiement." }),
  delai_paiement_jours: entier(0, "Délai invalide (jours).").refine((n) => n <= 180, "180 jours maximum."),
  plafond_credit_gnf: entier(0, "Plafond invalide (GNF, nombre entier)."),
  commercial_id: uuidOptionnel,
  notes: z.string().trim().max(500),
});

export async function enregistrerClient(id: string | null, _e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("ventes");
  const valeurs = valeursFormulaire(fd);
  const lecture = schemaClient.safeParse(valeurs);
  if (!lecture.success) return { erreurs: erreursZod(lecture.error), valeurs };
  const d = lecture.data;
  if (d.condition_paiement === "comptant") {
    d.delai_paiement_jours = 0;
  }
  const supabase = await clientServeur();
  if (id === null) {
    const { data, error } = await supabase.from("clients").insert(d).select("id").single();
    if (error) return { message: messageErreurBase(error), valeurs };
    rafraichir();
    redirect(`/ventes/clients/${data.id}`);
  }
  const { error } = await supabase.from("clients").update(d).eq("id", id);
  if (error) return { message: messageErreurBase(error), valeurs };
  rafraichir();
  return { ok: true, message: "Client enregistré." };
}

export async function basculerClient(id: string, actif: boolean): Promise<void> {
  await exigerEspace("ventes");
  const supabase = await clientServeur();
  const { error } = await supabase.from("clients").update({ actif }).eq("id", id);
  if (error) throw new Error(messageErreurBase(error));
  rafraichir();
}

// -----------------------------------------------------------------------------
// Pièces de vente
// -----------------------------------------------------------------------------
const schemaNouvellePiece = z.object({
  type_piece: z.enum(["devis", "commande", "facture"], { error: "Type de pièce invalide." }),
  client_id: uuid("Choisissez le client."),
  date_piece: z.string().regex(schemaDateIso, "Date invalide."),
  notes: z.string().trim().max(500),
});

export async function creerPiece(_e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("ventes");
  const valeurs = valeursFormulaire(fd);
  const lecture = schemaNouvellePiece.safeParse(valeurs);
  if (!lecture.success) return { erreurs: erreursZod(lecture.error), valeurs };
  const supabase = await clientServeur();
  const { data: client } = await supabase.from("clients").select("commercial_id").eq("id", lecture.data.client_id).single();
  const { data, error } = await supabase
    .from("pieces_vente")
    .insert({ ...lecture.data, commercial_id: client?.commercial_id ?? null })
    .select("id")
    .single();
  if (error) return { message: messageErreurBase(error), valeurs };
  rafraichir();
  redirect(`/ventes/pieces/${data.id}`);
}

const schemaLigne = z.object({
  conditionnement_id: uuid("Choisissez le produit et le colis."),
  quantite_colis: entier(0, "Nombre de colis invalide."),
  paquets_vrac: entier(0, "Nombre de paquets invalide."),
});

export async function ajouterLigne(pieceId: string, _e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("ventes");
  const valeurs = valeursFormulaire(fd);
  const lecture = schemaLigne.safeParse(valeurs);
  if (!lecture.success) return { erreurs: erreursZod(lecture.error), valeurs };
  const d = lecture.data;
  if (d.quantite_colis + d.paquets_vrac === 0) return { erreurs: { quantite_colis: "Saisissez une quantité." }, valeurs };
  const supabase = await clientServeur();
  // paquets, prix (grille en vigueur selon le type du client) et montant sont calculés par la base.
  const { error } = await supabase.from("lignes_piece").insert({
    piece_id: pieceId,
    conditionnement_id: d.conditionnement_id,
    quantite_colis: d.quantite_colis,
    paquets_vrac: d.paquets_vrac,
    paquets: 1,
    prix_paquet_gnf: null as unknown as number,
    montant_ht_gnf: 0,
  });
  if (error) return { message: messageErreurBase(error), valeurs };
  revalidatePath(`/ventes/pieces/${pieceId}`);
  return { ok: true, message: "Ligne ajoutée." };
}

export async function modifierQuantiteLigne(ligneId: string, pieceId: string, _e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("ventes");
  const lecture = schemaLigne.omit({ conditionnement_id: true }).safeParse(valeursFormulaire(fd));
  if (!lecture.success) return { erreurs: erreursZod(lecture.error) };
  const supabase = await clientServeur();
  if (lecture.data.quantite_colis + lecture.data.paquets_vrac === 0) {
    const { error } = await supabase.from("lignes_piece").delete().eq("id", ligneId);
    if (error) return { message: messageErreurBase(error) };
  } else {
    const { error } = await supabase.from("lignes_piece").update(lecture.data).eq("id", ligneId);
    if (error) return { message: messageErreurBase(error) };
  }
  revalidatePath(`/ventes/pieces/${pieceId}`);
  return { ok: true };
}

export async function supprimerLigne(ligneId: string, pieceId: string): Promise<void> {
  await exigerEspace("ventes");
  const supabase = await clientServeur();
  const { error } = await supabase.from("lignes_piece").delete().eq("id", ligneId);
  if (error) throw new Error(messageErreurBase(error));
  revalidatePath(`/ventes/pieces/${pieceId}`);
}

export async function validerPiece(pieceId: string, typePiece: TypePiece, _e: EtatFormulaire): Promise<EtatFormulaire> {
  await exigerEspace("ventes");
  const supabase = await clientServeur();
  const { data, error } =
    typePiece === "avoir"
      ? await supabase.rpc("valider_avoir", { p_avoir: pieceId, p_retour_stock: true })
      : await supabase.rpc("valider_piece", { p_piece: pieceId });
  if (error) return { message: messageErreurBase(error) };
  rafraichir();
  redirect(avecSucces(`/ventes/pieces/${pieceId}`, `Pièce ${data} validée.`));
}

export async function transformerPiece(pieceId: string, versType: TypePiece): Promise<void> {
  await exigerEspace("ventes");
  const supabase = await clientServeur();
  const { data, error } = await supabase.rpc("transformer_piece", { p_piece: pieceId, p_type: versType });
  if (error) throw new Error(messageErreurBase(error));
  rafraichir();
  redirect(`/ventes/pieces/${data}`);
}

export async function annulerPiece(pieceId: string): Promise<void> {
  await exigerEspace("ventes");
  const supabase = await clientServeur();
  const { error } = await supabase.rpc("annuler_piece", { p_piece: pieceId });
  if (error) throw new Error(messageErreurBase(error));
  rafraichir();
}

export async function supprimerBrouillon(pieceId: string): Promise<void> {
  await exigerEspace("ventes");
  const supabase = await clientServeur();
  const { error } = await supabase.from("pieces_vente").delete().eq("id", pieceId);
  if (error) throw new Error(messageErreurBase(error));
  rafraichir();
  redirect("/ventes/pieces");
}

// -----------------------------------------------------------------------------
// Livraisons
// -----------------------------------------------------------------------------
export async function preparerLivraison(commandeId: string): Promise<void> {
  await exigerEspace("ventes");
  const supabase = await clientServeur();
  const { data, error } = await supabase.rpc("preparer_livraison", { p_commande: commandeId });
  if (error) throw new Error(messageErreurBase(error));
  rafraichir();
  redirect(`/ventes/livraisons/${data}`);
}

export async function modifierLigneLivraison(ligneId: string, livraisonId: string, _e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("ventes");
  const n = lireNombre(String(fd.get("paquets") ?? ""));
  if (n === null || !Number.isInteger(n) || n < 0) return { erreurs: { paquets: "Nombre de paquets invalide." } };
  const supabase = await clientServeur();
  const { error } = n === 0 ? await supabase.from("lignes_livraison").delete().eq("id", ligneId) : await supabase.from("lignes_livraison").update({ paquets: n }).eq("id", ligneId);
  if (error) return { message: messageErreurBase(error) };
  revalidatePath(`/ventes/livraisons/${livraisonId}`);
  return { ok: true, message: "Quantité enregistrée." };
}

export async function validerLivraison(livraisonId: string, _e: EtatFormulaire): Promise<EtatFormulaire> {
  await exigerEspace("ventes");
  const supabase = await clientServeur();
  const { data, error } = await supabase.rpc("valider_livraison", { p_livraison: livraisonId });
  if (error) return { message: messageErreurBase(error) };
  rafraichir();
  revalidatePath("/magasin", "layout");
  redirect(avecSucces(`/ventes/livraisons/${livraisonId}`, `Bon de livraison ${data} validé : le stock est à jour.`));
}

// -----------------------------------------------------------------------------
// Paiements, dotations, relances
// -----------------------------------------------------------------------------
const schemaPaiement = z.object({
  montant_gnf: entier(1, "Montant invalide (GNF, nombre entier)."),
  mode_id: uuid("Choisissez le mode de paiement."),
  date_paiement: z.string().regex(schemaDateIso, "Date invalide."),
  reference: z.string().trim().max(100),
});

export async function enregistrerPaiement(factureId: string, _e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("ventes");
  const valeurs = valeursFormulaire(fd);
  const lecture = schemaPaiement.safeParse(valeurs);
  if (!lecture.success) return { erreurs: erreursZod(lecture.error), valeurs };
  const d = lecture.data;
  const supabase = await clientServeur();
  const { error } = await supabase.rpc("enregistrer_paiement", {
    p_facture: factureId,
    p_montant: d.montant_gnf,
    p_mode: d.mode_id,
    p_date: d.date_paiement,
    p_reference: d.reference,
  });
  if (error) return { message: messageErreurBase(error), valeurs };
  rafraichir();
  return { ok: true, message: "Paiement enregistré. La dotation éventuelle est recalculée." };
}

export async function remettreDotation(dotationId: string, _e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("ventes");
  const valeurs = valeursFormulaire(fd);
  const conditionnement = String(fd.get("conditionnement_id") ?? "");
  const n = lireNombre(String(fd.get("paquets") ?? ""));
  if (!/^[0-9a-f-]{36}$/i.test(conditionnement)) return { erreurs: { conditionnement_id: "Choisissez le colis." }, valeurs };
  if (n === null || !Number.isInteger(n) || n <= 0) return { erreurs: { paquets: "Nombre de paquets invalide." }, valeurs };
  const supabase = await clientServeur();
  const { error } = await supabase.rpc("remettre_dotation", { p_dotation: dotationId, p_conditionnement: conditionnement, p_paquets: n });
  if (error) return { message: messageErreurBase(error), valeurs };
  rafraichir();
  return { ok: true, message: `${n} paquets de dotation remis : sortie de stock enregistrée.` };
}

const schemaRelance = z.object({
  canal: z.enum(["telephone", "visite", "sms", "whatsapp", "courrier", "email"], { error: "Choisissez le canal." }),
  note: z.string().trim().max(500),
  promesse_date: z
    .string()
    .optional()
    .transform((t) => (t ? t : null))
    .refine((t) => t === null || schemaDateIso.test(t), "Date invalide."),
});

export async function enregistrerRelance(factureId: string, _e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("ventes");
  const valeurs = valeursFormulaire(fd);
  const lecture = schemaRelance.safeParse(valeurs);
  if (!lecture.success) return { erreurs: erreursZod(lecture.error), valeurs };
  const supabase = await clientServeur();
  const { error } = await supabase.from("relances").insert({ facture_id: factureId, ...lecture.data });
  if (error) return { message: messageErreurBase(error), valeurs };
  rafraichir();
  return { ok: true, message: "Relance enregistrée." };
}
