/**
 * Calculs commerciaux : montant en lettres (factures), DSO (délai moyen de paiement), prix moyen.
 */
import { ErreurMontant, verifierMontantEntier } from "./devises";

const UNITES = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize"];
const DIZAINES = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante", "quatre-vingt", "quatre-vingt"];

/** 0 à 99, orthographe rectifiée (traits d'union partout). */
function moinsDeCent(n: number): string {
  if (n <= 16) return UNITES[n];
  if (n < 20) return `dix-${UNITES[n - 10]}`;
  const d = Math.floor(n / 10);
  let u = n % 10;
  if (d === 7 || d === 9) u += 10; // soixante-dix, quatre-vingt-dix
  const base = DIZAINES[d];
  if (u === 0) return d === 8 ? "quatre-vingts" : base;
  if ((u === 1 || u === 11) && d !== 8 && d !== 9) return `${base}-et-${UNITES[u]}`;
  return `${base}-${moinsDeCent(u)}`;
}

/** 0 à 999. « cent » prend un s s'il est multiplié et termine le nombre (deux-cents, mais deux-cent-un). */
function moinsDeMille(n: number, final: boolean): string {
  const c = Math.floor(n / 100);
  const r = n % 100;
  const parties: string[] = [];
  if (c === 1) parties.push("cent");
  else if (c > 1) parties.push(`${UNITES[c]}-cent${r === 0 && final ? "s" : ""}`);
  if (r > 0 || c === 0) {
    const texte = moinsDeCent(r);
    parties.push(!final && r === 80 ? "quatre-vingt" : texte);
  }
  return parties.join("-");
}

/**
 * Montant entier en toutes lettres (orthographe rectifiée de 1990), ex. 20 060 000 →
 * « vingt-millions-soixante-mille ». Utilisé sur les factures : « Arrêtée à la somme de … francs guinéens ».
 */
export function nombreEnLettres(n: number): string {
  verifierMontantEntier(n, "Montant");
  if (n < 0) return `moins-${nombreEnLettres(-n)}`;
  if (n === 0) return "zéro";
  const echelles: [number, string, string][] = [
    [1_000_000_000_000, "billion", "billions"],
    [1_000_000_000, "milliard", "milliards"],
    [1_000_000, "million", "millions"],
  ];
  const parties: string[] = [];
  let reste = n;
  for (const [valeur, sing, plur] of echelles) {
    const q = Math.floor(reste / valeur);
    if (q > 0) {
      parties.push(`${q === 1 ? "un" : nombreEnLettres(q)}-${q === 1 ? sing : plur}`);
      reste %= valeur;
    }
  }
  const milliers = Math.floor(reste / 1000);
  const unites = reste % 1000;
  if (milliers > 0) parties.push(milliers === 1 ? "mille" : `${moinsDeMille(milliers, false)}-mille`);
  if (unites > 0) parties.push(moinsDeMille(unites, true));
  return parties.join("-");
}

/** « Vingt-millions-soixante-mille francs guinéens » (majuscule initiale). */
export function montantEnLettresGnf(montant: number): string {
  const t = nombreEnLettres(montant);
  return `${t.charAt(0).toUpperCase()}${t.slice(1)} franc${montant > 1 ? "s" : ""} guinéen${montant > 1 ? "s" : ""}`;
}

/**
 * DSO (délai moyen de paiement des clients, en jours) = créances clients ÷ chiffre d'affaires TTC de la période × nombre de jours.
 * Null si aucun chiffre d'affaires.
 */
export function calculerDso(creancesGnf: number, caTtcPeriodeGnf: number, nbJours: number): number | null {
  if (creancesGnf < 0 || caTtcPeriodeGnf < 0 || nbJours <= 0) throw new ErreurMontant("Valeurs invalides pour le DSO.");
  if (caTtcPeriodeGnf === 0) return null;
  return (creancesGnf / caTtcPeriodeGnf) * nbJours;
}

/** Prix moyen HT au paquet sur une période (GNF, arrondi). */
export function prixMoyenPaquet(caHtGnf: number, paquets: number): number | null {
  return paquets > 0 ? Math.round(caHtGnf / paquets) : null;
}
