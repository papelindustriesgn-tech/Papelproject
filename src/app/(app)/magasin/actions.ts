"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { exigerEspace } from "@/lib/auth/session";
import { schemaDateIso } from "@/lib/formulaires/dates";
import { erreursZod, messageErreurBase, valeursFormulaire, type EtatFormulaire } from "@/lib/formulaires/etat";
import { lireNombre } from "@/lib/formulaires/nombres";
import { TYPES_MOUVEMENT } from "@/lib/stocks/libelles";
import { clientServeur } from "@/lib/supabase/serveur";
import type { Database } from "@/lib/supabase/types";

type Famille = Database["public"]["Enums"]["famille_article"];
type Unite = Database["public"]["Enums"]["unite_stock"];
type TypeMouvement = Database["public"]["Enums"]["type_mouvement"];

/** Nombre positif saisi à la française (« 1 250,5 »). */
const positif = (message: string) =>
  z
    .string()
    .transform((t) => lireNombre(t))
    .refine((n): n is number => n !== null && n > 0, message);
const optionnelPositif = (message: string) =>
  z
    .string()
    .optional()
    .transform((t) => (t === undefined || t.trim() === "" ? null : lireNombre(t)))
    .refine((n) => n === null || n > 0, message);
const uuidOptionnel = z
  .string()
  .optional()
  .transform((t) => (t ? t : null))
  .refine((t) => t === null || /^[0-9a-f-]{36}$/i.test(t), "Sélection invalide.");

function rafraichir() {
  revalidatePath("/magasin", "layout");
}

// -----------------------------------------------------------------------------
// Articles
// -----------------------------------------------------------------------------
const schemaArticle = z.object({
  libelle: z.string().trim().min(1, "Le libellé est obligatoire.").max(100),
  categorie_id: uuidOptionnel,
  seuil_alerte: z
    .string()
    .transform((t) => (t.trim() === "" ? 0 : lireNombre(t)))
    .refine((n): n is number => n !== null && n >= 0, "Seuil invalide."),
  notes: z.string().trim().max(500),
});

const schemaNouvelArticle = schemaArticle.extend({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_.-]{2,30}$/, "Code : 2 à 30 caractères (lettres sans accent, chiffres, . - _)."),
  famille: z.enum(["matiere_premiere", "emballage", "piece_detachee", "autre"], { error: "Choisissez une famille (les produits finis sont créés depuis les produits)." }),
  unite: z.enum(["kg", "unite", "rouleau", "litre", "metre"], { error: "Choisissez une unité." }),
  suivi_par_lot: z.string().optional().transform((v) => v === "on"),
});

export async function creerArticle(_e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("magasin");
  const valeurs = valeursFormulaire(fd);
  const lecture = schemaNouvelArticle.safeParse(valeurs);
  if (!lecture.success) return { erreurs: erreursZod(lecture.error), valeurs };
  const d = lecture.data;
  if (d.suivi_par_lot && d.unite !== "kg") return { erreurs: { suivi_par_lot: "Le suivi par lot (bobines) exige l'unité kg." }, valeurs };
  const supabase = await clientServeur();
  const { data, error } = await supabase
    .from("articles")
    .insert({ ...d, famille: d.famille as Famille, unite: d.unite as Unite })
    .select("id")
    .single();
  if (error) return { message: error.code === "23505" ? "Ce code article existe déjà." : messageErreurBase(error), valeurs };
  rafraichir();
  redirect(`/magasin/articles/${data.id}`);
}

export async function modifierArticle(id: string, _e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("magasin");
  const valeurs = valeursFormulaire(fd);
  const lecture = schemaArticle.safeParse(valeurs);
  if (!lecture.success) return { erreurs: erreursZod(lecture.error), valeurs };
  const supabase = await clientServeur();
  const { data, error } = await supabase.from("articles").update(lecture.data).eq("id", id).select("id");
  if (error) return { message: messageErreurBase(error), valeurs };
  if (!data?.length) return { message: "Vous n'avez pas les droits pour modifier cet article.", valeurs };
  rafraichir();
  return { ok: true, message: "Article enregistré." };
}

