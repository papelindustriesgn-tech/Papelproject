/**
 * Avoirs : lecture de l'analyse calculée par la base (`analyser_avoir`, même calcul que la validation) et
 * phrases expliquant les conséquences d'une validation sur le solde du client et sur le stock.
 */
import { gnf, nombre } from "@/lib/stocks/libelles";

export interface LigneAnalyseAvoir {
  ligne_id: string;
  conditionnement_id: string;
  paquets: number;
  /** Paquets encore créditables sur la ligne de facture (avant cet avoir). */
  max_creditable: number;
  /** Paquets déjà revenus en stock à la livraison, rattachés d'office (aucune nouvelle entrée). */
  retour_livraison: number;
  /** Paquets saisis comme revenant à l'usine à la validation (nouvelle entrée en stock). */
  retour_stock: number;
  /** Plafond du retour en stock pour cette ligne (ce que le client détient encore). */
  retour_stock_max: number;
}

export interface AnalyseAvoir {
  facture_id?: string;
  facture_numero?: string | null;
  commande_id?: string | null;
  lignes: LigneAnalyseAvoir[];
  erreurs: string[];
  total_ttc_gnf?: number;
  reste_du_avant_gnf?: number;
  credit_client_avant_gnf?: number;
  reduction_creance_gnf?: number;
  credit_client_gnf?: number;
  paquets_retour_stock?: number;
  paquets_deja_revenus?: number;
}

/** Normalise la réponse JSON de la base (nombres éventuellement en texte, champs absents). */
export function lireAnalyseAvoir(brut: unknown): AnalyseAvoir {
  const o = (brut ?? {}) as Record<string, unknown>;
  const n = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));
  return {
    facture_id: o.facture_id as string | undefined,
    facture_numero: (o.facture_numero as string | null | undefined) ?? null,
    commande_id: (o.commande_id as string | null | undefined) ?? null,
    lignes: ((o.lignes as Record<string, unknown>[] | undefined) ?? []).map((l) => ({
      ligne_id: String(l.ligne_id),
      conditionnement_id: String(l.conditionnement_id),
      paquets: n(l.paquets),
      max_creditable: n(l.max_creditable),
      retour_livraison: n(l.retour_livraison),
      retour_stock: n(l.retour_stock),
      retour_stock_max: n(l.retour_stock_max),
    })),
    erreurs: ((o.erreurs as unknown[] | undefined) ?? []).map(String),
    total_ttc_gnf: n(o.total_ttc_gnf),
    reste_du_avant_gnf: n(o.reste_du_avant_gnf),
    credit_client_avant_gnf: n(o.credit_client_avant_gnf),
    reduction_creance_gnf: n(o.reduction_creance_gnf),
    credit_client_gnf: n(o.credit_client_gnf),
    paquets_retour_stock: n(o.paquets_retour_stock),
    paquets_deja_revenus: n(o.paquets_deja_revenus),
  };
}

/** Conséquences d'un avoir sur le solde du client et le stock, en phrases simples (aperçu ou avoir validé). */
export function consequencesAvoir(a: {
  totalTtcGnf: number;
  reductionCreanceGnf: number;
  creditClientGnf: number;
  paquetsRetourStock: number;
  paquetsDejaRevenus: number;
  factureNumero?: string | null;
}): string[] {
  const facture = a.factureNumero ? `de la facture ${a.factureNumero}` : "de la facture";
  const phrases: string[] = [];
  if (a.reductionCreanceGnf > 0) phrases.push(`Le reste à payer ${facture} diminue de ${gnf(a.reductionCreanceGnf)}.`);
  if (a.creditClientGnf > 0) {
    phrases.push(
      `${gnf(a.creditClientGnf)} déjà payés deviennent un crédit en faveur du client : rien n'est remboursé automatiquement, le remboursement se saisit sur la facture.`,
    );
  }
  if (a.paquetsDejaRevenus > 0) {
    phrases.push(`${nombre(a.paquetsDejaRevenus)} paquets sont déjà revenus en stock lors de la livraison : aucune nouvelle entrée pour eux.`);
  }
  phrases.push(
    a.paquetsRetourStock > 0
      ? `${nombre(a.paquetsRetourStock)} paquets rapportés à l'usine entrent en stock (une seule fois).`
      : "Aucun paquet n'entre en stock avec cet avoir (avoir financier).",
  );
  if (a.totalTtcGnf <= 0) phrases.push("Montant nul : vérifiez les quantités.");
  return phrases;
}
