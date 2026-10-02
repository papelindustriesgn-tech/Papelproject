/**
 * Dotation des grossistes (et clients B2B si activé) :
 * X paquets offerts pour 100 achetés (4 % par défaut), du MÊME produit,
 * calculée UNIQUEMENT sur les montants ENCAISSÉS (jamais sur du facturé non payé).
 *
 * Méthode : on calcule la dotation CUMULÉE due au vu du total encaissé sur la facture,
 * puis on retranche ce qui a déjà été attribué. Ainsi des paiements partiels successifs
 * ne perdent ni ne doublent aucun paquet à cause des arrondis.
 */
import { ErreurMontant, verifierMontantEntier } from "./devises";
import { paquetsVersColis, type Conditionnement, type Paquets } from "./unites";

export const TAUX_DOTATION_DEFAUT = 0.04;

export interface LigneFacturePourDotation {
  produitId: string;
  paquets: Paquets;
  montantGnf: number;
}

export interface DotationProduit {
  produitId: string;
  /** Paquets dus au total, au vu du cumul encaissé. */
  paquetsDusCumules: Paquets;
  /** Paquets à attribuer maintenant (cumul dû − déjà attribué). */
  paquetsAAttribuer: Paquets;
}

/**
 * @param lignes lignes de la facture (produits éligibles uniquement)
 * @param encaisseCumuleGnf total déjà encaissé sur la facture, paiement en cours compris
 * @param dejaAttribue paquets de dotation déjà attribués par produit
 * @param taux taux de dotation (0,04 = 4 paquets pour 100)
 */
export function calculerDotation(
  lignes: LigneFacturePourDotation[],
  encaisseCumuleGnf: number,
  dejaAttribue: Record<string, number> = {},
  taux: number = TAUX_DOTATION_DEFAUT,
): DotationProduit[] {
  verifierMontantEntier(encaisseCumuleGnf, "Montant encaissé");
  if (encaisseCumuleGnf < 0) throw new ErreurMontant("Le montant encaissé ne peut pas être négatif.");
  if (!Number.isFinite(taux) || taux < 0 || taux > 1) throw new ErreurMontant("Taux de dotation invalide (entre 0 et 1).");

  const totalFacture = lignes.reduce((s, l) => s + l.montantGnf, 0);
  if (totalFacture <= 0) return [];
  // On ne peut pas encaisser plus que la facture pour le calcul de la dotation.
  const partPayee = Math.min(encaisseCumuleGnf, totalFacture) / totalFacture;

  // Regroupe par produit (une facture peut avoir plusieurs lignes d'un même produit).
  const paquetsParProduit = new Map<string, number>();
  for (const l of lignes) paquetsParProduit.set(l.produitId, (paquetsParProduit.get(l.produitId) ?? 0) + l.paquets);

  return [...paquetsParProduit.entries()].map(([produitId, paq]) => {
    // Petit epsilon pour neutraliser les erreurs d'arrondi binaire (ex. 0,04 × 2500 = 99,999…).
    const dus = Math.floor(paq * partPayee * taux + 1e-9);
    const deja = dejaAttribue[produitId] ?? 0;
    return {
      produitId,
      paquetsDusCumules: dus as Paquets,
      paquetsAAttribuer: Math.max(0, dus - deja) as Paquets,
    };
  });
}

/**
 * Remise physique de la dotation : en colis complets du conditionnement choisi,
 * le reste en paquets reste dû (reporté) jusqu'à former un colis.
 */
export function remiseDotationEnColis(paquetsDus: Paquets, c: Conditionnement) {
  return paquetsVersColis(paquetsDus, c);
}