export async function basculerArticle(id: string, actif: boolean): Promise<void> {
  await exigerEspace("magasin");
  const supabase = await clientServeur();
  const { error } = await supabase.from("articles").update({ actif }).eq("id", id);
  if (error) throw new Error(messageErreurBase(error));
  rafraichir();
}

// -----------------------------------------------------------------------------
// Mouvements
// -----------------------------------------------------------------------------
const schemaMouvement = z.object({
  type: z.string().refine((t) => TYPES_MOUVEMENT[t]?.saisieManuelle, "Choisissez un type de mouvement."),
  sens: z.enum(["entree", "sortie"]).optional(),
  article_id: z.string().regex(/^[0-9a-f-]{36}$/i, "Choisissez un article."),
  lot_id: uuidOptionnel,
  quantite: positif("Saisissez une quantité supérieure à zéro."),
  cout_unitaire_gnf: optionnelPositif("Coût unitaire invalide."),
  date_operation: z.string().regex(schemaDateIso, "Date invalide."),
  motif: z.string().trim().max(300),
});

export async function enregistrerMouvement(_e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("magasin");
  const valeurs = valeursFormulaire(fd);
  const lecture = schemaMouvement.safeParse(valeurs);
  if (!lecture.success) return { erreurs: erreursZod(lecture.error), valeurs };
  const d = lecture.data;
  const def = TYPES_MOUVEMENT[d.type];
  if (def.sens === 0 && !d.sens) return { erreurs: { sens: "Précisez s'il s'agit d'une entrée ou d'une sortie." }, valeurs };
  const signe = def.sens !== 0 ? def.sens : d.sens === "entree" ? 1 : -1;
  if (["ajustement", "sortie", "rebut"].includes(d.type) && !d.motif) return { erreurs: { motif: "Le motif est obligatoire pour ce type de mouvement." }, valeurs };

  const supabase = await clientServeur();
  const { error } = await supabase.from("mouvements_stock").insert({
    type: d.type as TypeMouvement,
    article_id: d.article_id,
    lot_id: d.lot_id,
    quantite: signe * d.quantite,
    // L'unité est imposée par la base (celle de l'article) ; valeur provisoire écrasée par le trigger.
    unite: "kg",
    cout_unitaire_gnf: signe > 0 ? d.cout_unitaire_gnf : null,
    date_operation: d.date_operation,
    motif: d.motif,
  });
  if (error) return { message: messageErreurBase(error), valeurs };
  rafraichir();
  return { ok: true, message: `${def.libelle} enregistrée. Le stock est à jour.` };
}

// -----------------------------------------------------------------------------
// Bobines (lots)
// -----------------------------------------------------------------------------
const schemaBobine = z.object({
  article_id: z.string().regex(/^[0-9a-f-]{36}$/i, "Choisissez l'article."),
  numero_lot: z.string().trim().min(1, "Le n° de lot est obligatoire.").max(50),
  fournisseur_id: uuidOptionnel,
  date_reception: z.string().regex(schemaDateIso, "Date invalide."),
  poids_net_kg: positif("Poids net invalide."),
  cout_kg_gnf: optionnelPositif("Coût invalide."),
  grammage_g_m2: optionnelPositif("Grammage invalide."),
  largeur_mm: optionnelPositif("Largeur invalide."),
  diametre_mm: optionnelPositif("Diamètre invalide."),
  plis: optionnelPositif("Nombre de plis invalide.").refine((n) => n === null || (Number.isInteger(n) && n <= 6), "Plis : entier de 1 à 6."),
  notes: z.string().trim().max(300),
});

