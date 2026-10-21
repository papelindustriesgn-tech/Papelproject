/**
 * Commandes clients à servir et estimation des délais, à partir du résultat de la fonction SQL
 * `coordination_commandes` (pur : utilisé par l'ERP et par l'application terrain hors ligne).
 */
import { etatCommande, planifierCommandes, type EstimationLigne, type EtatCommande, type LigneACommander } from "@/lib/metier/coordination";

export interface LigneCommandeClient extends LigneACommander {
  numero: string;
  datePiece: string;
  clientNom: string;
  commercialId: string | null;
  commercialNom: string;
  produit: string;
  conditionnement: string;
  paquetsParColis: number;
}

export interface CommandeAServir {
  id: string;
  numero: string;
  datePiece: string;
  clientNom: string;
  commercialNom: string;
  lignes: EstimationLigne<LigneCommandeClient>[];
  etat: EtatCommande;
  dateLivraison: string | null;
}

export interface BesoinProduction {
  conditionnementId: string;
  produit: string;
  conditionnement: string;
  paquetsParColis: number;
  paquetsAProduire: number;
  stock: number;
  commandes: number;
  /** Date de la plus ancienne commande en attente de ce produit. */
  depuis: string;
}

export interface Coordination {
  jour: string;
  delaiLivraisonJours: number;
  joursReference: number;
  commandes: CommandeAServir[];
  besoins: BesoinProduction[];
}

export interface Brut {
  jour: string;
  delai_livraison_jours: number;
  jours_reference: number;
  lignes: { commande_id: string; numero: string; date_piece: string; client_id: string; client_nom: string; commercial_id: string | null; commercial_nom: string; conditionnement_id: string; paquets_restants: number }[];
  conditionnements: { id: string; libelle: string; produit_id: string; produit: string; paquets_par_colis: number }[];
  stocks: { conditionnement_id: string; paquets: number }[];
  rythmes: { conditionnement_id: string; paquets_jour: number }[];
  cadences: { produit_id: string; paquets_jour: number }[];
  ordres: { numero: string; conditionnement_id: string; date_fin_prevue: string; paquets_restants: number }[];
}

export function estimerCoordination(b: Brut): Coordination {
  const conditionnements = new Map(b.conditionnements.map((c) => [c.id, c]));
  const lignes: LigneCommandeClient[] = b.lignes.map((l) => {
    const c = conditionnements.get(l.conditionnement_id);
    return {
      commandeId: l.commande_id,
      conditionnementId: l.conditionnement_id,
      paquetsRestants: Number(l.paquets_restants),
      numero: l.numero,
      datePiece: l.date_piece,
      clientNom: l.client_nom,
      commercialId: l.commercial_id,
      commercialNom: l.commercial_nom,
      produit: c?.produit ?? "",
      conditionnement: c?.libelle ?? "",
      paquetsParColis: c?.paquets_par_colis ?? 1,
    };
  });
  const cadenceProduit = new Map(b.cadences.map((x) => [x.produit_id, Number(x.paquets_jour)]));
  const estimations = planifierCommandes(
    lignes,
    {
      stock: new Map(b.stocks.map((s) => [s.conditionnement_id, Number(s.paquets)])),
      rythmeReel: new Map(b.rythmes.map((r) => [r.conditionnement_id, Number(r.paquets_jour)])),
      rythmeTheorique: new Map(b.conditionnements.map((c) => [c.id, cadenceProduit.get(c.produit_id) ?? 0])),
      ordres: b.ordres.map((o) => ({ numero: o.numero, conditionnementId: o.conditionnement_id, dateFinPrevue: o.date_fin_prevue, paquetsRestants: Number(o.paquets_restants) })),
    },
    b.jour,
    Number(b.delai_livraison_jours),
  );

  const parCommande = new Map<string, EstimationLigne<LigneCommandeClient>[]>();
  for (const e of estimations) parCommande.set(e.ligne.commandeId, [...(parCommande.get(e.ligne.commandeId) ?? []), e]);
  const commandes: CommandeAServir[] = [...parCommande.entries()].map(([id, ls]) => {
    const l0 = ls[0].ligne;
    return { id, numero: l0.numero, datePiece: l0.datePiece, clientNom: l0.clientNom, commercialNom: l0.commercialNom, lignes: ls, ...etatCommande(ls) };
  });

  const besoins = new Map<string, BesoinProduction>();
  for (const e of estimations) {
    if (e.paquetsAProduire <= 0) continue;
    const l = e.ligne;
    const x = besoins.get(l.conditionnementId) ?? {
      conditionnementId: l.conditionnementId,
      produit: l.produit,
      conditionnement: l.conditionnement,
      paquetsParColis: l.paquetsParColis,
      paquetsAProduire: 0,
      stock: Number(b.stocks.find((s) => s.conditionnement_id === l.conditionnementId)?.paquets ?? 0),
      commandes: 0,
      depuis: l.datePiece,
    };
    x.paquetsAProduire += e.paquetsAProduire;
    x.commandes += 1;
    if (l.datePiece < x.depuis) x.depuis = l.datePiece;
    besoins.set(l.conditionnementId, x);
  }
  return { jour: b.jour, delaiLivraisonJours: Number(b.delai_livraison_jours), joursReference: Number(b.jours_reference), commandes, besoins: [...besoins.values()] };
}
