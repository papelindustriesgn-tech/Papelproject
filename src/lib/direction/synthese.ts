import "server-only";
import { chargerIndicateursCommerciaux, type IndicateursCommerciaux } from "@/lib/commercial/indicateurs";
import { SANS_FILTRE, type FiltresAnalyse } from "@/lib/formulaires/filtres-analyse";
import type { Periode } from "@/lib/formulaires/periode";
import { chargerSituation, coutDesVentes, type SituationFinanciere } from "@/lib/finance/indicateurs";
import { margeBrute } from "@/lib/metier/ventes";
import { agreger, chargerFiches, seuilsProduction } from "@/lib/production/indicateurs";
import type { IndicateursFiche } from "@/lib/metier/production";
import { chargerIndicateursVentes, type IndicateursVentes } from "@/lib/ventes/indicateurs";
import { lireSeuils } from "@/lib/parametres";
import { clientServeur } from "@/lib/supabase/serveur";
import { chargerAlertes, type Alerte } from "./alertes";

export type { Alerte } from "./alertes";

export interface SyntheseDirection {
  ventes: IndicateursVentes;
  ventesPrec: IndicateursVentes;
  production: IndicateursFiche;
  productionPrec: IndicateursFiche;
  colisProduits: { libelle: string; colis: number }[];
  nbFiches: number;
  marge: { margeGnf: number; taux: number | null; coutVentesGnf: number };
  margePrec: { margeGnf: number; taux: number | null };
  stock: { kgMp: number; couvertureMpJours: number | null; valeurGnf: number; produitsFinis: { libelle: string; paquets: number; paquetsParColis: number | null }[]; kgTransit: number; conteneursTransit: number };
  distribution: IndicateursCommerciaux & { grossistes: number; semiGrossistes: number };
  distributionPrec: IndicateursCommerciaux;
  alertes: Alerte[];
  finance: SituationFinanciere;
  rendementParJour: Map<string, number | null>;
  /** Seuils d'alerte réglés par les services (paramètres). */
  seuils: { rendementMin: number; tauxPerteMax: number; couvertureJours: number; tauxRupture: number; impayeJours: number; impayeCritiqueJours: number; livraisonJours: number; otifMin: number };
}

/**
 * Synthèse de la Direction pour une période. Filtres gamme et commercial appliqués aux ventes, à la marge,
 * à la production (gamme), à la distribution (commercial) et aux produits finis en stock (gamme) ;
 * les alertes restent globales (une urgence se voit quel que soit le filtre).
 */