export async function receptionnerBobine(_e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("magasin");
  const valeurs = valeursFormulaire(fd);
  const lecture = schemaBobine.safeParse(valeurs);
  if (!lecture.success) return { erreurs: erreursZod(lecture.error), valeurs };
  const d = lecture.data;
  const supabase = await clientServeur();
  const { error } = await supabase.rpc("receptionner_bobine", {
    p_article: d.article_id,
    p_numero_lot: d.numero_lot,
    p_poids_kg: d.poids_net_kg,
    p_cout_kg_gnf: d.cout_kg_gnf ?? 0,
    p_fournisseur: d.fournisseur_id ?? undefined,
    p_date: d.date_reception,
    p_grammage: d.grammage_g_m2 ?? undefined,
    p_largeur_mm: d.largeur_mm ?? undefined,
    p_diametre_mm: d.diametre_mm ?? undefined,
    p_plis: d.plis ?? undefined,
    p_notes: d.notes,
  });
  if (error) return { message: error.code === "23505" ? "Ce n° de lot existe déjà pour cet article." : messageErreurBase(error), valeurs };
  rafraichir();
  return { ok: true, message: `Bobine ${d.numero_lot} réceptionnée (${d.poids_net_kg} kg).` };
}

export async function changerStatutLot(id: string, statut: "disponible" | "bloque"): Promise<void> {
  await exigerEspace("magasin");
  const supabase = await clientServeur();
  const { error } = await supabase.from("lots").update({ statut }).eq("id", id);
  if (error) throw new Error(messageErreurBase(error));
  rafraichir();
}

// -----------------------------------------------------------------------------
// Inventaires
// -----------------------------------------------------------------------------
export async function ouvrirInventaire(_e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("magasin");
  const libelle = String(fd.get("libelle") ?? "").trim();
  const famille = String(fd.get("famille") ?? "");
  if (!libelle) return { erreurs: { libelle: "Donnez un nom à l'inventaire (ex. Inventaire mensuel octobre)." } };
  const supabase = await clientServeur();
  const { data, error } = await supabase.rpc("ouvrir_inventaire", {
    p_libelle: libelle,
    p_famille: (famille || undefined) as Famille | undefined,
  });
  if (error) return { message: messageErreurBase(error) };
  rafraichir();
  redirect(`/magasin/inventaires/${data}`);
}

export async function enregistrerComptages(inventaireId: string, _e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("magasin");
  const supabase = await clientServeur();
  const erreurs: Record<string, string> = {};
  const majs: { id: string; quantite_comptee: number | null }[] = [];
  for (const [cle, brut] of fd.entries()) {
    if (!cle.startsWith("compte_") || typeof brut !== "string") continue;
    const id = cle.slice(7);
    if (brut.trim() === "") {
      majs.push({ id, quantite_comptee: null });
      continue;
    }
    const n = lireNombre(brut);
    if (n === null || n < 0) erreurs[cle] = "Quantité invalide.";
    else majs.push({ id, quantite_comptee: n });
  }
  if (Object.keys(erreurs).length) return { erreurs, valeurs: valeursFormulaire(fd), message: "Certaines quantités sont invalides." };
  for (const m of majs) {
    const { error } = await supabase.from("inventaire_lignes").update({ quantite_comptee: m.quantite_comptee }).eq("id", m.id).eq("inventaire_id", inventaireId);
    if (error) return { message: messageErreurBase(error), valeurs: valeursFormulaire(fd) };
  }
  revalidatePath(`/magasin/inventaires/${inventaireId}`);
  return { ok: true, message: "Comptages enregistrés." };
}

export async function validerInventaire(inventaireId: string, _e: EtatFormulaire): Promise<EtatFormulaire> {
  await exigerEspace("magasin");
  const supabase = await clientServeur();
  const { data, error } = await supabase.rpc("valider_inventaire", { p_inventaire: inventaireId });
  if (error) return { message: messageErreurBase(error) };
  rafraichir();
  return { ok: true, message: `Inventaire validé : ${data} écart(s) passé(s) en stock.` };
}
