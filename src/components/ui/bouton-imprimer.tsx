"use client";

/** Ouvre la boîte d'impression du navigateur (impression papier ou « Enregistrer en PDF »). */
export function BoutonImprimer() {
  return (
    <button type="button" onClick={() => window.print()} className="min-h-11 rounded-lg bg-papel-700 px-4 font-semibold text-white print:hidden">
      Imprimer / enregistrer en PDF
    </button>
  );
}
