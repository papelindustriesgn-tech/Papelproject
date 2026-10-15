import { AlertTriangle, ArrowDownRight, ArrowUpRight, ChevronRight, CircleAlert, Minus } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Tendance, type FormatTendance, type PointTendance } from "./tendance";

/** Évolution par rapport à la période précédente : `ecart` en % (fraction : 0,12 = +12 %) ou en points. */
export interface Variation {
  ecart: number | null;
  unite?: "pct" | "points";
  /** Sens favorable : une hausse est-elle une bonne nouvelle ? (CA : oui ; pertes, impayés : non). */
  hausseBonne?: boolean;
}

function libelleVariation(v: Variation): string {
  const e = v.ecart ?? 0;
  const arrondi = Math.round(Math.abs(e) * 1000) / 10;
  const n = arrondi.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
  return `${arrondi === 0 ? "" : e > 0 ? "+" : "−"}${n}${v.unite === "points" ? " pt" : " %"}`;
}

/** Pastille d'évolution : flèche + texte, verte si l'évolution est favorable, rouge sinon (jamais la couleur seule). */
export function PastilleVariation({ v }: { v: Variation }) {
  if (v.ecart === null || !Number.isFinite(v.ecart)) return null;
  // Nul à l'affichage (arrondi à 0,1) : pas de signe ni de couleur.
  const nul = Math.abs(v.ecart * 100) < 0.05;
  const favorable = nul ? null : (v.ecart > 0) === (v.hausseBonne ?? true);
  const Icone = nul ? Minus : v.ecart > 0 ? ArrowUpRight : ArrowDownRight;
  const style = favorable === null ? "bg-gray-100 text-gray-700" : favorable ? "bg-green-50 text-[#006300]" : "bg-red-50 text-red-700";
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${style}`} title="Par rapport à la période précédente de même durée">
      <Icone size={14} aria-hidden />
      {libelleVariation(v)}
      <span className="sr-only"> par rapport à la période précédente</span>
    </span>
  );
}

/**
 * Tuile d'indicateur (KPI) : libellé, grande valeur, évolution, mini-courbe et précision.
 * Cliquable (`lien`) pour ouvrir le détail. L'état (« À surveiller », « Critique ») est écrit, pas seulement coloré.
 */
export function Indicateur({
  libelle,
  valeur,
  detail,
  ton = "normal",
  lien,
  variation,
  tendance,
  formatTendance,
}: {
  libelle: string;
  valeur: ReactNode;
  detail?: ReactNode;
  ton?: "normal" | "alerte" | "danger";
  lien?: string;
  variation?: Variation;
  tendance?: PointTendance[];
  formatTendance?: FormatTendance;
}) {
  const bord = ton === "danger" ? "border-red-300 bg-red-50/40" : ton === "alerte" ? "border-amber-300 bg-amber-50/40" : "border-gray-200 bg-white";
  const contenu = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="text-[0.85rem] font-medium leading-snug text-gray-600">{libelle}</div>
        {ton === "danger" && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
            <CircleAlert size={13} aria-hidden /> Critique
          </span>
        )}
        {ton === "alerte" && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
            <AlertTriangle size={13} aria-hidden /> À surveiller
          </span>
        )}
      </div>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-[1.75rem] font-semibold leading-tight tracking-tight text-gray-900">{valeur}</span>
        {variation && <PastilleVariation v={variation} />}
      </div>
      {tendance && <Tendance points={tendance} format={formatTendance} />}
      {detail && <div className="mt-1.5 text-sm leading-snug text-gray-600">{detail}</div>}
    </>
  );
  const classes = `group relative flex h-full flex-col rounded-xl border px-4 py-3 shadow-sm ${bord}`;
  if (!lien) return <div className={classes}>{contenu}</div>;
  return (
    <Link href={lien} className={`${classes} transition hover:-translate-y-0.5 hover:border-papel-400 hover:shadow-md focus-visible:outline-2 focus-visible:outline-papel-600`}>
      {contenu}
      <span className="mt-auto flex items-center gap-0.5 pt-2 text-xs font-semibold text-papel-700 opacity-70 group-hover:opacity-100">
        Voir le détail <ChevronRight size={14} aria-hidden />
      </span>
    </Link>
  );
}

/** Écart relatif entre deux valeurs (0,12 = +12 %) ; null si la comparaison n'a pas de sens. */
export function ecartRelatif(actuel: number | null | undefined, precedent: number | null | undefined): number | null {
  if (actuel == null || precedent == null || precedent === 0) return null;
  return (actuel - precedent) / Math.abs(precedent);
}

/** Écart absolu entre deux taux (en fraction : 0,02 = 2 points). */
export function ecartPoints(actuel: number | null | undefined, precedent: number | null | undefined): number | null {
  if (actuel == null || precedent == null) return null;
  return actuel - precedent;
}

/** Libellé court d'un jour ISO pour les infobulles (« 12/10 »). */
export function jourCourt(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}
