import { AlertTriangle, CheckCircle2, ChevronRight, CircleAlert } from "lucide-react";
import Link from "next/link";

/** Une alerte affichable (alertes de l'entreprise, lignes « À faire », coordination). */
export interface AlerteEspace {
  gravite: "critique" | "importante";
  domaine: string;
  message: string;
  lien: string;
  /** Nombre d'éléments concernés, affiché dans la bulle. */
  nombre?: number;
}

/** Alertes prioritaires : en tête de page, critiques d'abord, chaque ligne ouvre l'écran où agir. */
export function ListeAlertes({ alertes, tout = false, titre = "À traiter maintenant" }: { alertes: AlerteEspace[]; tout?: boolean; titre?: string }) {
  const critiques = alertes.filter((a) => a.gravite === "critique").length;
  return (
    <section aria-label={titre} className="mb-5 break-inside-avoid">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{titre}</h2>
        {critiques > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
            <CircleAlert size={13} aria-hidden /> {critiques} critique(s)
          </span>
        )}
        {alertes.length - critiques > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">
            <AlertTriangle size={13} aria-hidden /> {alertes.length - critiques} importante(s)
          </span>
        )}
      </div>
      {alertes.length ? (
        <ul className="grid gap-2 md:grid-cols-2">
          {(tout ? alertes : alertes.slice(0, 12)).map((a, i) => (
            <li key={i}>
              <Link
                href={a.lien}
                className={`ombre-carte flex h-full items-start gap-3 rounded-2xl px-4 py-3 transition hover:-translate-y-0.5 hover:shadow-lg ${a.gravite === "critique" ? "bg-red-50 ring-1 ring-red-200" : "bg-amber-50 ring-1 ring-amber-200"}`}
              >
                <span className={`mt-0.5 flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full px-1.5 text-sm font-bold ${a.gravite === "critique" ? "bg-red-600 text-white" : "bg-amber-400 text-amber-950"}`}>
                  {a.nombre !== undefined ? a.nombre : a.gravite === "critique" ? <CircleAlert size={18} aria-hidden /> : <AlertTriangle size={18} aria-hidden />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-xs font-bold uppercase tracking-wide ${a.gravite === "critique" ? "text-red-700" : "text-amber-800"}`}>
                    {a.gravite === "critique" ? "Critique" : "Important"} · {a.domaine}
                  </span>
                  <span className="block font-medium leading-snug text-gray-900">{a.message}</span>
                </span>
                <ChevronRight size={18} className="mt-1 shrink-0 text-gray-400" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ombre-carte flex items-center gap-2 rounded-2xl bg-green-50 px-4 py-3 font-semibold text-green-800">
          <CheckCircle2 size={20} aria-hidden /> Aucune alerte : tout est sous contrôle.
        </p>
      )}
      {!tout && alertes.length > 12 && <p className="mt-2 text-sm text-gray-600">… et {alertes.length - 12} autre(s) alerte(s).</p>}
    </section>
  );
}
