/**
 * Export CSV compatible Excel en français : séparateur « ; », BOM UTF-8 (accents corrects),
 * nombres avec virgule décimale. Ouvrable directement dans Excel, LibreOffice ou un logiciel comptable.
 */
export type ValeurCsv = string | number | boolean | null | undefined;

function cellule(v: ValeurCsv): string {
  if (v === null || v === undefined) return "";
  const texte = typeof v === "number" ? String(v).replace(".", ",") : typeof v === "boolean" ? (v ? "oui" : "non") : v;
  return /[";\n\r]/.test(texte) ? `"${texte.replace(/"/g, '""')}"` : texte;
}

export function versCsv(entetes: string[], lignes: ValeurCsv[][]): string {
  return "﻿" + [entetes, ...lignes].map((l) => l.map(cellule).join(";")).join("\r\n");
}
