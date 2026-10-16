"use client";

/**
 * Graphiques de la nouvelle interface : courbe en aire de la carte héros (sur fond coloré) et anneau de répartition.
 * Couleurs : blanc sur la couleur du service (héros) ; palette catégorielle validée, ordre fixe (anneau).
 */
import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { COULEURS_SERIES } from "@/lib/graphiques/couleurs";

export type FormatGraphique = "gnf" | "nombre" | "pct";

const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
function formater(v: number, f: FormatGraphique): string {
  if (f === "gnf") return `${Math.round(v).toLocaleString("fr-FR")} GNF`;
  if (f === "pct") return `${nf.format(v * 100)} %`;
  return nf.format(v);
}
const jourCourt = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** Courbe blanche en aire, pour la carte héros (fond = couleur du service). */
export function CourbeHero({ points, format }: { points: { date: string; valeur: number | null }[]; format: FormatGraphique }) {
  return (
    <ResponsiveContainer width="100%" height={170}>
      <AreaChart data={points} margin={{ top: 10, right: 6, bottom: 0, left: 6 }}>
        <defs>
          <linearGradient id="aire-hero" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" tickFormatter={jourCourt} tick={{ fill: "rgba(255,255,255,0.75)", fontSize: 12 }} axisLine={false} tickLine={false} minTickGap={24} />
        <Tooltip
          cursor={{ stroke: "rgba(255,255,255,0.6)", strokeWidth: 1 }}
          contentStyle={{ background: "#111827", border: "none", borderRadius: 12, color: "#fff", fontSize: 13 }}
          labelStyle={{ color: "#d1d5db" }}
          itemStyle={{ color: "#fff" }}
          formatter={(v) => [formater(Number(v), format), ""]}
          labelFormatter={(l) => `Le ${jourCourt(String(l))}`}
        />
        <Area type="monotone" dataKey="valeur" stroke="#ffffff" strokeWidth={2.5} fill="url(#aire-hero)" connectNulls activeDot={{ r: 5, fill: "#fff", stroke: "rgba(0,0,0,0.25)" }} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Anneau de répartition (part de chaque catégorie), légende avec valeurs et pourcentages. */
export function GraphiqueAnneau({ donnees, format, libelleTotal }: { donnees: { libelle: string; valeur: number }[]; format: FormatGraphique; libelleTotal: string }) {
  const total = donnees.reduce((s, d) => s + Math.max(0, d.valeur), 0);
  if (!total) return <p className="py-6 text-center text-gray-500">Pas de données sur la période.</p>;
  const lignes = donnees.slice(0, COULEURS_SERIES.length);
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative size-48 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={lignes} dataKey="valeur" nameKey="libelle" innerRadius="64%" outerRadius="100%" paddingAngle={2} stroke="#ffffff" strokeWidth={2} isAnimationActive={false}>
              {lignes.map((_, i) => (
                <Cell key={i} fill={COULEURS_SERIES[i]} />
              ))}
            </Pie>
            <Tooltip formatter={(v, nom) => [formater(Number(v), format), nom]} contentStyle={{ borderRadius: 12, fontSize: 13 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xs text-gray-500">{libelleTotal}</span>
          <span className="text-sm font-bold text-gray-900">{format === "gnf" ? `${nf.format(total / 1_000_000)} M` : formater(total, format)}</span>
        </div>
      </div>
      <ul className="w-full min-w-0 flex-1 space-y-2 text-sm">
        {lignes.map((d, i) => (
          <li key={d.libelle} className="flex items-center gap-2.5 rounded-xl bg-gray-50 px-3 py-2">
            <span className="size-3 shrink-0 rounded-sm" style={{ background: COULEURS_SERIES[i] }} aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-gray-800">{d.libelle}</span>
              <span className="block whitespace-nowrap text-xs tabular-nums text-gray-500">{formater(d.valeur, format)}</span>
            </span>
            <span className="whitespace-nowrap font-bold tabular-nums text-gray-900">{nf.format((d.valeur / total) * 100)} %</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
