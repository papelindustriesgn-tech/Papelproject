"use server";

import { revalidatePath } from "next/cache";
import { exigerEspace } from "@/lib/auth/session";
import { messageErreurBase, valeursFormulaire, type EtatFormulaire } from "@/lib/formulaires/etat";
import { lireNombre } from "@/lib/formulaires/nombres";
import { clientServeur } from "@/lib/supabase/serveur";
import { OBJECTIFS, versStockage } from "./catalogue";

/**
 * Enregistre les objectifs mensuels d'un service pour une année : un champ par (indicateur × mois), nommé
 * `o|<indicateur>|<AAAA-MM>`. Une case vidée supprime l'objectif du mois. Réservé à la Direction et à l'administrateur (RLS).
 */
export async function enregistrerObjectifs(espace: string, annee: number, _etat: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  const u = await exigerEspace(espace);
  if (!u.roles.includes("direction") && !u.roles.includes("admin")) return { message: "Seuls la Direction et l'administrateur fixent les objectifs." };
  const definitions = OBJECTIFS[espace];
  if (!definitions || !Number.isInteger(annee)) return { message: "Service inconnu." };

  const aEnregistrer: { espace: string; indicateur: string; mois: string; valeur: number }[] = [];
  const aSupprimer: { indicateur: string; mois: string }[] = [];
  const erreurs: Record<string, string> = {};
  for (const d of definitions)
    for (let m = 1; m <= 12; m++) {
      const mois = `${annee}-${String(m).padStart(2, "0")}`;
      const nom = `o|${d.code}|${mois}`;
      const brut = String(fd.get(nom) ?? "").trim();
      if (brut === "") {
        aSupprimer.push({ indicateur: d.code, mois: `${mois}-01` });
        continue;
      }
      const n = lireNombre(brut);
      if (n === null || n < 0) erreurs[nom] = "Nombre positif attendu";
      else aEnregistrer.push({ espace, indicateur: d.code, mois: `${mois}-01`, valeur: versStockage(n, d.unite) });
    }
  if (Object.keys(erreurs).length)
    return { message: `${Object.keys(erreurs).length} case(s) mal remplie(s) : écrivez un nombre (ex. 25 ou 95,5).`, erreurs, valeurs: valeursFormulaire(fd) };

  const supabase = await clientServeur();
  if (aEnregistrer.length) {
    const { error } = await supabase.from("objectifs_services").upsert(aEnregistrer, { onConflict: "espace,indicateur,mois" });
    if (error) return { message: messageErreurBase(error), valeurs: valeursFormulaire(fd) };
  }
  for (const d of definitions) {
    const mois = aSupprimer.filter((x) => x.indicateur === d.code).map((x) => x.mois);
    if (!mois.length) continue;
    const { error } = await supabase.from("objectifs_services").delete().eq("espace", espace).eq("indicateur", d.code).in("mois", mois);
    if (error) return { message: messageErreurBase(error), valeurs: valeursFormulaire(fd) };
  }
  revalidatePath(`/${espace}`, "layout");
  return { ok: true, message: `Objectifs ${annee} enregistrés.` };
}
