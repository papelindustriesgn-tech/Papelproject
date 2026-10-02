"use server";

import { revalidatePath } from "next/cache";
import { exigerEspace } from "@/lib/auth/session";
import { messageErreurBase, type EtatFormulaire } from "@/lib/formulaires/etat";
import { lireNombre } from "@/lib/formulaires/nombres";
import { clientServeur } from "@/lib/supabase/serveur";
import type { Json } from "@/lib/supabase/types";

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

export async function modifierParametre(cle: string, _e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("admin");
  const supabase = await clientServeur();
  const { data: p } = await supabase.from("parametres").select("type_valeur").eq("cle", cle).maybeSingle();
  if (!p) return { message: "Paramètre introuvable." };

  const r = convertir(p.type_valeur, fd.get("valeur"));
  if ("erreur" in r) return { erreurs: { valeur: r.erreur } };

  const { data, error } = await supabase.from("parametres").update({ valeur: r.valeur }).eq("cle", cle).select("cle");
  if (error) return { message: messageErreurBase(error) };
  if (!data?.length) return { message: "Vous n'avez pas les droits pour modifier ce paramètre." };
  revalidatePath("/admin/parametres");
  return { ok: true, message: "Enregistré." };
}
