import "server-only";
import { cache } from "react";
import { objectifPeriode, type ObjectifPeriode } from "@/lib/metier/objectifs";
import { clientServeur } from "@/lib/supabase/serveur";

/** Objectif du business plan pour la période [du, au] (mois au prorata des jours) ; null s'il n'y en a pas. */
export const chargerObjectif = cache(async (du: string, au: string): Promise<ObjectifPeriode | null> => {
  const supabase = await clientServeur();
  const { data } = await supabase
    .from("objectifs_mensuels")
    .select("mois, production_kg, paquets, ca_ht_gnf, couts_variables_gnf, charges_fixes_gnf")
    .eq("actif", true)
    .gte("mois", `${du.slice(0, 7)}-01`)
    .lte("mois", au);
  return objectifPeriode(
    (data ?? []).map((o) => ({
      mois: o.mois,
      productionKg: Number(o.production_kg),
      paquets: o.paquets,
      caHtGnf: Number(o.ca_ht_gnf),
      coutsVariablesGnf: Number(o.couts_variables_gnf),
      chargesFixesGnf: Number(o.charges_fixes_gnf),
    })),
    du,
    au,
  );
});
