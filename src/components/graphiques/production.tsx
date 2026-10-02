"use client";

/**
 * Graphiques de production (Recharts). Couleurs : palette catégorielle validée (daltonisme, contraste),
 * dans un ordre FIXE par produit — jamais recalculé selon le classement.
 */
import { Bar, BarChart, CartesianGrid, LabelList, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const COULEURS_SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];
const ENCRE = "#52514e";
const GRILLE = "#e5e7e5";
const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
const fmt = (v: unknown) => nf.format(Number(v)).replace(/[  ]/g, " ");
const jourCourt = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

const axe = { tick: { fill: ENCRE, fontSize: 12 }, stroke: GRILLE } as const;

/** Rendement réel ÷ théorique par jour (%), avec le seuil d'alerte. */
export function GraphiqueRendement({ donnees, seuilPct }: { donnees: { date: string; ratio: number | null }[]; seuilPct: number }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={donnees} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
        <CartesianGrid stroke={GRILLE} vertical={false} />
        <XAxis dataKey="date" tickFormatter={jourCourt} {...axe} minTickGap={16} />
        <YAxis domain={["dataMin - 3", "dataMax + 3"]} tickFormatter={(v) => `${Math.round(v)} %`} {...axe} width={56} />
        <ReferenceLine y={seuilPct} stroke={ENCRE} strokeDasharray="4 4" label={{ value: `Seuil ${fmt(seuilPct)} %`, position: "insideBottomRight", fill: ENCRE, fontSize: 12 }} />
        <Tooltip formatter={(v) => [`${fmt(v)} %`, "Rendement / théorique"]} labelFormatter={(l) => `Le ${jourCourt(String(l))}`} />
        <Line type="monotone" dataKey="ratio" stroke={COULEURS_SERIES[0]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Paquets produits par jour, empilés par produit. */
export function GraphiqueProduction({ donnees, produits }: { donnees: Record<string, number | string>[]; produits: string[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={donnees} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={GRILLE} vertical={false} />
        <XAxis dataKey="date" tickFormatter={jourCourt} {...axe} minTickGap={16} />
        <YAxis tickFormatter={(v) => (v >= 1000 ? `${fmt(v / 1000)} k` : fmt(v))} {...axe} width={48} />
        <Tooltip formatter={(v, nom) => [`${fmt(v)} paquets`, nom]} labelFormatter={(l) => `Le ${jourCourt(String(l))}`} />
        <Legend wrapperStyle={{ color: ENCRE, fontSize: 13 }} />
        {produits.slice(0, COULEURS_SERIES.length).map((p, i) => (
          <Bar key={p} dataKey={p} stackId="production" fill={COULEURS_SERIES[i]} stroke="#ffffff" strokeWidth={2} radius={i === produits.length - 1 ? [4, 4, 0, 0] : 0} isAnimationActive={false} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Temps d'arrêt non planifié par cause (minutes), du plus long au plus court. */
export function GraphiqueArrets({ donnees }: { donnees: { cause: string; minutes: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(120, donnees.length * 40 + 24)}>
      <BarChart data={donnees} layout="vertical" margin={{ top: 0, right: 48, bottom: 0, left: 0 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="cause" width={150} tick={{ fill: ENCRE, fontSize: 12 }} stroke={GRILLE} />
        <Tooltip formatter={(v) => [`${fmt(v)} min`, "Durée totale"]} />
        <Bar dataKey="minutes" fill={COULEURS_SERIES[0]} radius={[0, 4, 4, 0]} barSize={20} isAnimationActive={false}>
          <LabelList dataKey="minutes" position="right" formatter={(v: unknown) => `${fmt(v)} min`} fill={ENCRE} fontSize={12} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Barres simples par jour (une seule série), ex. chiffre d'affaires HT quotidien. */
export function GraphiqueBarresJour({ donnees, unite }: { donnees: { date: string; valeur: number }[]; unite: string }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={donnees} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={GRILLE} vertical={false} />
        <XAxis dataKey="date" tickFormatter={jourCourt} {...axe} minTickGap={16} />
        <YAxis tickFormatter={(v) => (v >= 1_000_000 ? `${fmt(v / 1_000_000)} M` : v >= 1000 ? `${fmt(v / 1000)} k` : fmt(v))} {...axe} width={52} />
        <Tooltip formatter={(v) => [`${fmt(v)} ${unite}`, ""]} labelFormatter={(l) => `Le ${jourCourt(String(l))}`} />
        <Bar dataKey="valeur" fill={COULEURS_SERIES[0]} radius={[4, 4, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
