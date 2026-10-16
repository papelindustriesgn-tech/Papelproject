import { CalendarRange } from "lucide-react";
import Link from "next/link";
import { PERIODES, type Periode } from "@/lib/formulaires/periode";

const COURTS: Record<string, string> = { jour: "Aujourd'hui", "7j": "7 jours", "30j": "30 jours", mois: "Ce mois", trimestre: "Trimestre", annee: "Année" };

/**
 * Sélecteur de période en pastilles (un toucher), et dates libres repliées dans « Autres dates ».
 * Liens et formulaire GET : fonctionne sans JavaScript, la période reste dans l'adresse.
 */
export function SelecteurPeriode({ periode }: { periode: Periode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
      <div className="ombre-carte flex max-w-full gap-1 overflow-x-auto rounded-2xl bg-white p-1" role="group" aria-label="Période">
        {PERIODES.filter((p) => p.code !== "perso").map((p) => (
          <Link
            key={p.code}
            href={`?periode=${p.code}`}
            aria-current={periode.code === p.code ? "true" : undefined}
            className={`flex min-h-10 shrink-0 items-center rounded-xl px-3.5 text-sm font-semibold transition ${periode.code === p.code ? "bg-papel-700 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"}`}
          >
            {COURTS[p.code] ?? p.libelle}
          </Link>
        ))}
      </div>
      <details className="group relative" open={periode.code === "perso"}>
        <summary className={`ombre-carte flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-2xl px-3.5 text-sm font-semibold ${periode.code === "perso" ? "bg-papel-700 text-white" : "bg-white text-gray-700"}`}>
          <CalendarRange size={16} aria-hidden /> Autres dates
        </summary>
        <form className="ombre-carte absolute left-0 z-20 mt-2 flex flex-wrap items-end gap-2 rounded-2xl bg-white p-3 md:w-max">
          <input type="hidden" name="periode" value="perso" />
          <label className="flex flex-col">
            <span className="text-sm font-medium text-gray-700">Du</span>
            <input type="date" name="du" defaultValue={periode.du} className="min-h-11 rounded-xl border border-gray-200 bg-white px-3 md:min-h-10" />
          </label>
          <label className="flex flex-col">
            <span className="text-sm font-medium text-gray-700">Au</span>
            <input type="date" name="au" defaultValue={periode.au} className="min-h-11 rounded-xl border border-gray-200 bg-white px-3 md:min-h-10" />
          </label>
          <button className="min-h-11 rounded-xl bg-papel-700 px-4 font-medium text-white hover:bg-papel-800 md:min-h-10">Afficher</button>
        </form>
      </details>
      <span className="text-sm text-gray-500">
        Du {periode.du.split("-").reverse().join("/")} au {periode.au.split("-").reverse().join("/")}
      </span>
    </div>
  );
}
