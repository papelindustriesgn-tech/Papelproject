/**
 * « Coller depuis Excel » : lecture des lignes copiées dans un tableur (cellules séparées par des tabulations,
 * ou par « ; » pour un CSV), contrôle de chaque cellule et aperçu des erreurs, avant création en une fois.
 * Fonction pure et testée : la page l'utilise pour l'aperçu, l'action serveur la rejoue sur le même texte
 * (avec les listes lues en base) avant d'écrire, donc l'aperçu et l'enregistrement ne peuvent pas diverger.
 */
import { lireNombre } from "@/lib/formulaires/nombres";

export type TypeColonne = "texte" | "date" | "entier" | "montant" | "choix";

export interface Choix {
  valeur: string;
  /** Écritures acceptées (sans tenir compte des majuscules ni des accents). */
  libelles: string[];
}

export interface ColonneImport {
  cle: string;
  libelle: string;
  obligatoire?: boolean;
  type?: TypeColonne;
  /** Pour `choix` : valeurs possibles (lues dans une liste de l'ERP). */
  choix?: Choix[];
  /** Longueur maximale d'un texte. */
  max?: number;
  /** Exemple montré dans le modèle à télécharger. */
  exemple?: string;
}

export type Valeur = string | number | null;

export interface LigneImport {
  /** Numéro de la ligne dans le collage (1 = première ligne collée). */
  numero: number;
  valeurs: Record<string, Valeur>;
  erreurs: string[];
}

export interface ResultatImport {
  /** La première ligne était une ligne de titres (colonnes reconnues par leur nom). */
  entete: boolean;
  lignes: LigneImport[];
  /** Lignes sans erreur, prêtes à être créées. */
  valides: LigneImport[];
  /** Titres de colonnes du collage que l'ERP n'a pas reconnus (ignorés). */
  colonnesIgnorees: string[];
}

export const MAX_LIGNES_IMPORT = 500;

