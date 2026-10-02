"use server";

import { revalidatePath } from "next/cache";
import { exigerEspace } from "@/lib/auth/session";
import { schemaDateIso } from "@/lib/formulaires/dates";
import { messageErreurBase, type EtatFormulaire } from "@/lib/formulaires/etat";
import { lireNombre } from "@/lib/formulaires/nombres";
import { clientServeur } from "@/lib/supabase/serveur";

const estUuid = (v: string) => /^[0-9a-f-]{36}$/i.test(v);

/** Objectifs du mois d'un commercial (visites, nouveaux PVA, CA HT, colis). */
export async function enregistrerObjectifs(commercialId: string, mois: string, _e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("commercial");
  if (!estUuid(commercialId) || !/^\d{4}-\d{2}-01$/.test(mois)) return { message: "Données invalides." };
  const valeurs: Record<string, number> = {};
  const erreurs: Record<string, string> = {};
  for (const champ of ["visites", "nouveaux_pva", "ca_ht_gnf", "colis"]) {
    const n = lireNombre(String(fd.get(champ) ?? "0") || "0");
    if (n === null || n < 0 || !Number.isInteger(n)) erreurs[champ] = "Nombre entier positif.";
    else valeurs[champ] = n;
  }
  if (Object.keys(erreurs).length) return { erreurs };
  const supabase = await clientServeur();
  const { error } = await supabase.from("objectifs_commerciaux").upsert({ commercial_id: commercialId, mois, ...valeurs }, { onConflict: "commercial_id,mois" });
  if (error) return { message: messageErreurBase(error) };
  revalidatePath("/commercial", "layout");
  return { ok: true, message: "Objectifs enregistrés." };
}

/** Tournée d'un commercial pour un jour : liste ordonnée de PVA (remplace la précédente). */
export async function enregistrerTournee(_e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("commercial");
  const commercialId = String(fd.get("commercial_id") ?? "");
  const date = String(fd.get("date_tournee") ?? "");
  const pva = fd.getAll("pva").map(String).filter(estUuid);
  if (!estUuid(commercialId)) return { erreurs: { commercial_id: "Choisissez le commercial." } };
  if (!schemaDateIso.test(date)) return { erreurs: { date_tournee: "Date invalide." } };
  if (!pva.length) return { erreurs: { pva: "Cochez au moins un point de vente." } };
  const supabase = await clientServeur();
  const { data: t, error } = await supabase.from("tournees").upsert({ commercial_id: commercialId, date_tournee: date }, { onConflict: "commercial_id,date_tournee" }).select("id").single();
  if (error || !t) return { message: messageErreurBase(error) };
  const { error: e1 } = await supabase.from("tournee_etapes").delete().eq("tournee_id", t.id);
  if (e1) return { message: messageErreurBase(e1) };
  const { error: e2 } = await supabase.from("tournee_etapes").insert(pva.map((pva_id, i) => ({ tournee_id: t.id, pva_id, ordre: i + 1 })));
  if (e2) return { message: messageErreurBase(e2) };
  revalidatePath("/commercial/planification");
  return { ok: true, message: `Tournée enregistrée (${pva.length} étape(s)). Elle apparaîtra sur le téléphone à la prochaine synchronisation.` };
}
