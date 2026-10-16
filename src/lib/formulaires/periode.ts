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

const MOIS_COURTS = ["Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."];
const MOIS_NOMS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const moisValide = /^\d{4}-(0[1-9]|1[0-2])$/;
/** Dernier jour d'un mois « AAAA-MM ». */
const finDuMois = (m: string) => ajouterJours(`${ajouterMois(m, 1)}-01`, -1);
/** Mois « AAAA-MM » décalé de n mois. */
function ajouterMois(m: string, n: number): string {
  const [a, mm] = m.split("-").map(Number);
  const total = a * 12 + (mm - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

/** Libellé d'un mois « AAAA-MM » : « Octobre 2026 ». */
export function libelleMois(m: string): string {
  return `${MOIS_NOMS[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;
}

/**
 * Les `n` derniers mois jusqu'au mois en cours (le plus récent d'abord), pour la liste déroulante des mois.
 * Libellés courts (« Sept. 2026 ») pour que la barre de période tienne sur un téléphone.
 */
export function listeMois(aujourdhui: string, n = 24): { valeur: string; libelle: string }[] {
  const courant = aujourdhui.slice(0, 7);
  return Array.from({ length: n }, (_, i) => {
    const m = ajouterMois(courant, -i);
    return { valeur: m, libelle: `${MOIS_COURTS[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}` };
  });
}

/** Lundi de la semaine d'un jour (0 = dimanche → 6 jours depuis lundi). */
const lundi = (j: string) => ajouterJours(j, -((versDate(j).getUTCDay() + 6) % 7));

/**
 * Les `n` dernières semaines (du lundi) jusqu'à la semaine en cours, la plus récente d'abord, pour la liste déroulante.
 * L'année n'est écrite que pour une semaine d'une autre année (« Sem. du 29/12/25 »).
 */
export function listeSemaines(aujourdhui: string, n = 26): { valeur: string; libelle: string }[] {
  const courante = lundi(aujourdhui);
  return Array.from({ length: n }, (_, i) => {
    const l = ajouterJours(courante, -7 * i);
    const annee = l.slice(0, 4) === aujourdhui.slice(0, 4) ? "" : `/${l.slice(2, 4)}`;
    return { valeur: l, libelle: i === 0 ? "Cette semaine" : `Sem. du ${l.slice(8, 10)}/${l.slice(5, 7)}${annee}` };
  });
}

/** Années proposées : de l'année en cours à `depuis` (début du projet). */
export function listeAnnees(aujourdhui: string, depuis = 2025): { valeur: string; libelle: string }[] {
  const courante = Number(aujourdhui.slice(0, 4));
  return Array.from({ length: Math.max(1, courante - depuis + 1) }, (_, i) => ({ valeur: String(courante - i), libelle: String(courante - i) }));
}

/** Jour, semaine ou année choisis dans le filtre de date (sinon : aujourd'hui, la semaine ou l'année en cours). */
export interface ChoixPeriode {
  /** Jour (« jour ») ou jour quelconque de la semaine voulue (« semaine »), AAAA-MM-JJ. */
  jour?: string;
  /** Année (« annee »), AAAA. */
  annee?: string;
}

/**
 * Calcule la période demandée par rapport à « aujourd'hui » (passé en paramètre pour les tests).
 * `mois` (« AAAA-MM », avec le code « mois ») choisit un mois dans la liste déroulante ; sans lui, le mois en cours.
 * `choix` choisit de même un jour, une semaine ou une année passés. Jamais de date dans le futur.
 */
export function resoudrePeriode(code: string | undefined, aujourdhui: string, du?: string, au?: string, mois?: string, choix: ChoixPeriode = {}): Periode {
  const c = (PERIODES.some((p) => p.code === code) ? code : "30j") as CodePeriode;
  let debut: string;
  let fin = aujourdhui;
  const [a, m] = aujourdhui.split("-").map(Number);
  const jourChoisi = choix.jour && iso.test(choix.jour) && choix.jour <= aujourdhui ? choix.jour : aujourdhui;
  const anneeChoisie = choix.annee && /^\d{4}$/.test(choix.annee) && Number(choix.annee) <= a ? Number(choix.annee) : a;
  switch (c) {
    case "jour":
      debut = fin = jourChoisi;
      break;
    case "semaine": {
      // Semaine du lundi, complète si elle est passée, sinon jusqu'à aujourd'hui.
      debut = lundi(jourChoisi);
      fin = ajouterJours(debut, 6) < aujourdhui ? ajouterJours(debut, 6) : aujourdhui;
      break;
    }
    case "7j":
      debut = ajouterJours(aujourdhui, -6);
      break;
    case "mois": {
      // Mois choisi dans la liste (jamais dans le futur), sinon le mois en cours ; un mois passé est complet.
      const choisi = mois && moisValide.test(mois) && mois <= aujourdhui.slice(0, 7) ? mois : aujourdhui.slice(0, 7);
      debut = `${choisi}-01`;
      fin = finDuMois(choisi) < aujourdhui ? finDuMois(choisi) : aujourdhui;
      break;
    }
    case "trimestre":
      debut = `${a}-${String(Math.floor((m - 1) / 3) * 3 + 1).padStart(2, "0")}-01`;
      break;
    case "annee":
      // Année choisie : complète si elle est passée, sinon jusqu'à aujourd'hui.
      debut = `${anneeChoisie}-01-01`;
      fin = anneeChoisie < a ? `${anneeChoisie}-12-31` : aujourdhui;
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
  // Mois : on compare aux mêmes jours du mois précédent (1er → même quantième, borné à la fin de ce mois).
  // Année : on compare aux mêmes jours de l'année précédente (1er janvier → même date ; 29 février → 28).
  const moisPrecedent = ajouterMois(debut.slice(0, 7), -1);
  const anPrec = Number(debut.slice(0, 4)) - 1;
  const precedente =
    c === "semaine"
      ? { du: ajouterJours(debut, -7), au: ajouterJours(fin, -7) }
      : c === "mois"
        ? { du: `${moisPrecedent}-01`, au: [ajouterJours(`${moisPrecedent}-01`, nbJours - 1), finDuMois(moisPrecedent)].sort()[0] }
        : c === "annee"
          ? { du: `${anPrec}-01-01`, au: [`${anPrec}${fin.slice(4)}`, finDuMois(`${anPrec}${fin.slice(4, 7)}`)].sort()[0] }
          : { du: ajouterJours(debut, -nbJours), au: ajouterJours(debut, -1) };
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
