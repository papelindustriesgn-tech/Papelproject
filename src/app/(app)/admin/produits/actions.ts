"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigerEspace } from "@/lib/auth/session";
import { schemaDateIso } from "@/lib/formulaires/dates";
import { erreursZod, messageErreurBase, valeursFormulaire, type EtatFormulaire } from "@/lib/formulaires/etat";
import { lireNombre } from "@/lib/formulaires/nombres";
import { clientServeur } from "@/lib/supabase/serveur";

/** Nombre saisi en français, avec bornes et message d'erreur. */
const nombre = (min: number, max: number, message: string, entier = false) =>
  z
    .string()
    .transform((t) => lireNombre(t))
    .refine((n): n is number => n !== null && n >= min && n <= max && (!entier || Number.isInteger(n)), message);

const schemaProduit = z.object({
  libelle: z.string().trim().min(1, "Le libellé est obligatoire.").max(60),
  nb_mouchoirs: nombre(1, 1000, "Nombre de mouchoirs invalide.", true),
  plis: nombre(1, 6, "Nombre de plis entre 1 et 6.", true),
  longueur_mm: nombre(10, 1000, "Longueur invalide (mm)."),
  largeur_mm: nombre(10, 1000, "Largeur invalide (mm)."),
  grammage_g_m2_pli: nombre(1, 100, "Grammage invalide (g/m²)."),
  taux_perte_pct: nombre(0, 50, "Taux de perte entre 0 et 50 %."),
});

export async function modifierProduit(produitId: string, _e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("admin");
  const valeurs = valeursFormulaire(fd);
  const lecture = schemaProduit.safeParse(valeurs);
  if (!lecture.success) return { erreurs: erreursZod(lecture.error), valeurs };
  const { taux_perte_pct, ...reste } = lecture.data;
  const supabase = await clientServeur();
  const { data, error } = await supabase
    .from("produits")
    .update({ ...reste, taux_perte_ref: Math.round(taux_perte_pct * 100) / 10000 })
    .eq("id", produitId)
    .select("rendement_theorique_paquets_t")
    .maybeSingle();
  if (error) return { message: messageErreurBase(error), valeurs };
  if (!data) return { message: "Vous n'avez pas les droits pour modifier ce produit.", valeurs };
  revalidatePath("/admin/produits");
  return { ok: true, message: `Enregistré. Nouveau rendement théorique : ${data.rendement_theorique_paquets_t} paquets/t.` };
}

const schemaConditionnement = z.object({
  paquets_par_colis: nombre(1, 10000, "Nombre de paquets par colis invalide.", true),
});

export async function ajouterConditionnement(produitId: string, _e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("admin");
  const valeurs = valeursFormulaire(fd);
  const lecture = schemaConditionnement.safeParse(valeurs);
  if (!lecture.success) return { erreurs: erreursZod(lecture.error), valeurs };
  const n = lecture.data.paquets_par_colis;
  const supabase = await clientServeur();
  const { error } = await supabase.from("conditionnements").insert({ produit_id: produitId, paquets_par_colis: n, libelle: `Colis de ${n}` });
  if (error) return { message: error.code === "23505" ? "Ce conditionnement existe déjà." : messageErreurBase(error), valeurs };
  revalidatePath("/admin/produits");
  return { ok: true, message: `Conditionnement « Colis de ${n} » ajouté.` };
}

export async function basculerConditionnement(conditionnementId: string, actif: boolean): Promise<void> {
  await exigerEspace("admin");
  const supabase = await clientServeur();
  const { error } = await supabase.from("conditionnements").update({ actif }).eq("id", conditionnementId).eq("par_defaut", false);
  if (error) throw new Error(messageErreurBase(error));
  revalidatePath("/admin/produits");
}

const schemaPrix = z.object({
  niveau: z.string().min(1, "Choisissez un niveau de prix."),
  prix_paquet_gnf: nombre(1, 100_000_000, "Saisissez un prix entier en GNF.", true),
  date_debut: z.string().regex(schemaDateIso, "Date invalide."),
  note: z.string().trim().max(200),
});

export async function definirPrix(produitId: string, _e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("admin");
  const valeurs = valeursFormulaire(fd);
  const lecture = schemaPrix.safeParse(valeurs);
  if (!lecture.success) return { erreurs: erreursZod(lecture.error), valeurs };
  const d = lecture.data;
  const supabase = await clientServeur();
  const { error } = await supabase.rpc("definir_prix", {
    p_produit: produitId,
    p_niveau: d.niveau,
    p_prix_paquet_gnf: d.prix_paquet_gnf,
    p_date_debut: d.date_debut,
    p_note: d.note || undefined,
  });
  if (error) return { message: messageErreurBase(error), valeurs };
  revalidatePath("/admin/produits");
  return { ok: true, message: "Nouveau prix enregistré ; l'ancien est conservé dans l'historique." };
}

const schemaNouveauProduit = schemaProduit.extend({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_-]{2,20}$/, "Code : 2 à 20 caractères (lettres sans accent, chiffres, - ou _)."),
  paquets_par_colis: nombre(1, 10000, "Nombre de paquets par colis invalide.", true),
  prix_paquet_gnf: z
    .string()
    .transform((t) => (t.trim() === "" ? null : lireNombre(t)))
    .refine((n) => n === null || (Number.isInteger(n) && n > 0), "Prix entier en GNF, ou laisser vide."),
});

export async function creerProduit(_e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("admin");
  const valeurs = valeursFormulaire(fd);
  const lecture = schemaNouveauProduit.safeParse(valeurs);
  if (!lecture.success) return { erreurs: erreursZod(lecture.error), valeurs };
  const d = lecture.data;
  const supabase = await clientServeur();
  const { error } = await supabase.rpc("creer_produit", {
    p_code: d.code,
    p_libelle: d.libelle,
    p_nb_mouchoirs: d.nb_mouchoirs,
    p_plis: d.plis,
    p_longueur_mm: d.longueur_mm,
    p_largeur_mm: d.largeur_mm,
    p_grammage: d.grammage_g_m2_pli,
    p_taux_perte: Math.round(d.taux_perte_pct * 100) / 10000,
    p_paquets_par_colis: d.paquets_par_colis,
    p_prix_paquet_gnf: d.prix_paquet_gnf ?? undefined,
  });
  if (error) return { message: error.code === "23505" ? "Ce code produit existe déjà." : messageErreurBase(error), valeurs };
  revalidatePath("/admin/produits");
  return { ok: true, message: `Produit « ${d.libelle} » créé.` };
}

/** Archive ou réactive un produit (jamais de suppression : l'historique doit rester lisible). */
export async function basculerProduit(produitId: string, actif: boolean): Promise<void> {
  await exigerEspace("admin");
  const supabase = await clientServeur();
  const { error } = await supabase.from("produits").update({ actif }).eq("id", produitId);
  if (error) throw new Error(messageErreurBase(error));
  revalidatePath("/admin/produits");
}
