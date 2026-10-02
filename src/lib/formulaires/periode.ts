/**
 * Périodes d'analyse (jour, semaine, mois, trimestre, année, personnalisée) et période précédente
 * de même durée pour les comparaisons. Dates AAAA-MM-JJ (date métier Africa/Conakry).
 */
export type CodePeriode = "jour" | "7j" | "30j" | "mois" | "trimestre" | "annee" | "perso";

export const PERIODES: { code: CodePeriode; libelle: string }[] = [
  { code: "jour", libelle: "Aujourd'hui" },
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
  return { code: c, du: debut, au: fin, nbJours, precedente: { du: ajouterJours(debut, -nbJours), au: ajouterJours(debut, -1) } };
}

/** Liste des jours d'une période (pour les graphiques jour par jour). */
export function joursDeLaPeriode(p: { du: string; au: string }): string[] {
  const jours: string[] = [];
  for (let d = p.du; d <= p.au; d = ajouterJours(d, 1)) jours.push(d);
  return jours;
}