/** Minuscules, sans accents ni ponctuation : « Date d'embauche » → « date d embauche ». */
export function normaliser(t: string): string {
  return t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Découpe le texte collé en lignes et cellules (tabulation d'Excel, sinon « ; »). Les lignes vides sont ignorées. */
export function lireCollage(texte: string): string[][] {
  const lignes = texte.replace(/\r\n?/g, "\n").split("\n").filter((l) => l.trim() !== "");
  const separateur = lignes.some((l) => l.includes("\t")) ? "\t" : ";";
  return lignes.map((l) => l.split(separateur).map((c) => c.trim().replace(/^"(.*)"$/, "$1").trim()));
}

/** Date saisie à la française (« 15/03/2024 », « 5/3/24 ») ou ISO (« 2024-03-15 ») → ISO ; null si invalide. */
export function lireDate(t: string): string | null {
  let a: number, m: number, j: number;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  const fr = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(t);
  if (iso) [a, m, j] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  else if (fr) [j, m, a] = [Number(fr[1]), Number(fr[2]), Number(fr[3].length === 2 ? `20${fr[3]}` : fr[3])];
  else return null;
  const d = new Date(Date.UTC(a, m - 1, j));
  if (d.getUTCFullYear() !== a || d.getUTCMonth() !== m - 1 || d.getUTCDate() !== j) return null;
  return d.toISOString().slice(0, 10);
}

function lireCellule(brut: string, c: ColonneImport): { valeur: Valeur; erreur?: string } {
  if (brut === "") return c.obligatoire ? { valeur: null, erreur: `« ${c.libelle} » est obligatoire.` } : { valeur: null };
  switch (c.type ?? "texte") {
    case "date": {
      const d = lireDate(brut);
      return d ? { valeur: d } : { valeur: null, erreur: `« ${c.libelle} » : date illisible « ${brut} » (écrire JJ/MM/AAAA).` };
    }
    case "entier":
    case "montant": {
      const n = lireNombre(brut.replace(/\s*(GNF|FG|jours?|j)\s*$/i, ""));
      if (n === null || n < 0 || !Number.isInteger(n)) return { valeur: null, erreur: `« ${c.libelle} » : nombre illisible « ${brut} ».` };
      return { valeur: n };
    }
    case "choix": {
      const cible = normaliser(brut);
      const trouve = (c.choix ?? []).find((o) => o.libelles.some((l) => normaliser(l) === cible));
      if (trouve) return { valeur: trouve.valeur };
      const possibles = (c.choix ?? []).map((o) => o.libelles[0]).slice(0, 6).join(", ");
      return { valeur: null, erreur: `« ${c.libelle} » : « ${brut} » n'existe pas dans la liste${possibles ? ` (${possibles}…)` : ""}.` };
    }
    default:
      if (c.max && brut.length > c.max) return { valeur: null, erreur: `« ${c.libelle} » : ${c.max} caractères au plus.` };
      return { valeur: brut };
  }
}

/**
 * Analyse le collage : colonnes reconnues par leurs titres si la 1re ligne en contient (dans n'importe quel ordre),
 * sinon dans l'ordre du modèle. `doublon` (facultatif) donne la clé d'une ligne et `existants` les clés déjà en base :
 * une ligne déjà présente (en base ou plus haut dans le collage) est refusée, ce qui rend un 2e collage sans danger.
 */
export function analyserImport(
  texte: string,
  colonnes: ColonneImport[],
  options: { doublon?: (v: Record<string, Valeur>) => string; existants?: Set<string> } = {},
): ResultatImport {
  const brutes = lireCollage(texte);
  const premiere = brutes[0] ?? [];
  const index = premiere.map((titre) => colonnes.findIndex((c) => normaliser(c.libelle) === normaliser(titre.replace(/\*$/, ""))));
  const entete = premiere.length > 0 && index.filter((i) => i >= 0).length >= Math.min(2, colonnes.length);
  const ordre: (ColonneImport | null)[] = entete ? index.map((i) => (i >= 0 ? colonnes[i] : null)) : colonnes;
  const colonnesIgnorees = entete ? premiere.filter((_, k) => index[k] < 0 && premiere[k] !== "") : [];
  const donnees = (entete ? brutes.slice(1) : brutes).slice(0, MAX_LIGNES_IMPORT);
  const vus = new Set<string>();

  const lignes = donnees.map((cellules, k) => {
    const valeurs: Record<string, Valeur> = {};
    const erreurs: string[] = [];
    for (const c of colonnes) valeurs[c.cle] = null;
    ordre.forEach((c, i) => {
      if (!c) return;
      const r = lireCellule(cellules[i] ?? "", c);
      valeurs[c.cle] = r.valeur;
      if (r.erreur) erreurs.push(r.erreur);
    });
    // Colonne obligatoire absente du collage.
    for (const c of colonnes) if (c.obligatoire && !ordre.includes(c)) erreurs.push(`« ${c.libelle} » est obligatoire.`);
    if (options.doublon && !erreurs.length) {
      const cle = options.doublon(valeurs);
      if (options.existants?.has(cle)) erreurs.push("Existe déjà dans l'ERP.");
      else if (vus.has(cle)) erreurs.push("En double dans le collage.");
      vus.add(cle);
    }
    return { numero: k + (entete ? 2 : 1), valeurs, erreurs: [...new Set(erreurs)] };
  });
  return { entete, lignes, valides: lignes.filter((l) => !l.erreurs.length), colonnesIgnorees };
}

/** Choix d'une liste de l'ERP (id + libellé), reconnus par leur libellé. */
export function choixDeListe(liste: { id: string; libelle: string }[]): Choix[] {
  return liste.map((o) => ({ valeur: o.id, libelles: [o.libelle] }));
}

/** Clé de doublon faite de quelques colonnes (« nom + prénom ») : même règle côté page et côté serveur. */
export function cleDoublon(cles: string[]): (v: Record<string, Valeur>) => string {
  return (v) => cles.map((c) => normaliser(String(v[c] ?? ""))).join("|");
}
