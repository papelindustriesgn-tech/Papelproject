import "server-only";
import { SANS_FILTRE, type FiltresAnalyse } from "@/lib/formulaires/filtres-analyse";
import { lignesRetenues, partRetenue, pieceRetenue } from "@/lib/metier/filtrage";
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
  /** Ventes de la période par client (CA HT net des avoirs), pour le classement des plus gros clients. */
  clients: VentesClient[];
}

export interface VentesClient {
  id: string;
  nom: string;
  code: string;
  type: string;
  commercialId: string | null;
  caHtGnf: number;
  paquets: number;
  nbFactures: number;
  /** Date de la dernière facture de la période (AAAA-MM-JJ). */
  dernierAchat: string | null;
}

/**
 * Indicateurs commerciaux d'une période. CA = factures validées moins avoirs validés (HT).
 * Créances et échu : situation à la date du jour (tous exercices).
 * Filtres (facultatifs) : commercial (de la pièce, sinon du client) et gamme (lignes du produit ; TTC et
 * paiements répartis au prorata du HT). Créances, échu et nouveaux clients ne se découpent pas par gamme.
 */
export async function chargerIndicateursVentes(du: string, au: string, nbJours: number, filtres: FiltresAnalyse = SANS_FILTRE): Promise<IndicateursVentes> {
  const supabase = await clientServeur();
  let nouveaux = supabase.from("clients").select("id", { count: "exact", head: true }).gte("created_at", `${du}T00:00:00Z`).lte("created_at", `${au}T23:59:59Z`);
  let soldesRequete = supabase.from("soldes_clients").select("encours_gnf, echu_gnf");
  if (filtres.commercial) {
    nouveaux = nouveaux.eq("commercial_id", filtres.commercial);
    soldesRequete = soldesRequete.eq("commercial_id", filtres.commercial);
  }
  const [{ data: pieces }, { data: commandes }, { count: nbNouveaux }, { data: paiements }, { data: soldes }] = await Promise.all([
    supabase
      .from("pieces_vente")
      .select("id, type_piece, client_id, commercial_id, date_piece, total_ht_gnf, total_ttc_gnf, clients(nom, code, commercial_id, types_clients(libelle)), lignes_piece(paquets, montant_ht_gnf, conditionnements(paquets_par_colis, produits(id, libelle)))")
      .in("type_piece", ["facture", "avoir"])
      .eq("statut", "valide")
      .gte("date_piece", du)
      .lte("date_piece", au)
      .limit(5000),
    supabase
      .from("pieces_vente")
      .select("commercial_id, clients(commercial_id), lignes_piece(montant_ht_gnf, conditionnements(produit_id))")
      .eq("type_piece", "commande")
      .eq("statut", "valide")
      .gte("date_piece", du)
      .lte("date_piece", au)
      .limit(5000),
    nouveaux,
    supabase
      .from("paiements")
      .select("montant_gnf, pieces_vente(commercial_id, clients(commercial_id), lignes_piece(montant_ht_gnf, conditionnements(produit_id)))")
      .gte("date_paiement", du)
      .lte("date_paiement", au)
      .limit(10000),
    soldesRequete,
  ]);

  let caHt = 0;
  let caTtc = 0;
  let paquets = 0;
  let nbFactures = 0;
  const parProduit = new Map<string, { paquets: number; colis: number; caHtGnf: number }>();
  const caParJour = new Map<string, number>();
  const parClient = new Map<string, VentesClient>();
  const clientsActifs = new Set<string>();
  for (const p of pieces ?? []) {
    const lignes = p.lignes_piece.map((l) => ({ ...l, produitId: l.conditionnements?.produits?.id ?? null, montantHtGnf: l.montant_ht_gnf }));
    const filtrable = { commercialId: p.commercial_id, clientCommercialId: p.clients?.commercial_id ?? null, lignes };
    if (!pieceRetenue(filtrable, filtres)) continue;
    const signe = p.type_piece === "avoir" ? -1 : 1;
    const retenues = lignesRetenues(lignes, filtres);
    // Sans filtre gamme : totaux de la pièce ; avec : somme des lignes de la gamme (TTC au prorata).
    const ht = filtres.produit ? retenues.reduce((s, l) => s + l.montant_ht_gnf, 0) : p.total_ht_gnf;
    const ttc = filtres.produit ? Math.round(p.total_ttc_gnf * partRetenue(filtrable, filtres)) : p.total_ttc_gnf;
    caHt += signe * ht;
    caTtc += signe * ttc;
    caParJour.set(p.date_piece, (caParJour.get(p.date_piece) ?? 0) + signe * ht);
    if (p.type_piece === "facture") {
      clientsActifs.add(p.client_id);
      nbFactures++;
    }
    const c = parClient.get(p.client_id) ?? {
      id: p.client_id,
      nom: p.clients?.nom ?? "",
      code: p.clients?.code ?? "",
      type: p.clients?.types_clients?.libelle ?? "",
      commercialId: p.commercial_id ?? p.clients?.commercial_id ?? null,
      caHtGnf: 0,
      paquets: 0,
      nbFactures: 0,
      dernierAchat: null,
    };
    c.caHtGnf += signe * ht;
    c.paquets += signe * retenues.reduce((t, l) => t + l.paquets, 0);
    if (p.type_piece === "facture") {
      c.nbFactures++;
      if (!c.dernierAchat || p.date_piece > c.dernierAchat) c.dernierAchat = p.date_piece;
    }
    parClient.set(p.client_id, c);
    for (const l of retenues) {
      const libelle = l.conditionnements?.produits?.libelle ?? "?";
      const e = parProduit.get(libelle) ?? { paquets: 0, colis: 0, caHtGnf: 0 };
      e.paquets += signe * l.paquets;
      e.colis += signe * paquetsVersColis(l.paquets as Paquets, { paquetsParColis: l.conditionnements?.paquets_par_colis ?? 1 }).colis;
      e.caHtGnf += signe * l.montant_ht_gnf;
      parProduit.set(libelle, e);
      paquets += signe * l.paquets;
    }
  }
  const versFiltrable = (x: { commercial_id: string | null; clients: { commercial_id: string | null } | null; lignes_piece: { montant_ht_gnf: number; conditionnements: { produit_id: string } | null }[] }) => ({
    commercialId: x.commercial_id,
    clientCommercialId: x.clients?.commercial_id ?? null,
    lignes: x.lignes_piece.map((l) => ({ produitId: l.conditionnements?.produit_id ?? null, montantHtGnf: l.montant_ht_gnf })),
  });
  const encaisse = (paiements ?? []).reduce((s, x) => s + (x.pieces_vente ? Math.round(x.montant_gnf * partRetenue(versFiltrable(x.pieces_vente), filtres)) : 0), 0);
  const creances = (soldes ?? []).reduce((s, x) => s + Number(x.encours_gnf ?? 0), 0);
  return {
    caHtGnf: caHt,
    caTtcGnf: caTtc,
    nbFactures,
    nbCommandes: (commandes ?? []).filter((c) => pieceRetenue(versFiltrable(c), filtres)).length,
    paquets,
    parProduit: [...parProduit.entries()].map(([libelle, v]) => ({ libelle, ...v })).sort((a, b) => a.libelle.localeCompare(b.libelle)),
    prixMoyenPaquetGnf: prixMoyenPaquet(caHt, paquets),
    clientsActifs: clientsActifs.size,
    nouveauxClients: nbNouveaux ?? 0,
    encaisseGnf: encaisse,
    creancesGnf: creances,
    echuGnf: (soldes ?? []).reduce((s, x) => s + Number(x.echu_gnf ?? 0), 0),
    // Les créances ne se découpent pas par gamme : pas de DSO quand une gamme est choisie.
    dso: caTtc > 0 && !filtres.produit ? calculerDso(creances, caTtc, nbJours) : null,
    caParJour,
    topClients: [...parClient.values()].sort((a, b) => b.caHtGnf - a.caHtGnf).slice(0, 10).map((c) => ({ nom: c.nom, caHtGnf: c.caHtGnf })),
    clients: [...parClient.values()],
  };
}
