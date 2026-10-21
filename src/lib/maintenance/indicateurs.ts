import "server-only";
import { joursDeLaPeriode, type Periode } from "@/lib/formulaires/periode";
import { calculerFiabilite, type Fiabilite } from "@/lib/metier/maintenance";
import { clientServeur } from "@/lib/supabase/serveur";

export interface IndicateursMaintenance {
  global: Fiabilite;
  parEquipement: { id: string; code: string; libelle: string; criticite: string; fiabilite: Fiabilite; coutGnf: number }[];
  coutTotalGnf: number;
  nbInterventions: number;
  partPreventif: number | null;
}

/** Indicateurs sur les interventions terminées dont l'arrêt a commencé dans la période. */
export async function chargerIndicateursMaintenance(p: Pick<Periode, "du" | "au">): Promise<IndicateursMaintenance> {
  const supabase = await clientServeur();
  const [{ data: param }, { data: equipements }, { data: interventions }] = await Promise.all([
    supabase.from("parametres").select("valeur").eq("cle", "maintenance_heures_ouverture_jour").maybeSingle(),
    supabase.from("equipements").select("id, code, libelle, criticite").eq("actif", true).order("code"),
    supabase
      .from("interventions_etat")
      .select("equipement_id, type_intervention, arret_machine, duree_min, cout_main_oeuvre_gnf, cout_externe_gnf, cout_pieces_gnf")
      .eq("statut", "terminee")
      .gte("debut", `${p.du}T00:00:00Z`)
      .lte("debut", `${p.au}T23:59:59Z`)
      .limit(5000),
  ]);
  const heures = Number(param?.valeur ?? 16);
  const jours = joursDeLaPeriode(p).length;
  const liste = interventions ?? [];
  const pannes = (eq?: string) => liste.filter((i) => i.type_intervention === "curative" && i.arret_machine && (!eq || i.equipement_id === eq)).map((i) => Number(i.duree_min ?? 0));
  const cout = (i: (typeof liste)[number]) => Number(i.cout_main_oeuvre_gnf) + Number(i.cout_externe_gnf) + Number(i.cout_pieces_gnf);
  return {
    // Global : on rapporte les pannes au temps requis d'UN équipement critique (vue « ligne »).
    global: calculerFiabilite(pannes(), jours, heures),
    parEquipement: (equipements ?? []).map((e) => ({
      ...e,
      fiabilite: calculerFiabilite(pannes(e.id), jours, heures),
      coutGnf: liste.filter((i) => i.equipement_id === e.id).reduce((s, i) => s + cout(i), 0),
    })),
    coutTotalGnf: liste.reduce((s, i) => s + cout(i), 0),
    nbInterventions: liste.length,
    partPreventif: liste.length ? liste.filter((i) => i.type_intervention === "preventive").length / liste.length : null,
  };
}
