"use client";

import { versCsv, type ValeurCsv } from "@/lib/formulaires/csv";

/** Bouton « Exporter (Excel) » : télécharge les lignes affichées au format CSV pour Excel. */
export function ExportCsv({ nomFichier, entetes, lignes }: { nomFichier: string; entetes: string[]; lignes: ValeurCsv[][] }) {
  const exporter = () => {
    const blob = new Blob([versCsv(entetes, lignes)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${nomFichier}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <button type="button" onClick={exporter} className="min-h-11 rounded-lg border border-papel-300 bg-white px-3 font-semibold text-papel-800 hover:bg-papel-50">
      Exporter (Excel)
    </button>
  );
}
