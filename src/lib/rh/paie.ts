import "server-only";
import { joursOuvrables, type ReglesPaie } from "@/lib/metier/rh";
import { lireSeuils } from "@/lib/parametres";
import { clientServeur } from "@/lib/supabase/serveur";
import { finMois } from "./libelles";

/** Règles de paie lues dans les paramètres (catégorie « rh ») et le barème RTS modifiable. */
export async function chargerReglesPaie(): Promise<ReglesPaie> {
  const supabase = await clientServeur();
  const [p, { data: tranches }] = await Promise.all([
    lireSeuils({ rh_heures_mensuelles: 173.33, rh_majoration_heures_sup: 0.3, rh_jours_ouvrables_mois: 26, cnss_taux_salarie: 0.05, cnss_taux_employeur: 0.18, cnss_plafond_gnf: 2_500_000 }),
    supabase.from("tranches_rts").select("de_gnf, taux").order("de_gnf"),
  ]);
  return {
    heuresMensuelles: p.rh_heures_mensuelles,
    majorationHeuresSup: p.rh_majoration_heures_sup,
    joursOuvrablesMois: p.rh_jours_ouvrables_mois,
    tauxCnssSalarie: p.cnss_taux_salarie,
    tauxCnssEmployeur: p.cnss_taux_employeur,
    plafondCnssGnf: p.cnss_plafond_gnf,
    tranchesRts: (tranches ?? []).map((t) => ({ deGnf: Number(t.de_gnf), taux: Number(t.taux) })),
  };
}

/**
 * Éléments variables du mois pour chaque employé, lus dans les présences et les absences :
 * heures supplémentaires pointées ; jours d'absence non payée = absences pointées « absent »
 * + jours ouvrables des absences approuvées d'un type non payé, comptés dans le mois.
 */
export async function elementsVariables(mois: string): Promise<Map<string, { heuresSup: number; joursAbsenceNonPayee: number }>> {
  const supabase = await clientServeur();
  const fin = finMois(mois);
  const [{ data: presences }, { data: absences }, { data: feries }] = await Promise.all([
    supabase.from("presences").select("employe_id, statut, heures_sup").gte("jour", mois).lte("jour", fin).limit(20000),
    supabase.from("absences").select("employe_id, du, au, types_absences!inner(payee)").eq("statut", "approuvee").eq("types_absences.payee", false).lte("du", fin).gte("au", mois),
    supabase.from("jours_feries").select("jour").gte("jour", mois).lte("jour", fin),
  ]);
  const jf = new Set((feries ?? []).map((f) => f.jour));
  const r = new Map<string, { heuresSup: number; joursAbsenceNonPayee: number }>();
  const ligne = (id: string) => r.get(id) ?? r.set(id, { heuresSup: 0, joursAbsenceNonPayee: 0 }).get(id)!;
  for (const p of presences ?? []) {
    const l = ligne(p.employe_id);
    l.heuresSup += Number(p.heures_sup);
    if (p.statut === "absent") l.joursAbsenceNonPayee += 1;
  }
  for (const a of absences ?? []) {
    ligne(a.employe_id).joursAbsenceNonPayee += joursOuvrables(a.du > mois ? a.du : mois, a.au < fin ? a.au : fin, jf);
  }
  return r;
}
