import "server-only";
import { chargerIndicateursCommerciaux, type IndicateursCommerciaux } from "@/lib/commercial/indicateurs";
import type { Periode } from "@/lib/formulaires/periode";
import { margeBrute } from "@/lib/metier/ventes";
import { libelleAlerte } from "@/lib/production/affichage";
import { agreger, chargerFiches } from "@/lib/production/indicateurs";
import type { IndicateursFiche } from "@/lib/metier/production";
import { chargerIndicateursVentes, type IndicateursVentes } from "@/lib/ventes/indicateurs";
import { clientServeur } from "@/lib/supabase/serveur";

export interface Alerte {
  gravite: "critique" | "importante";
  domaine: "Stock" | "Production" | "Ventes" | "Distribution" | "Logistique";
  message: string;
  lien: string;
}

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
  rendementParJour: Map<string, number | null>;
}

/** Coût de revient des produits sortis pour la vente ou offerts (dotation), moins les retours, sur une période. */
async function coutDesVentes(du: string, au: string): Promise<number> {
  const supabase = await clientServeur();
  const { data } = await supabase.from("mouvements_stock").select("type, valeur_gnf").in("type", ["vente", "dotation", "retour"]).gte("date_operation", du).lte("date_operation", au).limit(50000);
  // Ventes et dotations : valeur négative (sortie) ; retours : valeur positive (entrée).
  return Math.max(0, -(data ?? []).reduce((s, m) => s + Number(m.valeur_gnf ?? 0), 0));
}

export async function chargerSynthese(p: Periode): Promise<SyntheseDirection> {
  const supabase = await clientServeur();
  const [ventes, ventesPrec, fiches, fichesPrec, cout, coutPrec, etat, alertesStock, factures, distribution, distributionPrec, pva, transit, enRetard] = await Promise.all([
    chargerIndicateursVentes(p.du, p.au, p.nbJours),
    chargerIndicateursVentes(p.precedente.du, p.precedente.au, p.nbJours),
    chargerFiches({ du: p.du, au: p.au }),
    chargerFiches({ du: p.precedente.du, au: p.precedente.au }),
    coutDesVentes(p.du, p.au),
    coutDesVentes(p.precedente.du, p.precedente.au),
    supabase.from("etat_stock").select("famille, unite, quantite, valeur_gnf, conso_jour, libelle, paquets_par_colis").eq("actif", true),
    supabase.from("alertes_stock").select("article_id, libelle, niveau_alerte, jours_couverture, famille"),
    supabase.from("factures_etat").select("id, numero, client_nom, solde_gnf, jours_retard").gt("solde_gnf", 0).gt("jours_retard", 30).order("jours_retard", { ascending: false }).limit(10),
    chargerIndicateursCommerciaux(p.du, p.au, p.nbJours),
    chargerIndicateursCommerciaux(p.precedente.du, p.precedente.au, p.nbJours),
    supabase.from("pva_carte").select("type_libelle, actif"),
    supabase.from("transit").select("kg_en_transit, nb_conteneurs").maybeSingle(),
    // Bons de livraison validés depuis plus de 2 jours et toujours pas remis au client.
    supabase.from("livraisons").select("id", { count: "exact", head: true }).eq("statut", "validee").eq("statut_remise", "a_livrer").lt("date_livraison", hier(hier(p.au))),
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

  // Alertes prioritaires du jour
  const alertes: Alerte[] = [];
  for (const a of alertesStock.data ?? []) {
    alertes.push({
      gravite: a.niveau_alerte === "couverture_faible" ? "importante" : "critique",
      domaine: "Stock",
      message:
        a.niveau_alerte === "rupture" ? `Rupture de stock : ${a.libelle}` : a.niveau_alerte === "sous_seuil" ? `${a.libelle} sous le seuil d'alerte` : `${a.libelle} : ${Number(a.jours_couverture ?? 0).toLocaleString("fr-FR")} jours de couverture`,
      lien: `/magasin/articles/${a.article_id}`,
    });
  }
  // Production d'hier et du dernier jour de la période (fiches validées) en alerte
  const derniers = fiches.filter((f) => f.date >= hier(p.au));
  for (const f of derniers.filter((x) => x.alertes.length))
    alertes.push({ gravite: f.alertes.some((a) => a.type === "arret_long") ? "critique" : "importante", domaine: "Production", message: `${f.poste} du ${f.date.split("-").reverse().join("/")} : ${f.alertes.map(libelleAlerte).join(", ")}`, lien: `/production/fiches/${f.id}` });
  for (const fa of factures.data ?? [])
    alertes.push({ gravite: Number(fa.jours_retard) > 60 ? "critique" : "importante", domaine: "Ventes", message: `Impayé ${fa.numero} – ${fa.client_nom} : ${Number(fa.solde_gnf).toLocaleString("fr-FR")} GNF, ${fa.jours_retard} j de retard`, lien: `/ventes/pieces/${fa.id}` });
  if ((distribution.tauxRupture ?? 0) > 0.15)
    alertes.push({ gravite: "importante", domaine: "Distribution", message: `Taux de rupture chez les points de vente : ${Math.round((distribution.tauxRupture ?? 0) * 100)} %`, lien: "/commercial" });
  if ((enRetard.count ?? 0) > 0)
    alertes.push({ gravite: "importante", domaine: "Logistique", message: `${enRetard.count} bon(s) de livraison validé(s) depuis plus de 2 jours et non remis au client`, lien: "/logistique" });
  alertes.sort((a, b) => (a.gravite === b.gravite ? 0 : a.gravite === "critique" ? -1 : 1));

  const m = margeBrute(ventes.caHtGnf, cout);
  const actifs = (pva.data ?? []).filter((x) => x.actif);
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
      produitsFinis: lignes.filter((l) => l.famille === "produit_fini" && Number(l.quantite) > 0).map((l) => ({ libelle: l.libelle!, paquets: Number(l.quantite), paquetsParColis: l.paquets_par_colis })),
    },
    distribution: {
      ...distribution,
      grossistes: actifs.filter((x) => x.type_libelle === "Grossiste").length,
      semiGrossistes: actifs.filter((x) => x.type_libelle === "Semi-grossiste").length,
    },
    distributionPrec,
    alertes,
    rendementParJour: new Map([...parJour.entries()].map(([d, fs]) => [d, agreger(fs).ratioRendement])),
  };
}

function hier(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
