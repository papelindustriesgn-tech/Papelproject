"use client";

import type { ReactNode } from "react";
import { useTerrain } from "./contexte";

/** En-tête d'un écran terrain avec bouton retour (gros, facile à toucher). */
export function EnTeteVue({ titre, retour = "accueil", action }: { titre: string; retour?: string | null; action?: ReactNode }) {
  const { aller } = useTerrain();
  return (
    <div className="mb-4 flex items-center gap-2">
      {retour !== null && (
        <button type="button" onClick={() => aller(retour)} className="min-h-11 min-w-11 rounded-lg border border-papel-300 bg-white px-3 text-xl font-bold text-papel-800" aria-label="Retour">
          ←
        </button>
      )}
      <h1 className="flex-1 text-xl font-bold text-papel-900">{titre}</h1>
      {action}
    </div>
  );
}

/** Gros bouton de menu (accueil). */
export function Tuile({ libelle, detail, onClick }: { libelle: string; detail?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-20 flex-col items-start justify-center rounded-xl border border-papel-200 bg-white p-3 text-left shadow-sm active:bg-papel-50">
      <span className="text-lg font-bold text-papel-900">{libelle}</span>
      {detail && <span className="text-sm text-gray-600">{detail}</span>}
    </button>
  );
}

/** Barre de progression d'un objectif. */
export function Progression({ libelle, realise, cible, format = (n: number) => n.toLocaleString("fr-FR") }: { libelle: string; realise: number; cible: number; format?: (n: number) => string }) {
  const ratio = cible > 0 ? Math.min(1, realise / cible) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="font-medium">{libelle}</span>
        <span>
          {format(realise)} / {format(cible)}
        </span>
      </div>
      <div className="mt-1 h-3 overflow-hidden rounded-full bg-gray-200" role="progressbar" aria-label={libelle} aria-valuenow={Math.round(ratio * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full rounded-full ${ratio >= 1 ? "bg-green-600" : "bg-papel-500"}`} style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  );
}

export const gnfCourt = (n: number) => {
  const t = n >= 1_000_000 ? `${(n / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M` : n.toLocaleString("fr-FR");
  return `${t.replace(/[  ]/g, " ")} GNF`;
};

export const dateHeure = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { timeZone: "Africa/Conakry", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export const aujourdhuiConakry = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Conakry" }).format(new Date());
