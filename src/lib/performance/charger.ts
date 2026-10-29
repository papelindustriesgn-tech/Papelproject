/**
 * Chargement des indicateurs de performance (coûts de l'usine, OTIF) depuis les fonctions SQL dédiées,
 * puis calcul par les fonctions pures de `src/lib/metier/performance.ts`.
 * Une requête en échec lève une erreur (page « Réessayer ») : jamais un coût ou un taux à zéro trompeur.
 */
import { exigerDonnees } from "@/lib/donnees/resultat";
import { coutCompletParPaquet, coutEnergieParTonne, indicateursLivraison, type CommandeAEcheance, type CoutParPaquet, type IndicateursLivraison } from "@/lib/metier/performance";
import { clientServeur } from "@/lib/supabase/serveur";

export interface CoutsUsine {
  energieGnf: number;
  /** Charges fixes et variables de la période (factures fournisseurs, hors achats stockés et investissements). */
  chargesGnf: number;
  papierKg: number;
  paquets: number;
  energieParTonne: number | null;
  parPaquet: CoutParPaquet | null;
}

export async function chargerCoutsUsine(du: string, au: string): Promise<CoutsUsine> {
  const supabase = await clientServeur();
  const brut = (exigerDonnees(await supabase.rpc("indicateurs_couts", { p_du: du, p_au: au }), "les coûts de production") ?? {}) as Record<string, unknown>;
  const n = (v: unknown) => Number(v ?? 0);
  const energieGnf = n(brut.energie_gnf);
  const papierKg = n(brut.papier_kg);
  const paquets = n(brut.paquets);
  return {
    energieGnf,
    chargesGnf: n(brut.charges_gnf),
    papierKg,
    paquets,
    energieParTonne: coutEnergieParTonne(energieGnf, papierKg),
    parPaquet: coutCompletParPaquet(n(brut.matiere_gnf), n(brut.charges_gnf), paquets),
  };
}

export async function chargerIndicateursLivraison(du: string, au: string): Promise<IndicateursLivraison & { delaiPromisJours: number }> {
  const supabase = await clientServeur();
  const brut = (exigerDonnees(await supabase.rpc("indicateurs_livraison", { p_du: du, p_au: au }), "les délais de livraison") ?? {}) as {
    delai_promis_jours?: number;
    commandes?: { date_piece: string; date_promise: string; paquets_commandes: number; remises: { date: string; paquets: number }[] }[];
  };
  const commandes: CommandeAEcheance[] = (brut.commandes ?? []).map((c) => ({
    datePiece: c.date_piece,
    datePromise: c.date_promise,
    paquetsCommandes: Number(c.paquets_commandes),
    remises: (c.remises ?? []).map((r) => ({ date: r.date, paquets: Number(r.paquets) })),
  }));
  return { ...indicateursLivraison(commandes), delaiPromisJours: Number(brut.delai_promis_jours ?? 0) };
}
