"use client";

import { ArrowLeft, ClipboardList, Home, Minus, Plus, Receipt, Store, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { useTerrain } from "./contexte";

/**
 * Éléments communs de l'application terrain : pensée comme une application de téléphone
 * (en-tête coloré fixe, onglets en bas, gros boutons à portée du pouce).
 */

/** En-tête fixe d'un écran, avec bouton retour. */
export function EnTeteVue({ titre, retour = "accueil", action, sousTitre }: { titre: string; retour?: string | null; action?: ReactNode; sousTitre?: string }) {
  const { aller, enLigne } = useTerrain();
  return (
    <header className="sticky top-0 z-[1000] -mx-3 mb-3 flex min-h-14 items-center gap-2 bg-papel-700 px-2 py-2 text-white shadow print:hidden">
      {retour !== null && (
        <button type="button" onClick={() => aller(retour)} className="flex size-11 shrink-0 items-center justify-center rounded-full active:bg-white/20" aria-label="Retour">
          <ArrowLeft size={24} />
        </button>
      )}
      <div className={`min-w-0 flex-1 ${retour === null ? "pl-2" : ""}`}>
        <h1 className="truncate text-lg font-bold leading-tight">{titre}</h1>
        {sousTitre && <p className="truncate text-sm text-white/80">{sousTitre}</p>}
      </div>
      <span className={`mr-1 size-2.5 shrink-0 rounded-full ${enLigne ? "bg-green-300" : "bg-amber-300"}`} title={enLigne ? "En ligne" : "Hors ligne"} aria-hidden />
      {action}
    </header>
  );
}

const ONGLETS = [
  { vue: "accueil", libelle: "Accueil", Icone: Home },
  { vue: "pva", libelle: "Points de vente", Icone: Store },
  { vue: "document-nouveau", libelle: "Vendre", Icone: Plus, central: true },
  { vue: "documents", libelle: "Ventes", Icone: Receipt },
  { vue: "moi", libelle: "Moi", Icone: UserRound },
] as const;

/** Onglets du bas (comme une application) : toujours visibles, à portée du pouce. */
export function BarreOnglets() {
  const { route, aller } = useTerrain();
  const actif = (vue: string) => (vue === "accueil" ? route.vue === "accueil" : vue === "pva" ? route.vue.startsWith("pva") || route.vue === "visite" : vue === "documents" ? route.vue === "documents" || route.vue === "document" : route.vue === vue);
  return (
    <nav aria-label="Onglets" className="fixed inset-x-0 bottom-0 z-[1000] border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_8px_rgba(0,0,0,0.06)] print:hidden">
      <ul className="mx-auto grid max-w-xl grid-cols-5">
        {ONGLETS.map((o) => (
          <li key={o.vue} className="flex justify-center">
            {"central" in o ? (
              <button type="button" onClick={() => aller(o.vue)} className="-mt-5 flex flex-col items-center gap-0.5 text-xs font-semibold text-papel-800" aria-label="Nouvelle vente">
                <span className="flex size-14 items-center justify-center rounded-full bg-papel-700 text-white shadow-lg ring-4 ring-white active:scale-95">
                  <o.Icone size={28} />
                </span>
                {o.libelle}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => aller(o.vue)}
                aria-current={actif(o.vue) ? "page" : undefined}
                className={`flex min-h-14 w-full flex-col items-center justify-center gap-0.5 text-xs font-medium ${actif(o.vue) ? "text-papel-700" : "text-gray-500"}`}
              >
                <o.Icone size={22} strokeWidth={actif(o.vue) ? 2.4 : 1.8} />
                {o.libelle}
              </button>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Gros bouton de menu avec icône. */
export function Tuile({ libelle, detail, onClick, icone }: { libelle: string; detail?: string; onClick: () => void; icone?: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-20 items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 text-left shadow-sm active:scale-[0.98] active:bg-papel-50">
      {icone && <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-papel-100 text-papel-800">{icone}</span>}
      <span className="min-w-0">
        <span className="block font-bold leading-tight text-gray-900">{libelle}</span>
        {detail && <span className="block text-sm text-gray-500">{detail}</span>}
      </span>
    </button>
  );
}

/** Chiffre clé (petite carte). */
export function Chiffre({ libelle, valeur, ton = "normal" }: { libelle: string; valeur: ReactNode; ton?: "normal" | "alerte" | "bon" }) {
  const couleur = ton === "alerte" ? "text-red-700" : ton === "bon" ? "text-green-700" : "text-gray-900";
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{libelle}</div>
      <div className={`mt-0.5 text-2xl font-bold leading-tight ${couleur}`}>{valeur}</div>
    </div>
  );
}

/**
 * Saisie d'un nombre entier avec gros boutons − / + (pas besoin du clavier).
 * Le champ reste modifiable au clavier numérique pour les grandes quantités.
 */
export function Compteur({ id, libelle, valeur, onChange, min = 0, pas = 1, name }: { id: string; libelle: string; valeur: string; onChange: (v: string) => void; min?: number; pas?: number; name?: string }) {
  const n = Number(valeur.replace(/\s/g, "")) || 0;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block font-medium">
        {libelle}
      </label>
      <div className="flex items-stretch gap-2">
        <button type="button" onClick={() => onChange(String(Math.max(min, n - pas)))} className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-gray-300 bg-white active:bg-gray-100" aria-label={`Moins (${libelle})`}>
          <Minus size={22} />
        </button>
        <input
          id={id}
          name={name}
          inputMode="numeric"
          value={valeur}
          onChange={(e) => onChange(e.target.value.replace(/[^\d\s]/g, ""))}
          placeholder="0"
          className="min-h-12 w-full min-w-0 rounded-xl border border-gray-300 bg-white text-center text-xl font-bold"
        />
        <button type="button" onClick={() => onChange(String(n + pas))} className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-papel-700 text-white active:bg-papel-800" aria-label={`Plus (${libelle})`}>
          <Plus size={22} />
        </button>
      </div>
    </div>
  );
}

/** Barre d'objectif. */
export function Progression({ libelle, realise, cible, format = (n: number) => n.toLocaleString("fr-FR") }: { libelle: string; realise: number; cible: number; format?: (n: number) => string }) {
  const ratio = cible > 0 ? Math.min(1, realise / cible) : 0;
  return (
    <div>
      <div className="flex justify-between gap-2 text-sm">
        <span className="font-medium">{libelle}</span>
        <span className="text-gray-700">
          {format(realise)} / {format(cible)} · <strong>{Math.round(ratio * 100)} %</strong>
        </span>
      </div>
      <div className="mt-1 h-3 overflow-hidden rounded-full bg-gray-200" role="progressbar" aria-label={libelle} aria-valuenow={Math.round(ratio * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full rounded-full ${ratio >= 1 ? "bg-green-600" : "bg-papel-600"}`} style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  );
}

/** Icône de liste vide. */
export function Vide({ texte, action }: { texte: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center text-gray-600">
      <ClipboardList size={32} className="text-gray-400" />
      <p>{texte}</p>
      {action}
    </div>
  );
}

export const gnfCourt = (n: number) => {
  const t = n >= 1_000_000 ? `${(n / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M` : n.toLocaleString("fr-FR");
  return `${t.replace(/[  ]/g, " ")} GNF`;
};

export const gnf = (n: number) => `${n.toLocaleString("fr-FR").replace(/[  ]/g, " ")} GNF`;

export const dateHeure = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { timeZone: "Africa/Conakry", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export const aujourdhuiConakry = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Conakry" }).format(new Date());

/** Nombre de jours entre une date ISO et aujourd'hui (Conakry). */
export const joursDepuis = (iso: string | null) => {
  if (!iso) return null;
  const j = (d: string) => Date.parse(`${d}T00:00:00Z`);
  return Math.round((j(aujourdhuiConakry()) - j(iso.slice(0, 10))) / 86_400_000);
};

/** Lien téléphone / WhatsApp (numéros guinéens : on ajoute +224 si absent). */
export const numeroInternational = (tel: string) => {
  const chiffres = tel.replace(/[^\d+]/g, "");
  return chiffres.startsWith("+") ? chiffres : `+224${chiffres}`;
};
