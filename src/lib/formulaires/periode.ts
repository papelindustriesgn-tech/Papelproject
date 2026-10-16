/**
 * Périodes d'analyse (jour, semaine du lundi, mois, trimestre, année, personnalisée) et période précédente
 * de même durée pour les comparaisons. Dates AAAA-MM-JJ (date métier Africa/Conakry).
 */
export type CodePeriode = "jour" | "semaine" | "7j" | "30j" | "mois" | "trimestre" | "annee" | "perso";

export const PERIODES: { code: CodePeriode; libelle: string }[] = [
  { code: "jour", libelle: "Aujourd'hui" },
  { code: "semaine", libelle: "Cette semaine" },
  { code: "7j", libelle: "7 derniers jours" },
  { code: "30j", libelle: "30 derniers jours" },
  { code: "mois", libelle: "Ce mois" },
  { code: "trimestre", libelle: "Ce trimestre" },
  { code: "annee", libelle: "Cette année" },
  { code: "perso", libelle: "Période personnalisée" },
];

export interface Periode {
  code: CodePeriode;
  du: string;
  au: string;
  /** Période précédente de même durée (comparaison). */
  precedente: { du: string; au: string };
  nbJours: number;
}

const versDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const versIso = (d: Date) => d.toISOString().slice(0, 10);
const ajouterJours = (iso: string, n: number) => {
  const d = versDate(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return versIso(d);
};
const ecartJours = (du: string, au: string) => Math.round((versDate(au).getTime() - versDate(du).getTime()) / 86_400_000) + 1;
const iso = /^\d{4}-\d{2}-\d{2}$/;

/** Calcule la période demandée par rapport à « aujourd'hui » (passé en paramètre pour les tests). */
export function resoudrePeriode(code: string | undefined, aujourdhui: string, du?: string, au?: string): Periode {
  const c = (PERIODES.some((p) => p.code === code) ? code : "30j") as CodePeriode;
  let debut: string;
  let fin = aujourdhui;
  const [a, m] = aujourdhui.split("-").map(Number);
  switch (c) {
    case "jour":
      debut = aujourdhui;
      break;
    case "semaine": {
      // Semaine en cours, du lundi à aujourd'hui (0 = dimanche → 6 jours depuis lundi).
      const jourSemaine = versDate(aujourdhui).getUTCDay();
      debut = ajouterJours(aujourdhui, -((jourSemaine + 6) % 7));
      break;
    }
    case "7j":
      debut = ajouterJours(aujourdhui, -6);
      break;
    case "mois":
      debut = `${a}-${String(m).padStart(2, "0")}-01`;
      break;
    case "trimestre":
      debut = `${a}-${String(Math.floor((m - 1) / 3) * 3 + 1).padStart(2, "0")}-01`;
      break;
    case "annee":
      debut = `${a}-01-01`;
      break;
    case "perso":
      if (du && au && iso.test(du) && iso.test(au) && du <= au) {
        debut = du;
        fin = au;
      } else debut = ajouterJours(aujourdhui, -29);
      break;
    default:
      debut = ajouterJours(aujourdhui, -29);
  }
  const nbJours = ecartJours(debut, fin);
  // Semaine : on compare aux mêmes jours de la semaine précédente (lundi → même jour).
  const precedente =
    c === "semaine" ? { du: ajouterJours(debut, -7), au: ajouterJours(fin, -7) } : { du: ajouterJours(debut, -nbJours), au: ajouterJours(debut, -1) };
  return { code: c, du: debut, au: fin, nbJours, precedente };
}

/** Liste des jours d'une période (pour les graphiques jour par jour). */
export function joursDeLaPeriode(p: { du: string; au: string }): string[] {
  const jours: string[] = [];
  for (let d = p.du; d <= p.au; d = ajouterJours(d, 1)) jours.push(d);
  return jours;
}

export interface PointSerie {
  /** Premier jour du regroupement (AAAA-MM-JJ). */
  date: string;
  valeur: number | null;
  /** Étiquette courte de l'axe (« 05/10 », « oct. 26 »). */
  axe: string;
  /** Étiquette de l'infobulle (« Le 05/10 », « Semaine du 05/10 », « Octobre 2026 »). */
  libelle: string;
}

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const MOIS_LONGS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const jjmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/**
 * Série d'une courbe de période, regroupée pour rester lisible : par jour jusqu'à 5 semaines,
 * par semaine (du lundi) jusqu'à 3 mois, par mois au-delà. Les valeurs d'un groupe s'additionnent
 * (à n'utiliser que pour des quantités : CA, paquets…, jamais pour des taux) ; un groupe sans aucune valeur reste vide.
 */
export function serieRegroupee(p: { du: string; au: string }, valeurDuJour: (jour: string) => number | null): PointSerie[] {
  const jours = joursDeLaPeriode(p);
  const pas = jours.length > 92 ? "mois" : jours.length > 35 ? "semaine" : "jour";
  const groupes = new Map<string, PointSerie>();
  for (const j of jours) {
    let cle = j;
    let axe = jjmm(j);
    let libelle = `Le ${jjmm(j)}`;
    if (pas === "semaine") {
      cle = ajouterJours(j, -((versDate(j).getUTCDay() + 6) % 7));
      axe = jjmm(cle);
      libelle = `Semaine du ${jjmm(cle)}`;
    } else if (pas === "mois") {
      cle = `${j.slice(0, 7)}-01`;
      const m = Number(j.slice(5, 7)) - 1;
      axe = `${MOIS[m]} ${j.slice(2, 4)}`;
      libelle = `${MOIS_LONGS[m]} ${j.slice(0, 4)}`;
    }
    const g = groupes.get(cle) ?? { date: cle, valeur: null, axe, libelle };
    const v = valeurDuJour(j);
    if (v !== null) g.valeur = (g.valeur ?? 0) + v;
    groupes.set(cle, g);
  }
  return [...groupes.values()];
}
