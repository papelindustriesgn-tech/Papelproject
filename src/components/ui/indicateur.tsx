import { AlertTriangle, ArrowDownRight, ArrowUpRight, ChevronRight, CircleAlert, Minus } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { aideDuLibelle, type Mot } from "@/lib/aide/lexique";
import { Aide } from "./aide";
import { IconeIndicateur } from "./icone-indicateur";
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
 * Tuile d'indicateur (KPI) : bulle d'icône, libellé, grand chiffre, évolution, mini-courbe et précision.
 * Cliquable (`lien`) pour ouvrir le détail. L'état (« À surveiller », « Critique ») est écrit, pas seulement coloré.
 * Bulle « ? » d'explication déduite du libellé (`aideDuLibelle`), ou fournie par `aide` (`false` pour la retirer).
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
  aide,
}: {
  libelle: string;
  valeur: ReactNode;
  detail?: ReactNode;
  ton?: "normal" | "alerte" | "danger";
  lien?: string;
  variation?: Variation;
  tendance?: PointTendance[];
  formatTendance?: FormatTendance;
  aide?: Mot | false;
}) {
  const explication = aide === false ? null : (aide ?? aideDuLibelle(libelle));
  const bulle = ton === "danger" ? "bg-red-100 text-red-700" : ton === "alerte" ? "bg-amber-100 text-amber-800" : "bg-papel-100 text-papel-700";
  const contenu = (
    <>
      <div className="flex items-start gap-3">
        <span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${bulle}`}>
          <IconeIndicateur libelle={libelle} />
        </span>
        <div className="min-w-0 flex-1">
          {/* Titre et badge passent à la ligne quand la tuile est étroite (le badge n'est jamais coupé). */}
          <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
            <div className="text-[0.88rem] font-medium leading-snug text-gray-500">
              {libelle}
              {explication && <Aide mot={explication.mot} explication={explication.explication} className="ml-1" />}
            </div>
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
          <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-[1.7rem] font-bold leading-tight tracking-tight text-gray-900">{valeur}</span>
            {variation && <PastilleVariation v={variation} />}
          </div>
        </div>
      </div>
      {tendance && (
        <div className="relative z-10">
          <Tendance points={tendance} format={formatTendance} />
        </div>
      )}
      {detail && <div className="mt-2 text-sm leading-snug text-gray-500">{detail}</div>}
    </>
  );
  const classes = `ombre-carte group relative flex h-full flex-col rounded-2xl bg-white px-4 py-4 ${ton === "danger" ? "ring-1 ring-red-200" : ton === "alerte" ? "ring-1 ring-amber-200" : ""}`;
  if (!lien) return <div className={classes}>{contenu}</div>;
  // Lien « étiré » sur toute la tuile (after:inset-0) : la bulle d'aide et la mini-courbe restent au-dessus, hors du lien.
  return (
    <div className={`${classes} transition hover:-translate-y-0.5 hover:shadow-lg has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-papel-600`}>
      {contenu}
      <Link
        href={lien}
        aria-label={`${libelle} : voir le détail`}
        className="mt-auto flex items-center gap-0.5 pt-2 text-xs font-semibold text-papel-700 opacity-70 outline-none after:absolute after:inset-0 after:rounded-2xl group-hover:opacity-100"
      >
        Voir le détail <ChevronRight size={14} aria-hidden />
      </Link>
    </div>
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
