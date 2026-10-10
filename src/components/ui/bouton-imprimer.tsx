"use client";

/** Ouvre la boîte d'impression du navigateur (impression papier ou « Enregistrer en PDF »). */
export function BoutonImprimer() {
  return (
    <button type="button" onClick={() => window.print()} className="min-h-11 rounded bg-papel-700 px-4 font-medium text-white print:hidden hover:bg-papel-800 md:min-h-9">
      Imprimer / enregistrer en PDF
    </button>
  );
}
