import "server-only";
import { calculerDso, prixMoyenPaquet } from "@/lib/metier/ventes";
import { paquetsVersColis, type Paquets } from "@/lib/metier/unites";
import { clientServeur } from "@/lib/supabase/serveur";

export interface IndicateursVentes {
  caHtGnf: number;
  caTtcGnf: number;
  nbFactures: number;
  nbCommandes: number;
  paquets: number;
  parProduit: { libelle: string; paquets: number; colis: number; caHtGnf: number }[];
  prixMoyenPaquetGnf: number | null;
  clientsActifs: number;
  nouveauxClients: number;
  encaisseGnf: number;
  creancesGnf: number;
  echuGnf: number;
  dso: number | null;
  caParJour: Map<string, number>;
  topClients: { nom: string; caHtGnf: number }[];
}

/**
 * Indicateurs commerciaux d'une période. CA = factures validées moins avoirs validés (HT).
 * Créances et échu : situation à la date du jour (tous exercices).
 */
export async function chargerIndicateursVentes(du: string, au: string, nbJours: number): Promise<IndicateursVentes> {
  const supabase = await clientServeur();
  const [{ data: pieces }, { count: nbCommandes }, { count: nbNouveaux }, { data: paiements }, { data: soldes }] = await Promise.all([
    supabase
      .from("pieces_vente")
      .select("id, type_piece, client_id, date_piece, total_ht_gnf, total_ttc_gnf, clients(nom), lignes_piece(paquets, montant_ht_gnf, conditionnements(paquets_par_colis, produits(libelle)))")
      .in("type_piece", ["facture", "avoir"])
      .eq("statut", "valide")
      .gte("date_piece", du)
      .lte("date_piece", au)
      .limit(5000),
    supabase.from("pieces_vente").select("id", { count: "exact", head: true }).eq("type_piece", "commande").eq("statut", "valide").gte("date_piece", du).lte("date_piece", au),
    supabase.from("clients").select("id", { count: "exact", head: true }).gte("created_at", `${du}T00:00:00Z`).lte("created_at", `${au}T23:59:59Z`),
    supabase.from("paiements").select("montant_gnf").gte("date_paiement", du).lte("date_paiement", au).limit(10000),
    supabase.from("soldes_clients").select("encours_gnf, echu_gnf"),
  ]);

  let caHt = 0;
  let caTtc = 0;
  let paquets = 0;
  const parProduit = new Map<string, { paquets: number; colis: number; caHtGnf: number }>();
  const caParJour = new Map<string, number>();
  const parClient = new Map<string, { nom: string; caHtGnf: number }>();
  const clientsActifs = new Set<string>();
  for (const p of pieces ?? []) {
    const signe = p.type_piece === "avoir" ? -1 : 1;
    caHt += signe * p.total_ht_gnf;
    caTtc += signe * p.total_ttc_gnf;
    caParJour.set(p.date_piece, (caParJour.get(p.date_piece) ?? 0) + signe * p.total_ht_gnf);
    if (p.type_piece === "facture") clientsActifs.add(p.client_id);
    const c = parClient.get(p.client_id) ?? { nom: p.clients?.nom ?? "", caHtGnf: 0 };
    c.caHtGnf += signe * p.total_ht_gnf;
    parClient.set(p.client_id, c);
    for (const l of p.lignes_piece) {
      const libelle = l.conditionnements?.produits?.libelle ?? "?";
      const e = parProduit.get(libelle) ?? { paquets: 0, colis: 0, caHtGnf: 0 };
      e.paquets += signe * l.paquets;
      e.colis += signe * paquetsVersColis(l.paquets as Paquets, { paquetsParColis: l.conditionnements?.paquets_par_colis ?? 1 }).colis;
      e.caHtGnf += signe * l.montant_ht_gnf;
      parProduit.set(libelle, e);
      paquets += signe * l.paquets;
    }
  }
  const creances = (soldes ?? []).reduce((s, x) => s + Number(x.encours_gnf ?? 0), 0);
  return {
    caHtGnf: caHt,
    caTtcGnf: caTtc,
    nbFactures: (pieces ?? []).filter((p) => p.type_piece === "facture").length,
    nbCommandes: nbCommandes ?? 0,
    paquets,
    parProduit: [...parProduit.entries()].map(([libelle, v]) => ({ libelle, ...v })).sort((a, b) => a.libelle.localeCompare(b.libelle)),
    prixMoyenPaquetGnf: prixMoyenPaquet(caHt, paquets),
    clientsActifs: clientsActifs.size,
    nouveauxClients: nbNouveaux ?? 0,
    encaisseGnf: (paiements ?? []).reduce((s, x) => s + x.montant_gnf, 0),
    creancesGnf: creances,
    echuGnf: (soldes ?? []).reduce((s, x) => s + Number(x.echu_gnf ?? 0), 0),
    dso: caTtc > 0 ? calculerDso(creances, caTtc, nbJours) : null,
    caParJour,
    topClients: [...parClient.values()].sort((a, b) => b.caHtGnf - a.caHtGnf).slice(0, 10),
  };
}
