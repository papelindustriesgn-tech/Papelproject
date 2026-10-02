import type { ReactNode } from "react";

/** Tuile d'indicateur (KPI) : libellé, grande valeur, précision. */
export function Indicateur({ libelle, valeur, detail, ton = "normal" }: { libelle: string; valeur: ReactNode; detail?: ReactNode; ton?: "normal" | "alerte" | "danger" }) {
  const bord = ton === "danger" ? "border-l-red-600" : ton === "alerte" ? "border-l-amber-500" : "border-l-papel-500";
  return (
    <div className={`rounded-xl border border-l-4 border-gray-200 bg-white p-4 shadow-sm ${bord}`}>
      <div className="text-sm font-medium text-gray-700">{libelle}</div>
      <div className="mt-1 text-2xl font-bold text-papel-900">{valeur}</div>
      {detail && <div className="mt-1 text-sm text-gray-600">{detail}</div>}
    </div>
  );
}
