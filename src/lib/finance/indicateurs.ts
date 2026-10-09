import "server-only";
import { aujourdhui } from "@/lib/formulaires/dates";
import { compteDeResultat, tresoreriePrevisionnelle, type CompteResultat, type Flux, type SemainePrevision } from "@/lib/metier/finance";
import { clientServeur } from "@/lib/supabase/serveur";
import { chargerIndicateursVentes } from "@/lib/ventes/indicateurs";

/** Coût de revient des produits sortis pour la vente ou offerts (dotation), moins les retours, sur une période. */
export async function coutDesVentes(du: string, au: string): Promise<number> {
  const supabase = await clientServeur();
  const { data } = await supabase.from("mouvements_stock").select("valeur_gnf").in("type", ["vente", "dotation", "retour"]).gte("date_operation", du).lte("date_operation", au).limit(50000);
  // Ventes et dotations : valeur négative (sortie) ; retours : valeur positive (entrée).
  return Math.max(0, -(data ?? []).reduce((s, m) => s + Number(m.valeur_gnf ?? 0), 0));
}

export interface ResultatPeriode extends CompteResultat {
  chargesParCategorie: { libelle: string; nature: string; compte: string; montantGnf: number }[];
}

/** Compte de résultat de gestion d'une période : ventes, coût matière au CMP, charges des factures fournisseurs (HT, hors achats stockés). */
export async function chargerResultat(du: string, au: string, nbJours: number): Promise<ResultatPeriode> {
  const supabase = await clientServeur();
  const [ventes, cout, { data: factures }] = await Promise.all([
    chargerIndicateursVentes(du, au, nbJours),
    coutDesVentes(du, au),
    supabase.from("factures_fournisseurs_etat").select("montant_ht_gnf, nature, categorie_libelle, compte_charge").neq("statut", "annulee").neq("nature", "stock").gte("date_facture", du).lte("date_facture", au).limit(20000),
  ]);
  const parCategorie = new Map<string, { libelle: string; nature: string; compte: string; montantGnf: number }>();
  for (const f of factures ?? []) {
    const cle = f.categorie_libelle!;
    const e = parCategorie.get(cle) ?? { libelle: cle, nature: f.nature!, compte: f.compte_charge ?? "", montantGnf: 0 };
    e.montantGnf += Number(f.montant_ht_gnf);
    parCategorie.set(cle, e);
  }
  const lignes = [...parCategorie.values()].sort((a, b) => b.montantGnf - a.montantGnf);
  const somme = (n: string) => lignes.filter((l) => l.nature === n).reduce((s, l) => s + l.montantGnf, 0);
  return { ...compteDeResultat(ventes.caHtGnf, cout, somme("variable"), somme("fixe")), chargesParCategorie: lignes };
}

export interface SituationFinanciere {
  tresorerieGnf: number;
  comptes: { id: string; libelle: string; devise: string; solde: number; soldeGnf: number; type: string }[];
  creancesGnf: number;
  creancesEchuesGnf: number;
  dettesGnf: number;
  dettesEchuesGnf: number;
  stocksGnf: number;
}

export async function chargerSituation(): Promise<SituationFinanciere> {
  const supabase = await clientServeur();
  const [{ data: comptes }, { data: creances }, { data: dettes }, { data: stocks }] = await Promise.all([
    supabase.from("soldes_tresorerie").select("id, libelle, devise, solde, taux_actuel, type_compte, actif").eq("actif", true).order("ordre"),
    supabase.from("factures_etat").select("solde_gnf, jours_retard").gt("solde_gnf", 0).limit(20000),
    supabase.from("factures_fournisseurs_etat").select("solde_gnf, jours_retard").gt("solde_gnf", 0).limit(20000),
    supabase.from("etat_stock").select("valeur_gnf").eq("actif", true),
  ]);
  const lignes = (comptes ?? []).map((c) => {
    const solde = Number(c.solde);
    // USD : solde en centimes × taux du jour.
    const soldeGnf = c.devise === "USD" ? Math.round((solde * Number(c.taux_actuel)) / 100) : solde;
    return { id: c.id!, libelle: c.libelle!, devise: c.devise!, solde, soldeGnf, type: c.type_compte! };
  });
  const somme = (l: { solde_gnf: number | null }[] | null) => (l ?? []).reduce((s, x) => s + Number(x.solde_gnf), 0);
  return {
    tresorerieGnf: lignes.reduce((s, c) => s + c.soldeGnf, 0),
    comptes: lignes,
    creancesGnf: somme(creances),
    creancesEchuesGnf: somme((creances ?? []).filter((c) => Number(c.jours_retard) > 0)),
    dettesGnf: somme(dettes),
    dettesEchuesGnf: somme((dettes ?? []).filter((d) => Number(d.jours_retard) > 0)),
    stocksGnf: (stocks ?? []).reduce((s, x) => s + Number(x.valeur_gnf), 0),
  };
}

