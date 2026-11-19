/**
 * Fiabilité d'un chiffre affiché au PDG : on distingue toujours « aucune activité », « données à compléter »,
 * « indisponible » (lecture en échec), « estimé » et « validé ». Un chiffre douteux n'est jamais présenté
 * comme sûr ; un chiffre impossible à calculer n'est jamais remplacé par 0. Fonctions pures, testées.
 */

export type EtatDonnee = "valide" | "estime" | "non_renseigne" | "indisponible" | "aucune_activite";

export const LIBELLES_ETAT: Record<EtatDonnee, string> = {
  valide: "Validé",
  estime: "Estimé",
  non_renseigne: "Données à compléter",
  indisponible: "Indisponible",
  aucune_activite: "Aucune activité",
};

const jours = (de: string, a: string) => Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86_400_000);

/**
 * Trésorerie : validée quand chaque compte a été vérifié (caisse comptée, relevé lu) depuis moins de `joursMax` jours ;
 * sinon c'est le solde calculé par l'ERP, présenté comme estimé. `derniere` = la plus ancienne des dernières vérifications
 * (le compte le moins bien suivi), null si au moins un compte n'a jamais été vérifié.
 */
export function etatTresorerie(verifications: { date: string | null }[], aujourdhui: string, joursMax = 7): { etat: EtatDonnee; derniere: string | null; jamais: number; enRetard: number } {
  if (!verifications.length) return { etat: "non_renseigne", derniere: null, jamais: 0, enRetard: 0 };
  const jamais = verifications.filter((v) => !v.date).length;
  const dates = verifications.map((v) => v.date).filter((d): d is string => !!d);
  const enRetard = dates.filter((d) => jours(d, aujourdhui) > joursMax).length;
  const derniere = jamais ? null : dates.sort()[0];
  return { etat: jamais === 0 && enRetard === 0 ? "valide" : "estime", derniere, jamais, enRetard };
}

/**
 * Marge : affichée seulement si le coût des paquets vendus est connu. Un paquet sorti à un coût nul (stock initial
 * sans coût, produit acheté reçu sans prix) gonflerait la marge : au-delà de `partMax` des paquets vendus sans coût,
 * la marge n'est pas affichée. Sans vente : aucune activité.
 */
export function margeAffichable(paquetsVendus: number, paquetsSansCout: number, partMax = 0.05): { etat: EtatDonnee; partSansCout: number | null } {
  if (paquetsVendus <= 0) return { etat: "aucune_activite", partSansCout: null };
  const part = Math.max(0, paquetsSansCout) / paquetsVendus;
  return { etat: part > partMax ? "non_renseigne" : part > 0 ? "estime" : "valide", partSansCout: part };
}

/** Production : ne rien afficher (ni alerte) tant que l'usine n'a jamais validé de saisie de production. */
export function etatProduction(fichesPeriode: number, fichesDepuisToujours: number): "pas_demarree" | "aucune_sur_periode" | "active" {
  if (fichesDepuisToujours <= 0) return "pas_demarree";
  return fichesPeriode > 0 ? "active" : "aucune_sur_periode";
}