export async function chargerSynthese(p: Periode, filtres: FiltresAnalyse = SANS_FILTRE): Promise<SyntheseDirection> {
  const [seuilsLus, production] = await Promise.all([
    lireSeuils({ alerte_impaye_jours: 30, alerte_impaye_critique_jours: 60, alerte_taux_rupture: 0.15, alerte_livraison_jours: 2, stock_jours_couverture_alerte: 15, alerte_otif_min: 0.9 }),
    seuilsProduction(),
  ]);
  const seuils = {
    rendementMin: production.ratioRendementMin,
    tauxPerteMax: production.tauxPerteMax,
    couvertureJours: seuilsLus.stock_jours_couverture_alerte,
    tauxRupture: seuilsLus.alerte_taux_rupture,
    impayeJours: seuilsLus.alerte_impaye_jours,
    impayeCritiqueJours: seuilsLus.alerte_impaye_critique_jours,
    livraisonJours: seuilsLus.alerte_livraison_jours,
    otifMin: seuilsLus.alerte_otif_min,
  };
  const supabase = await clientServeur();
  const ventesP = chargerIndicateursVentes(p.du, p.au, p.nbJours, filtres);
  const ventesPrecP = chargerIndicateursVentes(p.precedente.du, p.precedente.au, p.nbJours, filtres);
  // Le coût des ventes d'un commercial s'estime à partir de ses paquets facturés : il attend alors les ventes.
  const coutFiltre = (du: string, au: string, v: Promise<IndicateursVentes>) => (filtres.commercial ? v.then((x) => coutDesVentes(du, au, filtres, x)) : coutDesVentes(du, au, filtres));
  const [ventes, ventesPrec, fiches, fichesPrec, cout, coutPrec, etat, distribution, distributionPrec, pva, transit, finance] = await Promise.all([
    ventesP,
    ventesPrecP,
    chargerFiches({ du: p.du, au: p.au, produit: filtres.produit }),
    chargerFiches({ du: p.precedente.du, au: p.precedente.au, produit: filtres.produit }),
    coutFiltre(p.du, p.au, ventesP),
    coutFiltre(p.precedente.du, p.precedente.au, ventesPrecP),
    supabase.from("etat_stock").select("famille, unite, quantite, valeur_gnf, conso_jour, libelle, paquets_par_colis, produit_id").eq("actif", true),
    chargerIndicateursCommerciaux(p.du, p.au, p.nbJours, filtres),
    chargerIndicateursCommerciaux(p.precedente.du, p.precedente.au, p.nbJours, filtres),
    supabase.from("pva_carte").select("type_libelle, actif, commercial_id"),
    supabase.from("transit").select("kg_en_transit, nb_conteneurs").maybeSingle(),
    chargerSituation(),
  ]);

  // Production : colis produits par produit et rendement par jour.
  const colis = new Map<string, number>();
  for (const f of fiches) for (const l of f.lignes) colis.set(l.produitLibelle, (colis.get(l.produitLibelle) ?? 0) + Math.floor(l.paquets / l.paquetsParColis));
  const parJour = new Map<string, typeof fiches>();
  for (const f of fiches) parJour.set(f.date, [...(parJour.get(f.date) ?? []), f]);

  // Stock
  const lignes = etat.data ?? [];
  const mp = lignes.filter((l) => l.famille === "matiere_premiere" && l.unite === "kg");
  const kgMp = mp.reduce((s, l) => s + Number(l.quantite), 0);
  const consoMp = mp.reduce((s, l) => s + Number(l.conso_jour), 0);

  // Alertes prioritaires (globales), taux de rupture de la période affichée.
  const alertes: Alerte[] = await chargerAlertes(p.au, filtres.commercial ? undefined : distribution.tauxRupture);

  const m = margeBrute(ventes.caHtGnf, cout);
  const actifs = (pva.data ?? []).filter((x) => x.actif && (!filtres.commercial || x.commercial_id === filtres.commercial));
  return {
    ventes,
    ventesPrec,
    production: agreger(fiches),
    productionPrec: agreger(fichesPrec),
    colisProduits: [...colis.entries()].map(([libelle, c]) => ({ libelle, colis: c })).sort((a, b) => a.libelle.localeCompare(b.libelle)),
    nbFiches: fiches.length,
    marge: { ...m, coutVentesGnf: cout },
    margePrec: margeBrute(ventesPrec.caHtGnf, coutPrec),
    stock: {
      kgMp,
      kgTransit: Number(transit.data?.kg_en_transit ?? 0),
      conteneursTransit: Number(transit.data?.nb_conteneurs ?? 0),
      couvertureMpJours: consoMp > 0 ? kgMp / consoMp : null,
      valeurGnf: lignes.reduce((s, l) => s + Number(l.valeur_gnf), 0),
      produitsFinis: lignes.filter((l) => l.famille === "produit_fini" && Number(l.quantite) > 0 && (!filtres.produit || l.produit_id === filtres.produit)).map((l) => ({ libelle: l.libelle!, paquets: Number(l.quantite), paquetsParColis: l.paquets_par_colis })),
    },
    distribution: {
      ...distribution,
      grossistes: actifs.filter((x) => x.type_libelle === "Grossiste").length,
      semiGrossistes: actifs.filter((x) => x.type_libelle === "Semi-grossiste").length,
    },
    distributionPrec,
    alertes,
    finance,
    seuils,
    rendementParJour: new Map([...parJour.entries()].map(([d, fs]) => [d, agreger(fs).ratioRendement])),
  };
}