/**
 * Trésorerie prévisionnelle sur N semaines à partir des soldes actuels :
 * encaissements attendus (factures clients non soldées, à leur échéance), règlements fournisseurs (à l'échéance),
 * charges récurrentes des mois futurs pas encore générées, commandes d'achat envoyées non encore facturées.
 */
export async function chargerPrevisionnel(nbSemaines = 13): Promise<{ semaines: SemainePrevision[]; soldeInitialGnf: number }> {
  const supabase = await clientServeur();
  const debut = aujourdhui();
  const situation = await chargerSituation();
  const [{ data: clients }, { data: fournisseurs }, { data: recurrentes }, { data: generees }, { data: bc }] = await Promise.all([
    supabase.from("factures_etat").select("solde_gnf, date_echeance").gt("solde_gnf", 0).limit(20000),
    supabase.from("factures_fournisseurs_etat").select("solde_gnf, date_echeance").gt("solde_gnf", 0).limit(20000),
    supabase.from("charges_recurrentes").select("id, montant_gnf, jour_echeance, date_debut, date_fin").eq("actif", true),
    supabase.from("factures_fournisseurs").select("recurrente_id, mois_recurrence").not("recurrente_id", "is", null).gte("mois_recurrence", debut.slice(0, 8) + "01"),
    supabase.from("bons_commande").select("id, devise, taux_change, date_livraison_prevue, lignes_bc(montant_devise), factures_fournisseurs(id)").eq("statut", "envoye"),
  ]);
  const flux: Flux[] = [];
  for (const c of clients ?? []) flux.push({ date: c.date_echeance!, montantGnf: Number(c.solde_gnf), nature: "Encaissements clients" });
  for (const f of fournisseurs ?? []) flux.push({ date: f.date_echeance!, montantGnf: -Number(f.solde_gnf), nature: "Fournisseurs et charges" });

  // Charges récurrentes : mois couverts par l'horizon, sauf celles déjà générées (déjà dans les factures).
  const dejaGenere = new Set((generees ?? []).map((g) => `${g.recurrente_id}|${g.mois_recurrence}`));
  const finHorizon = new Date(`${debut}T00:00:00Z`);
  finHorizon.setUTCDate(finHorizon.getUTCDate() + nbSemaines * 7);
  for (let m = new Date(`${debut.slice(0, 8)}01T00:00:00Z`); m <= finHorizon; m.setUTCMonth(m.getUTCMonth() + 1)) {
    const mois = m.toISOString().slice(0, 10);
    for (const r of recurrentes ?? []) {
      if (r.date_debut > mois.slice(0, 8) + "28" || (r.date_fin && r.date_fin < mois) || dejaGenere.has(`${r.id}|${mois}`)) continue;
      flux.push({ date: `${mois.slice(0, 8)}${String(r.jour_echeance).padStart(2, "0")}`, montantGnf: -Number(r.montant_gnf), nature: "Charges récurrentes" });
    }
  }
  // Commandes d'achat envoyées sans facture : décaissement estimé à la livraison prévue (sinon dans 30 jours).
  for (const b of bc ?? []) {
    if (b.factures_fournisseurs.length) continue;
    const devise = b.lignes_bc.reduce((s, l) => s + Number(l.montant_devise), 0);
    const gnf = b.devise === "USD" ? Math.round((devise * Number(b.taux_change ?? 0)) / 100) : devise;
    const d = new Date(`${debut}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 30);
    flux.push({ date: b.date_livraison_prevue ?? d.toISOString().slice(0, 10), montantGnf: -gnf, nature: "Commandes d'achat" });
  }
  return { semaines: tresoreriePrevisionnelle(situation.tresorerieGnf, flux, debut, nbSemaines), soldeInitialGnf: situation.tresorerieGnf };
}
