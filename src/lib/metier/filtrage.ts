/**
 * Filtres « gamme » et « commercial » appliqués aux pièces de vente (fonctions pures, testées).
 * - Commercial d'une pièce : celui de la pièce, sinon celui du client (pièces saisies au bureau).
 * - Gamme : on ne garde que les lignes du produit ; un montant global de la pièce (TTC, paiement)
 *   est réparti au prorata du HT des lignes retenues.
 */
import type { FiltresAnalyse } from "@/lib/formulaires/filtres-analyse";

export interface PieceFiltrable {
  commercialId: string | null;
  clientCommercialId: string | null;
  lignes: { produitId: string | null; montantHtGnf: number }[];
}

export function commercialDe(p: Pick<PieceFiltrable, "commercialId" | "clientCommercialId">): string | null {
  return p.commercialId ?? p.clientCommercialId;
}

/** La pièce passe-t-elle le filtre commercial (et contient-elle la gamme demandée) ? */
export function pieceRetenue(p: PieceFiltrable, f: FiltresAnalyse): boolean {
  if (f.commercial && commercialDe(p) !== f.commercial) return false;
  return !f.produit || p.lignes.some((l) => l.produitId === f.produit);
}

/** Lignes retenues par le filtre gamme. */
export function lignesRetenues<L extends { produitId: string | null }>(lignes: L[], f: FiltresAnalyse): L[] {
  return f.produit ? lignes.filter((l) => l.produitId === f.produit) : lignes;
}

/**
 * Part (0 à 1) d'un montant global de la pièce qui revient au filtre : 0 si la pièce est écartée,
 * 1 sans filtre gamme, sinon HT des lignes de la gamme ÷ HT de la pièce.
 */
export function partRetenue(p: PieceFiltrable, f: FiltresAnalyse): number {
  if (!pieceRetenue(p, f)) return 0;
  if (!f.produit) return 1;
  const total = p.lignes.reduce((s, l) => s + l.montantHtGnf, 0);
  const gamme = lignesRetenues(p.lignes, f).reduce((s, l) => s + l.montantHtGnf, 0);
  return total > 0 ? gamme / total : 0;
}

/**
 * Coût matière des ventes d'un commercial (estimation) : les sorties de stock ne portent pas le commercial,
 * on prend donc, gamme par gamme, le coût moyen d'un paquet sorti sur la période (ventes + dotations − retours)
 * multiplié par les paquets facturés par ce commercial.
 */
export function coutEstimeParGamme(
  sorties: { gamme: string; coutGnf: number; paquets: number }[],
  paquetsVendus: { gamme: string; paquets: number }[],
): number {
  const parGamme = new Map<string, { cout: number; paquets: number }>();
  for (const s of sorties) {
    const e = parGamme.get(s.gamme) ?? { cout: 0, paquets: 0 };
    parGamme.set(s.gamme, { cout: e.cout + s.coutGnf, paquets: e.paquets + s.paquets });
  }
  return Math.round(
    paquetsVendus.reduce((total, v) => {
      const g = parGamme.get(v.gamme);
      return g && g.paquets > 0 ? total + (v.paquets * g.cout) / g.paquets : total;
    }, 0),
  );
}
