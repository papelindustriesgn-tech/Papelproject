import "server-only";
import { readSheet } from "read-excel-file/node";
import { normalizeDate } from "@/lib/verification/normalize";

/** Lecture d'une liste d'étudiants (CSV ou Excel) avec reconnaissance automatique des colonnes. */

export const ROSTER_COLUMNS = {
  student_number: { label: "Matricule", required: true },
  last_name: { label: "Nom", required: true },
  first_name: { label: "Prénom(s)", required: false },
  birth_date: { label: "Date de naissance", required: false },
  faculty: { label: "Faculté", required: false },
  department: { label: "Département", required: false },
  program: { label: "Filière", required: false },
  study_level: { label: "Niveau", required: false },
} as const;
export type RosterColumn = keyof typeof ROSTER_COLUMNS;

const SYNONYMS: Record<RosterColumn, string[]> = {
  student_number: [
    "matricule",
    "n matricule",
    "no matricule",
    "num matricule",
    "numero matricule",
    "numero de matricule",
    "numero etudiant",
    "n etudiant",
    "id etudiant",
    "identifiant",
    "student id",
    "student number",
  ],
  last_name: ["nom", "nom de famille", "noms", "last name", "surname", "family name"],
  first_name: ["prenom", "prenoms", "first name", "given name", "given names"],
  birth_date: [
    "date de naissance",
    "date naissance",
    "naissance",
    "ne le",
    "nee le",
    "ne e le",
    "birth date",
    "date of birth",
    "dob",
  ],
  faculty: ["faculte", "faculty", "ufr", "ecole", "institut"],
  department: ["departement", "department", "dept"],
  program: ["filiere", "programme", "parcours", "specialite", "option", "program", "mention"],
  study_level: ["niveau", "niveau d etude", "annee d etude", "annee", "classe", "level", "promotion"],
};

const MAX_ROWS = 50_000;

const normHeader = (h: unknown) =>
  String(h ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export type RosterRow = Partial<Record<RosterColumn, string>>;
export type RosterParse = {
  rows: RosterRow[];
  columns: Partial<Record<RosterColumn, string>>;
  missing: RosterColumn[];
  skipped: number;
  error?: string;
};

/** CSV RFC 4180 (séparateur ; , ou tabulation détecté sur l'en-tête). */
function parseCsv(text: string): string[][] {
  const firstLine = text.slice(0, text.indexOf("\n") >>> 0);
  const sep = [";", ",", "\t"].sort((a, b) => firstLine.split(b).length - firstLine.split(a).length)[0];
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim()));
}

function decodeText(buf: Buffer) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf).replace(/^﻿/, "");
  } catch {
    return new TextDecoder("windows-1252").decode(buf); // export Excel « CSV » sous Windows
  }
}

function cellText(v: unknown, column: RosterColumn): string {
  if (v == null) return "";
  if (column === "birth_date") return normalizeDate(v) ?? "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim().slice(0, 120);
}

export async function parseRoster(file: File): Promise<RosterParse> {
  const empty = { rows: [], columns: {}, missing: [] as RosterColumn[], skipped: 0 };
  const buf = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();
  let table: unknown[][];
  try {
    if (name.endsWith(".xlsx")) table = (await readSheet(buf)) as unknown[][];
    else if (name.endsWith(".csv") || name.endsWith(".txt")) table = parseCsv(decodeText(buf));
    else return { ...empty, error: "Format non pris en charge : utilise un fichier .xlsx ou .csv." };
  } catch {
    return { ...empty, error: "Fichier illisible. Enregistre-le au format .xlsx ou .csv (UTF-8) puis réessaie." };
  }

  // L'en-tête est la première ligne (parmi les 10 premières) qui contient une colonne « matricule »
  const headerIndex = table.slice(0, 10).findIndex((r) => r.some((h) => SYNONYMS.student_number.includes(normHeader(h))));
  if (headerIndex < 0)
    return { ...empty, missing: ["student_number"], error: "Colonne « Matricule » introuvable dans les 10 premières lignes." };

  const header = table[headerIndex].map(normHeader);
  const index: Partial<Record<RosterColumn, number>> = {};
  const columns: RosterParse["columns"] = {};
  for (const col of Object.keys(SYNONYMS) as RosterColumn[]) {
    const i = header.findIndex((h) => SYNONYMS[col].includes(h));
    if (i >= 0) {
      index[col] = i;
      columns[col] = String(table[headerIndex][i]);
    }
  }
  // « Nom et prénom » dans une seule colonne : non exploitable sans ambiguïté
  const missing = (Object.keys(ROSTER_COLUMNS) as RosterColumn[]).filter((c) => index[c] === undefined);
  if (missing.some((c) => ROSTER_COLUMNS[c].required))
    return {
      ...empty,
      columns,
      missing,
      error: "Colonnes obligatoires manquantes : « Matricule » et « Nom » (le prénom dans une colonne séparée).",
    };

  const body = table.slice(headerIndex + 1);
  if (body.length > MAX_ROWS) return { ...empty, columns, missing, error: `Fichier trop long (${MAX_ROWS} lignes maximum).` };

  const rows: RosterRow[] = [];
  let skipped = 0;
  for (const r of body) {
    const row: RosterRow = {};
    for (const [col, i] of Object.entries(index) as [RosterColumn, number][]) {
      const v = cellText(r[i], col);
      if (v) row[col] = v;
    }
    if (!row.student_number || !row.last_name) {
      if (r.some((c) => String(c ?? "").trim())) skipped++;
      continue;
    }
    rows.push(row);
  }
  return { rows, columns, missing, skipped };
}
