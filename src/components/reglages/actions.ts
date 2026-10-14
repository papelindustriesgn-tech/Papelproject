"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigerConnexion } from "@/lib/auth/session";
import { erreursZod, messageErreurBase, valeursFormulaire, type EtatFormulaire } from "@/lib/formulaires/etat";
import { lireNombre } from "@/lib/formulaires/nombres";
import { INDICATEURS } from "@/lib/navigation/indicateurs";
import { clientServeur } from "@/lib/supabase/serveur";
import type { Json } from "@/lib/supabase/types";

// Les droits sont appliqués par la base (RLS : peut_regler_espace) ; ici on valide la saisie.

const ESPACE = z.string().regex(/^[a-z]+$/);

function rafraichir(espace: string) {
  revalidatePath(`/${espace}`);
  revalidatePath(`/${espace}/reglages`);
}

export async function enregistrerPromesse(espace: string, _e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerConnexion();
  const promesse = String(fd.get("promesse") ?? "").trim();
  if (!ESPACE.safeParse(espace).success) return { message: "Application inconnue." };
  if (promesse.length > 300) return { erreurs: { promesse: "300 caractères au maximum." }, valeurs: valeursFormulaire(fd) };
  const supabase = await clientServeur();
  const { data, error } = await supabase.from("accueil_espaces").upsert({ espace, promesse }).select("espace");
  if (error) return { message: messageErreurBase(error) };
  if (!data?.length) return { message: "Vous n'avez pas les droits pour régler cette application." };
  rafraichir(espace);
  return { ok: true, message: "Enregistré." };
}

const schemaElement = z
  .object({
    genre: z.enum(["action", "etape", "tache"]),
    libelle: z.string().trim().min(1, "Écrivez un libellé.").max(80, "80 caractères au maximum."),
    description: z.string().trim().max(120, "120 caractères au maximum.").default(""),
    ecran: z
      .string()
      .trim()
      .regex(/^\/[a-z0-9/_?=&.-]*$/, "Choisissez un écran."),
    icone: z.string().trim().max(30).default(""),
    indicateur: z.string().trim().default(""),
    urgent: z.boolean(),
    seuil: z.number({ error: "Saisissez un nombre entier." }).int("Saisissez un nombre entier.").min(1, "Au moins 1."),
    ordre: z.number({ error: "Saisissez un nombre entier." }).int("Saisissez un nombre entier."),
    actif: z.boolean(),
  })
  .refine((v) => v.genre !== "tache" || INDICATEURS.some((i) => i.code === v.indicateur), { message: "Choisissez ce qu'il faut compter.", path: ["indicateur"] });

/** Ajoute (id absent) ou modifie un bouton, une étape ou une ligne « À faire ». */
export async function enregistrerElement(espace: string, id: string | null, _e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerConnexion();
  if (!ESPACE.safeParse(espace).success) return { message: "Application inconnue." };
  const r = schemaElement.safeParse({
    genre: fd.get("genre"),
    libelle: fd.get("libelle") ?? "",
    description: fd.get("description") ?? "",
    ecran: fd.get("ecran") ?? "",
    icone: fd.get("icone") ?? "",
    indicateur: fd.get("indicateur") ?? "",
    urgent: fd.get("urgent") === "on",
    seuil: lireNombre(String(fd.get("seuil") ?? "1")) ?? Number.NaN,
    ordre: lireNombre(String(fd.get("ordre") ?? "0")) ?? Number.NaN,
    actif: id ? fd.get("actif") === "on" : true,
  });
  if (!r.success) return { erreurs: erreursZod(r.error), valeurs: valeursFormulaire(fd) };
  const v = { ...r.data, espace, indicateur: r.data.genre === "tache" ? r.data.indicateur : null };
  const supabase = await clientServeur();
  const { data, error } = id ? await supabase.from("accueil_elements").update(v).eq("id", id).select("id") : await supabase.from("accueil_elements").insert(v).select("id");
  if (error) return { message: messageErreurBase(error), valeurs: valeursFormulaire(fd) };
  if (!data?.length) return { message: "Vous n'avez pas les droits pour régler cette application." };
  rafraichir(espace);
  return { ok: true, message: id ? "Enregistré." : "Ajouté." };
}

export async function supprimerElement(espace: string, id: string): Promise<EtatFormulaire> {
  await exigerConnexion();
  const supabase = await clientServeur();
  const { data, error } = await supabase.from("accueil_elements").delete().eq("id", id).eq("espace", espace).select("id");
  if (error) return { message: messageErreurBase(error) };
  if (!data?.length) return { message: "Vous n'avez pas les droits pour régler cette application." };
  rafraichir(espace);
  return { ok: true, message: "Supprimé." };
}

/** Convertit la saisie selon le type du paramètre ; renvoie un message d'erreur en français si invalide. */
function convertir(type: string, brut: FormDataEntryValue | null): { valeur: NonNullable<Json> } | { erreur: string } {
  const texte = typeof brut === "string" ? brut.trim() : "";
  switch (type) {
    case "booleen":
      return { valeur: texte === "on" || texte === "true" };
    case "texte":
      return texte.length > 300 ? { erreur: "Texte trop long (300 caractères maximum)." } : { valeur: texte };
    case "liste":
      return { valeur: texte.split(",").map((s) => s.trim()).filter(Boolean) };
    case "pourcentage": {
      const n = lireNombre(texte);
      if (n === null || n < 0 || n > 100) return { erreur: "Saisissez un pourcentage entre 0 et 100." };
      return { valeur: Math.round(n * 100) / 10000 }; // 5 → 0,05
    }
    case "entier": {
      const n = lireNombre(texte);
      if (n === null || !Number.isInteger(n) || n < 0) return { erreur: "Saisissez un nombre entier positif." };
      return { valeur: n };
    }
    default: {
      const n = lireNombre(texte);
      if (n === null || n < 0) return { erreur: "Saisissez un nombre positif." };
      return { valeur: n };
    }
  }
}

/** Modifie un paramètre : l'administrateur, la Direction ou le service à qui appartient la catégorie (RLS). */
export async function modifierParametre(cle: string, _e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerConnexion();
  const supabase = await clientServeur();
  const { data: p } = await supabase.from("parametres").select("type_valeur").eq("cle", cle).maybeSingle();
  if (!p) return { message: "Paramètre introuvable." };

  const r = convertir(p.type_valeur, fd.get("valeur"));
  if ("erreur" in r) return { erreurs: { valeur: r.erreur } };

  const { data, error } = await supabase.from("parametres").update({ valeur: r.valeur }).eq("cle", cle).select("cle");
  if (error) return { message: messageErreurBase(error) };
  if (!data?.length) return { message: "Vous n'avez pas les droits pour modifier ce paramètre." };
  // Un seuil peut servir partout (alertes, tableaux de bord) : on rafraîchit toute l'application.
  revalidatePath("/", "layout");
  return { ok: true, message: "Enregistré." };
}
