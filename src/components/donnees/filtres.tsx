import { Search } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export interface OptionFiltre {
  valeur: string;
  libelle: string;
}

export interface DefinitionFiltre {
  nom: string;
  libelle: string;
  /** « liste » (défaut) : choix parmi les options ; « date » : champ date. */
  type?: "liste" | "date";
  options?: OptionFiltre[];
}

/**
 * Barre de recherche et de filtres (formulaire GET : l'URL garde les filtres, on peut la partager ou la mettre en favori).
 * Fonctionne sans JavaScript.
 */
export function BarreFiltres({
  recherche,
  placeholder = "Rechercher…",
  filtres = [],
  valeurs,
  action,
}: {
  recherche?: string;
  placeholder?: string;
  filtres?: DefinitionFiltre[];
  valeurs: Record<string, string | undefined>;
  action?: ReactNode;
}) {
  const actifs = recherche || filtres.some((f) => valeurs[f.nom]);
  const saisie = "min-h-11 rounded border border-gray-300 bg-white px-2.5 text-[0.95rem] md:min-h-9";
  return (
    <form className="mb-3 grid grid-cols-2 items-end gap-2 md:flex md:flex-wrap" role="search">
      <label className="col-span-2 flex min-w-56 flex-1 flex-col">
        <span className="sr-only">Recherche</span>
        <span className="relative">
          <Search size={16} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden />
          <input type="search" name="q" defaultValue={recherche} placeholder={placeholder} className={`${saisie} w-full pl-8`} />
        </span>
      </label>
      {filtres.map((f) =>
        f.type === "date" ? (
          <label key={f.nom} className="flex min-w-0 flex-col">
            <span className="text-xs font-semibold text-gray-600">{f.libelle}</span>
            <input type="date" name={f.nom} defaultValue={valeurs[f.nom] ?? ""} className={`${saisie} w-full`} />
          </label>
        ) : (
          <label key={f.nom} className="flex min-w-0 flex-col">
            <span className="text-xs font-semibold text-gray-600">{f.libelle}</span>
            <select name={f.nom} defaultValue={valeurs[f.nom] ?? ""} className={`${saisie} w-full md:max-w-64`}>
              <option value="">Tous</option>
              {(f.options ?? []).map((o) => (
                <option key={o.valeur} value={o.valeur}>
                  {o.libelle}
                </option>
              ))}
            </select>
          </label>
        ),
      )}
      <button className="min-h-11 rounded bg-papel-700 px-3.5 font-medium text-white hover:bg-papel-800 md:min-h-9">Filtrer</button>
      {actifs && (
        <Link href="?" className="inline-flex min-h-11 items-center rounded px-2.5 text-papel-700 hover:bg-papel-50 md:min-h-9">
          Effacer
        </Link>
      )}
      {action}
    </form>
  );
}

/** Lit un paramètre de recherche (texte simple). */
export function lireParam(
  sp: Record<string, string | string[] | undefined>,
  nom: string,
): string | undefined {
  const v = sp[nom];
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

/** Échappe une saisie pour un filtre « ilike » de Supabase (les caractères % _ , ( ) ont un sens spécial). */
export function motifRecherche(q: string): string {
  return `%${q.replace(/[%_\\,()]/g, " ")}%`;
}
