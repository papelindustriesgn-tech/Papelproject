import "server-only";
import { cache } from "react";
import { objectifSurPeriode, type ObjectifSurPeriode } from "@/lib/metier/objectifs";
import { clientServeur } from "@/lib/supabase/serveur";
import { OBJECTIFS } from "./catalogue";

/**
 * Objectifs mensuels d'un service rapportés à la période [du, au] : un objectif par indicateur qui en a un
 * (quantités au prorata des jours, taux en moyenne pondérée).
 */
export const chargerObjectifsEspace = cache(async (espace: string, du: string, au: string): Promise<Map<string, ObjectifSurPeriode>> => {
  const supabase = await clientServeur();
  const { data } = await supabase
    .from("objectifs_services")
    .select("indicateur, mois, valeur")
    .eq("espace", espace)
    .gte("mois", `${du.slice(0, 7)}-01`)
    .lte("mois", au);
  const resultat = new Map<string, ObjectifSurPeriode>();
  for (const def of OBJECTIFS[espace] ?? []) {
    const valeurs = (data ?? []).filter((o) => o.indicateur === def.code).map((o) => ({ mois: o.mois, valeur: Number(o.valeur) }));
    const o = objectifSurPeriode(valeurs, du, au, def.cumul);
    if (o) resultat.set(def.code, o);
  }
  return resultat;
});
