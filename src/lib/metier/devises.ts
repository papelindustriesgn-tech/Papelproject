/**
 * Monnaies : GNF (devise principale, sans décimale) et USD (stocké en CENTIMES).
 * Jamais de nombre à virgule pour l'argent : tous les montants sont des entiers.
 * Le taux de change utilisé est celui de la DATE DE L'OPÉRATION, enregistré sur l'opération.
 */

export type Devise = "GNF" | "USD";

/** Taux par défaut (modifiable dans Admin) : 1 USD = 9 450 GNF. */
export const TAUX_USD_GNF_DEFAUT = 9450;

export class ErreurMontant extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErreurMontant";
  }
}

/** Vérifie qu'un montant est un entier sûr (GNF, ou centimes d'USD). */
export function verifierMontantEntier(montant: number, libelle = "Montant"): void {
  if (!Number.isSafeInteger(montant)) {
    throw new ErreurMontant(`${libelle} : un montant entier est attendu (GNF sans décimale, USD en centimes).`);
  }
}

function verifierTaux(taux: number): void {
  if (!Number.isFinite(taux) || taux <= 0) throw new ErreurMontant("Taux de change invalide : il doit être supérieur à zéro.");
}

/** Arrondi commercial au GNF le plus proche (0,5 → vers le haut, symétrique pour les négatifs). */
export function arrondirGnf(valeur: number): number {
  return Math.sign(valeur) * Math.round(Math.abs(valeur));
}

/** Convertit des centimes d'USD en GNF au taux donné (GNF pour 1 USD). */
export function usdCentimesVersGnf(centimes: number, tauxGnfParUsd: number): number {
  verifierMontantEntier(centimes, "Montant USD (centimes)");
  verifierTaux(tauxGnfParUsd);
  return arrondirGnf((centimes * tauxGnfParUsd) / 100);
}

/** Convertit des GNF en centimes d'USD au taux donné. */
export function gnfVersUsdCentimes(gnf: number, tauxGnfParUsd: number): number {
  verifierMontantEntier(gnf, "Montant GNF");
  verifierTaux(tauxGnfParUsd);
  return arrondirGnf((gnf * 100) / tauxGnfParUsd);
}

/** Montant d'une opération, avec le taux figé à la date de l'opération. */
export interface MontantOperation {
  devise: Devise;
  /** En GNF, ou en centimes si USD. */
  montant: number;
  /** GNF pour 1 unité de la devise (1 pour le GNF). */
  tauxChange: number;
}

/** Contre-valeur en GNF d'une opération (pour les totaux et les KPI). */
export function montantEnGnf(op: MontantOperation): number {
  if (op.devise === "GNF") {
    verifierMontantEntier(op.montant, "Montant GNF");
    return op.montant;
  }
  return usdCentimesVersGnf(op.montant, op.tauxChange);
}

/**
 * Trouve le taux applicable à une date : le dernier taux saisi à cette date ou avant.
 * Les dates sont au format AAAA-MM-JJ (date métier Africa/Conakry).
 */
export function tauxALaDate(historique: { date: string; taux: number }[], date: string, tauxDefaut = TAUX_USD_GNF_DEFAUT): number {
  let retenu: { date: string; taux: number } | undefined;
  for (const t of historique) {
    if (t.date <= date && (!retenu || t.date > retenu.date)) retenu = t;
  }
  return retenu?.taux ?? tauxDefaut;
}

const formatGnf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const formatUsd = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** « 175 000 GNF » ; USD : « 1 250,00 USD ». Espaces insécables normalisés en espaces simples. */
export function formaterMontant(montant: number, devise: Devise = "GNF"): string {
  const texte = devise === "GNF" ? `${formatGnf.format(montant)} GNF` : `${formatUsd.format(montant / 100)} USD`;
  return texte.replace(/[  ]/g, " ");
}
