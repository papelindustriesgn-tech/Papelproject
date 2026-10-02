import "server-only";
import { alertesProduction, SEUILS_PRODUCTION_DEFAUT, type AlerteProduction, type SeuilsProduction } from "@/lib/metier/rendement";
import { calculerIndicateursFiche, type Arret, type IndicateursFiche, type LigneProduction } from "@/lib/metier/production";
import { kg } from "@/lib/metier/unites";
import { clientServeur } from "@/lib/supabase/serveur";

/** Données d'une fiche nécessaires aux calculs (chargées en une requête). */
export interface FicheDetaillee {
  id: string;
  date: string;
  statut: string;
  poste: string;
  posteOrdre: number;
  equipe: string | null;
  ligneId: string;
  dureePosteMin: number;
  papierKg: number;
  lignes: (LigneProduction & { produitLibelle: string; paquetsParColis: number })[];
  arrets: (Arret & { cause: string })[];
}

export interface ResultatFiche extends FicheDetaillee {
  indicateurs: IndicateursFiche;
  alertes: AlerteProduction[];
}

/** Agrège plusieurs fiches : on concatène lignes et arrêts, on additionne papier et durées. */
export function agreger(fiches: FicheDetaillee[]): IndicateursFiche {
  return calculerIndicateursFiche({
    consommeKg: kg(fiches.reduce((s, f) => s + f.papierKg, 0)),
    lignes: fiches.flatMap((f) => f.lignes),
    arrets: fiches.flatMap((f) => f.arrets),
    dureePosteMin: fiches.reduce((s, f) => s + f.dureePosteMin, 0),
  });
}

export async function seuilsProduction(): Promise<SeuilsProduction> {
  const supabase = await clientServeur();
  const { data } = await supabase.from("parametres").select("cle, valeur").in("cle", ["seuil_rendement_min", "seuil_perte_max", "seuil_arret_minutes"]);
  const v = new Map((data ?? []).map((p) => [p.cle, Number(p.valeur)]));
  return {
    ratioRendementMin: v.get("seuil_rendement_min") ?? SEUILS_PRODUCTION_DEFAUT.ratioRendementMin,
    tauxPerteMax: v.get("seuil_perte_max") ?? SEUILS_PRODUCTION_DEFAUT.tauxPerteMax,
    arretMaxMinutes: v.get("seuil_arret_minutes") ?? SEUILS_PRODUCTION_DEFAUT.arretMaxMinutes,
  };
}

/** Charge les fiches (validées par défaut) d'une période et calcule leurs indicateurs et alertes. */
export async function chargerFiches(options: { du: string; au: string; inclureBrouillons?: boolean; ids?: string[] }): Promise<ResultatFiche[]> {
  const supabase = await clientServeur();
  let requete = supabase
    .from("fiches_production")
    .select(
      `id, date_production, statut, ligne_id, duree_poste_min,
       postes(libelle, ordre), equipes(libelle),
       fiche_productions(paquets, rebuts_kg, conditionnements(paquets_par_colis, produits(id, libelle, rendement_theorique_paquets_t, poids_paquet_g))),
       fiche_consommations(quantite, articles(famille, unite)),
       fiche_arrets(duree_min, causes_arret(libelle, type_arret))`,
    )
    .gte("date_production", options.du)
    .lte("date_production", options.au)
    .order("date_production")
    .limit(2000);
  if (!options.inclureBrouillons) requete = requete.eq("statut", "validee");
  if (options.ids) requete = requete.in("id", options.ids);

  const [{ data }, { data: cadences }, seuils] = await Promise.all([requete, supabase.from("cadences_nominales").select("ligne_id, produit_id, paquets_minute"), seuilsProduction()]);
  const cadence = new Map((cadences ?? []).map((c) => [`${c.ligne_id}|${c.produit_id}`, Number(c.paquets_minute)]));

  return (data ?? []).map((f) => {
    const fiche: FicheDetaillee = {
      id: f.id,
      date: f.date_production,
      statut: f.statut,
      poste: f.postes?.libelle ?? "",
      posteOrdre: f.postes?.ordre ?? 0,
      equipe: f.equipes?.libelle ?? null,
      ligneId: f.ligne_id,
      dureePosteMin: f.duree_poste_min,
      papierKg: f.fiche_consommations
        .filter((c) => c.articles?.famille === "matiere_premiere" && c.articles?.unite === "kg")
        .reduce((s, c) => s + Number(c.quantite), 0),
      lignes: f.fiche_productions
        .filter((l) => l.conditionnements?.produits)
        .map((l) => {
          const p = l.conditionnements!.produits!;
          return {
            produitId: p.id,
            produitLibelle: p.libelle,
            paquetsParColis: l.conditionnements!.paquets_par_colis,
            paquets: l.paquets,
            rebutsKg: Number(l.rebuts_kg),
            rendementTheoriquePaquetsT: p.rendement_theorique_paquets_t ?? 1,
            poidsPaquetG: Number(p.poids_paquet_g ?? 1),
            cadencePaquetsMinute: cadence.get(`${f.ligne_id}|${p.id}`) ?? null,
          };
        }),
      arrets: f.fiche_arrets.map((a) => ({ minutes: a.duree_min, planifie: a.causes_arret?.type_arret === "planifie", cause: a.causes_arret?.libelle ?? "?" })),
    };
    const indicateurs = agreger([fiche]);
    const alertes = alertesProduction(
      {
        ratioRendement: indicateurs.ratioRendement,
        tauxPerte: indicateurs.tauxPerte,
        arretsMinutes: fiche.arrets.filter((a) => !a.planifie).map((a) => a.minutes),
      },
      seuils,
    );
    return { ...fiche, indicateurs, alertes };
  });
}

/** Regroupe des fiches selon une clé (poste, équipe, jour…) et calcule les indicateurs de chaque groupe. */
export function regrouper(fiches: ResultatFiche[], cle: (f: ResultatFiche) => string): { cle: string; fiches: ResultatFiche[]; indicateurs: IndicateursFiche }[] {
  const groupes = new Map<string, ResultatFiche[]>();
  for (const f of fiches) groupes.set(cle(f), [...(groupes.get(cle(f)) ?? []), f]);
  return [...groupes.entries()].map(([c, fs]) => ({ cle: c, fiches: fs, indicateurs: agreger(fs) }));
}

/** Rendement réel d'un produit en paquets/t, calculé sur les fiches qui n'ont produit QUE ce produit. */
export function rendementReelParProduit(fiches: ResultatFiche[]): { produitId: string; libelle: string; rendementReel: number | null; theorique: number; nbFiches: number }[] {
  const produits = new Map<string, { libelle: string; theorique: number }>();
  for (const f of fiches) for (const l of f.lignes) produits.set(l.produitId, { libelle: l.produitLibelle, theorique: l.rendementTheoriquePaquetsT });
  return [...produits.entries()].map(([id, p]) => {
    const mono = fiches.filter((f) => f.lignes.length > 0 && f.lignes.every((l) => l.produitId === id));
    return { produitId: id, libelle: p.libelle, theorique: p.theorique, rendementReel: mono.length ? agreger(mono).rendementReelPaquetsT : null, nbFiches: mono.length };
  });
}
