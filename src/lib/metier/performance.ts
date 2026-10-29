/**
 * Indicateurs de performance de l'usine et des livraisons (fonctions pures, testées) :
 * coût de l'énergie par tonne de papier, coût complet par paquet, OTIF et délai commande → livraison.
 * Les données brutes viennent des fonctions SQL `indicateurs_couts` et `indicateurs_livraison`.
 */

const JOUR_MS = 86_400_000;
const jours = (de: string, a: string) => Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / JOUR_MS);

/** Coût de l'énergie (électricité, carburant…) par tonne de papier transformé, en GNF ; null sans papier consommé. */
export function coutEnergieParTonne(energieGnf: number, papierKg: number): number | null {
  if (papierKg <= 0) return null;
  return Math.round(energieGnf / (papierKg / 1000));
}

export interface CoutParPaquet {
  /** Coût complet : matière + charges de la période, par paquet produit. */
  totalGnf: number;
  matiereGnf: number;
  chargesGnf: number;
}

/**
 * Coût complet par paquet produit = (coût matière des fiches validées + charges fixes et variables de la période) ÷ paquets.
 * Les achats stockés n'y entrent pas directement : ils sont déjà dans le coût matière quand le papier est consommé.
 */
export function coutCompletParPaquet(matiereGnf: number, chargesGnf: number, paquets: number): CoutParPaquet | null {
  if (paquets <= 0) return null;
  const matiere = matiereGnf / paquets;
  const charges = chargesGnf / paquets;
  return { totalGnf: Math.round(matiere + charges), matiereGnf: Math.round(matiere), chargesGnf: Math.round(charges) };
}

export interface CommandeAEcheance {
  /** Date de la commande (AAAA-MM-JJ). */
  datePiece: string;
  /** Date de livraison promise au client (AAAA-MM-JJ). */
  datePromise: string;
  paquetsCommandes: number;
  /** Remises au client : date (AAAA-MM-JJ) et paquets réellement laissés chez lui (livrés − rapportés). */
  remises: { date: string; paquets: number }[];
}

export interface IndicateursLivraison {
  /** Commandes arrivées à échéance sur la période. */
  commandes: number;
  /** Livrées à temps ET complètes. */
  otifOk: number;
  /** OTIF = otifOk ÷ commandes ; null sans commande à échéance. */
  otif: number | null;
  /** Délai moyen commande → livraison complète (jours), sur les commandes entièrement livrées ; null sinon. */
  delaiMoyenJours: number | null;
  /** Commandes entièrement livrées (servant au délai moyen). */
  livreesCompletes: number;
}

/**
 * OTIF (« On Time In Full ») : une commande compte comme réussie si, à sa date promise, le client a reçu
 * tous les paquets commandés. Délai : du jour de la commande à la remise qui la complète.
 */
export function indicateursLivraison(commandes: CommandeAEcheance[]): IndicateursLivraison {
  let otifOk = 0;
  let sommeDelais = 0;
  let livreesCompletes = 0;
  for (const c of commandes) {
    const remises = [...c.remises].sort((a, b) => a.date.localeCompare(b.date));
    let cumul = 0;
    let dateComplete: string | null = null;
    for (const r of remises) {
      cumul += r.paquets;
      if (cumul >= c.paquetsCommandes) {
        dateComplete = r.date;
        break;
      }
    }
    if (dateComplete !== null) {
      livreesCompletes++;
      sommeDelais += Math.max(0, jours(c.datePiece, dateComplete));
      if (dateComplete <= c.datePromise) otifOk++;
    }
  }
  return {
    commandes: commandes.length,
    otifOk,
    otif: commandes.length ? otifOk / commandes.length : null,
    delaiMoyenJours: livreesCompletes ? Math.round((sommeDelais / livreesCompletes) * 10) / 10 : null,
    livreesCompletes,
  };
}
