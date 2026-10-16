/**
 * Coordination ventes → magasin → production → livraison (fonctions pures, testées).
 * Les commandes clients validées non encore livrées sont servies dans l'ordre d'arrivée (la plus ancienne d'abord) :
 * 1. le stock de produits finis de leur conditionnement leur est réservé tant qu'il en reste ;
 * 2. le manque est à produire : sa date de disponibilité est estimée avec, dans l'ordre de préférence,
 *    le rythme réel de production (paquets/jour des derniers jours), les ordres de fabrication en cours
 *    (date de fin prévue), puis la cadence nominale de la ligne (théorique) ;
 * 3. la livraison est estimée à la date de disponibilité + le délai de livraison (paramètre).
 * Toutes les quantités sont en paquets (unité de stockage des produits finis).
 */

export interface LigneACommander {
  commandeId: string;
  conditionnementId: string;
  paquetsRestants: number;
}

export interface OrdreEnCours {
  numero: string;
  conditionnementId: string;
  paquetsRestants: number;
  /** AAAA-MM-JJ */
  dateFinPrevue: string;
}

export interface Approvisionnement {
  /** Stock de produits finis par conditionnement (paquets). */
  stock: Map<string, number>;
  /** Rythme réel de production par conditionnement (paquets par jour, derniers jours). */
  rythmeReel: Map<string, number>;
  /** Cadence théorique par conditionnement (paquets par jour), à défaut d'historique. */
  rythmeTheorique: Map<string, number>;
  ordres: OrdreEnCours[];
}

export type SourceEstimation = "stock" | "rythme" | "ordre" | "cadence" | "inconnue";

export interface EstimationLigne<L extends LigneACommander = LigneACommander> {
  ligne: L;
  /** Paquets réservés sur le stock actuel. */
  paquetsEnStock: number;
  /** Paquets qui restent à produire pour cette ligne. */
  paquetsAProduire: number;
  /** Jour où toute la ligne est disponible à l'usine ; null si impossible à estimer (rien de planifié). */
  datePrete: string | null;
  dateLivraison: string | null;
  source: SourceEstimation;
  /** Ordre de fabrication qui couvre le manque (source « ordre »). */
  ordre?: string;
}

const ajouterJours = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Estime chaque ligne de commande, dans l'ordre donné (le plus ancien d'abord). */
export function planifierCommandes<L extends LigneACommander>(lignes: L[], appro: Approvisionnement, aujourdhui: string, delaiLivraisonJours: number): EstimationLigne<L>[] {
  const stock = new Map(appro.stock);
  // Manque cumulé par conditionnement : une commande plus récente passe après les précédentes.
  const manqueCumule = new Map<string, number>();
  const ordresParConditionnement = new Map<string, OrdreEnCours[]>();
  for (const o of [...appro.ordres].sort((a, b) => a.dateFinPrevue.localeCompare(b.dateFinPrevue)))
    if (o.paquetsRestants > 0) ordresParConditionnement.set(o.conditionnementId, [...(ordresParConditionnement.get(o.conditionnementId) ?? []), o]);

  return lignes.map((ligne) => {
    const c = ligne.conditionnementId;
    const disponible = Math.max(0, stock.get(c) ?? 0);
    const enStock = Math.min(disponible, ligne.paquetsRestants);
    stock.set(c, disponible - enStock);
    const aProduire = ligne.paquetsRestants - enStock;
    if (aProduire === 0) return { ligne, paquetsEnStock: enStock, paquetsAProduire: 0, datePrete: aujourdhui, dateLivraison: ajouterJours(aujourdhui, delaiLivraisonJours), source: "stock" };

    const cumul = (manqueCumule.get(c) ?? 0) + aProduire;
    manqueCumule.set(c, cumul);
    let datePrete: string | null = null;
    let source: SourceEstimation = "inconnue";
    let ordre: string | undefined;
    const reel = appro.rythmeReel.get(c) ?? 0;
    if (reel > 0) {
      datePrete = ajouterJours(aujourdhui, Math.ceil(cumul / reel));
      source = "rythme";
    } else {
      // Ordres de fabrication : le manque cumulé est couvert par les premiers ordres (date de fin prévue).
      let couvert = 0;
      for (const o of ordresParConditionnement.get(c) ?? []) {
        couvert += o.paquetsRestants;
        if (couvert >= cumul) {
          datePrete = o.dateFinPrevue < aujourdhui ? aujourdhui : o.dateFinPrevue;
          source = "ordre";
          ordre = o.numero;
          break;
        }
      }
      const theorique = appro.rythmeTheorique.get(c) ?? 0;
      if (!datePrete && theorique > 0) {
        datePrete = ajouterJours(aujourdhui, Math.ceil(cumul / theorique));
        source = "cadence";
      }
    }
    return { ligne, paquetsEnStock: enStock, paquetsAProduire: aProduire, datePrete, dateLivraison: datePrete ? ajouterJours(datePrete, delaiLivraisonJours) : null, source, ...(ordre ? { ordre } : {}) };
  });
}

export type EtatCommande = "en_stock" | "partielle" | "a_produire";

/** État d'une commande à partir de ses lignes estimées, et date de livraison estimée (la plus tardive). */
export function etatCommande(lignes: Pick<EstimationLigne, "paquetsEnStock" | "paquetsAProduire" | "dateLivraison">[]): { etat: EtatCommande; dateLivraison: string | null } {
  const aProduire = lignes.some((l) => l.paquetsAProduire > 0);
  const enStock = lignes.some((l) => l.paquetsEnStock > 0);
  const dates = lignes.map((l) => l.dateLivraison);
  return {
    etat: !aProduire ? "en_stock" : enStock ? "partielle" : "a_produire",
    dateLivraison: dates.some((d) => d === null) ? null : (dates as string[]).sort().at(-1) ?? null,
  };
}
