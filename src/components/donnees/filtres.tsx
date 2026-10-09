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
  return (
    <form className="mb-3 flex flex-wrap items-end gap-2" role="search">
      <label className="flex min-w-48 flex-1 flex-col">
        <span className="text-sm font-medium text-gray-700">Recherche</span>
        <input
          type="search"
          name="q"
          defaultValue={recherche}
          placeholder={placeholder}
          className="min-h-11 rounded-lg border border-gray-300 bg-white px-3"
        />
      </label>
      {filtres.map((f) =>
        f.type === "date" ? (
          <label key={f.nom} className="flex min-w-0 flex-col">
            <span className="text-sm font-medium text-gray-700">
              {f.libelle}
            </span>
            <input
              type="date"
              name={f.nom}
              defaultValue={valeurs[f.nom] ?? ""}
              className="min-h-11 rounded-lg border border-gray-300 bg-white px-3"
            />
          </label>
        ) : (
          <label key={f.nom} className="flex min-w-0 flex-col">
            <span className="text-sm font-medium text-gray-700">
              {f.libelle}
            </span>
            <select
              name={f.nom}
              defaultValue={valeurs[f.nom] ?? ""}
              className="min-h-11 w-full max-w-64 rounded-lg border border-gray-300 bg-white px-3"
            >
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
      <button className="min-h-11 rounded-lg bg-papel-700 px-4 font-semibold text-white">
        Filtrer
      </button>
      {actifs && (
        <Link
          href="?"
          className="min-h-11 content-center px-2 text-papel-700 underline"
        >
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
