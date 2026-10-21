"use client";

import { useId, useState } from "react";

export interface PointTendance {
  /** Libellé du point (ex. date « 12/10 »). */
  libelle: string;
  valeur: number | null;
}

/**
 * Mini-courbe d'un indicateur (sparkline) : 2 px, couleur d'accent de l'application,
 * dernier point marqué. Au survol (ou au doigt) : repère vertical + valeur du point. Le titre résume l'évolution.
 */
/** Format d'affichage des valeurs dans l'infobulle (une fonction ne peut pas venir d'un composant serveur). */
export type FormatTendance = "nombre" | "gnf" | "pct" | "kg";

function formater(v: number, f: FormatTendance): string {
  if (f === "gnf") return `${Math.round(v).toLocaleString("fr-FR")} GNF`;
  if (f === "pct") return `${(v * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;
  if (f === "kg") return `${Math.round(v).toLocaleString("fr-FR")} kg`;
  return v.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
}

export function Tendance({ points, format = "nombre" }: { points: PointTendance[]; format?: FormatTendance }) {
  const [actif, setActif] = useState<number | null>(null);
  const id = useId();
  const valeurs = points.map((p) => p.valeur).filter((v): v is number => v !== null && Number.isFinite(v));
  if (points.length < 2 || valeurs.length < 2) return null;
  const L = 200;
  const H = 40;
  const min = Math.min(...valeurs);
  const max = Math.max(...valeurs);
  const x = (i: number) => (i / (points.length - 1)) * (L - 8) + 4;
  const y = (v: number) => (max === min ? H / 2 : H - 4 - ((v - min) / (max - min)) * (H - 8));
  // Trait continu, interrompu sur les jours sans valeur.
  let d = "";
  points.forEach((p, i) => {
    if (p.valeur === null || !Number.isFinite(p.valeur)) return;
    const precedent = i > 0 ? points[i - 1].valeur : null;
    d += `${precedent === null || i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.valeur).toFixed(1)} `;
  });
  // Aire sous la courbe (seulement si la série n'a pas de trou, sinon la courbe suffit).
  const complet = points.every((p) => p.valeur !== null && Number.isFinite(p.valeur));
  const aire = complet ? `${d.trim()} L${x(points.length - 1).toFixed(1)},${H} L${x(0).toFixed(1)},${H} Z` : null;
  const dernier = [...points.keys()].reverse().find((i) => points[i].valeur !== null);
  const fmt = (v: number) => formater(v, format);
  const choisi = actif !== null ? points[actif] : null;

  return (
    <div className="relative mt-2">
      <svg
        viewBox={`0 0 ${L} ${H}`}
        preserveAspectRatio="none"
        className="h-12 w-full touch-none overflow-visible text-papel-600"
        role="img"
        aria-labelledby={`${id}-t`}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setActif(Math.max(0, Math.min(points.length - 1, Math.round(((e.clientX - r.left) / r.width) * (points.length - 1)))));
        }}
        onPointerLeave={() => setActif(null)}
      >
        <title id={`${id}-t`}>{`Évolution : de ${fmt(valeurs[0])} à ${fmt(valeurs[valeurs.length - 1])}`}</title>
        {/* Aire douce sous la courbe. */}
        <defs>
          <linearGradient id={`${id}-aire`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity={0.22} />
            <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
          </linearGradient>
        </defs>
        {aire && <path d={aire} fill={`url(#${id}-aire)`} stroke="none" />}
        <path d={d} fill="none" stroke="currentColor" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" opacity={0.85} />
        {actif !== null && <line x1={x(actif)} x2={x(actif)} y1={0} y2={H} stroke="#9ca3af" strokeWidth={1} vectorEffect="non-scaling-stroke" />}
        {dernier !== undefined && actif === null && <circle cx={x(dernier)} cy={y(points[dernier].valeur!)} r={3} fill="currentColor" stroke="white" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />}
        {choisi?.valeur != null && <circle cx={x(actif!)} cy={y(choisi.valeur)} r={3.5} fill="currentColor" stroke="white" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />}
      </svg>
      {choisi && (
        <div className="pointer-events-none absolute top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white shadow" style={{ left: `${(x(actif!) / L) * 100}%` }}>
          {choisi.libelle} : {choisi.valeur === null ? "—" : fmt(choisi.valeur)}
        </div>
      )}
    </div>
  );
}
