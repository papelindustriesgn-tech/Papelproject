import type { ReactNode } from "react";

/** Tuile d'indicateur (KPI) : libellé, grande valeur, précision. Liseré coloré selon l'état. */
export function Indicateur({ libelle, valeur, detail, ton = "normal" }: { libelle: string; valeur: ReactNode; detail?: ReactNode; ton?: "normal" | "alerte" | "danger" }) {
  const lisere = ton === "danger" ? "before:bg-red-600" : ton === "alerte" ? "before:bg-amber-500" : "before:bg-papel-600";
  return (
    <div className={`relative overflow-hidden rounded-md border border-gray-200 bg-white px-4 py-3 before:absolute before:inset-y-0 before:left-0 before:w-1 ${lisere}`}>
      <div className="text-[0.8rem] font-medium uppercase tracking-wide text-gray-500">{libelle}</div>
      <div className="mt-1 text-[1.6rem] font-semibold leading-tight text-gray-900">{valeur}</div>
      {detail && <div className="mt-1 text-sm text-gray-600">{detail}</div>}
    </div>
  );
}
