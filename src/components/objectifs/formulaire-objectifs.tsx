"use client";

import { ArrowDownToLine } from "lucide-react";
import { useActionState, useRef } from "react";
import { Bouton, Message } from "@/components/ui";
import { ETAT_INITIAL } from "@/lib/formulaires/etat";
import { enregistrerObjectifs } from "@/lib/objectifs/actions";
import { UNITES_SAISIE, type DefinitionObjectif } from "@/lib/objectifs/catalogue";

const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

/**
 * Grille de saisie des objectifs d'une année : une ligne par mois, une colonne par indicateur du service.
 * « Recopier » remplit les mois vides d'une colonne avec la valeur du mois précédent (objectif constant).
 */
export function FormulaireObjectifs({
  espace,
  annee,
  definitions,
  valeurs,
  modifiable,
}: {
  espace: string;
  annee: number;
  definitions: DefinitionObjectif[];
  /** Valeurs actuelles, déjà dans l'unité de saisie, par nom de champ `o|<code>|<AAAA-MM>`. */
  valeurs: Record<string, string>;
  modifiable: boolean;
}) {
  const [etat, action, enCours] = useActionState(enregistrerObjectifs.bind(null, espace, annee), ETAT_INITIAL);
  const formulaire = useRef<HTMLFormElement>(null);
  const v = etat.ok ? valeurs : { ...valeurs, ...(etat.valeurs ?? {}) };
  const e = etat.erreurs ?? {};
  const nom = (code: string, m: number) => `o|${code}|${annee}-${String(m).padStart(2, "0")}`;

  const recopier = (code: string) => {
    const f = formulaire.current;
    if (!f) return;
    let precedent = "";
    for (let m = 1; m <= 12; m++) {
      const champ = f.elements.namedItem(nom(code, m)) as HTMLInputElement | null;
      if (!champ) continue;
      if (champ.value.trim() === "" && precedent) champ.value = precedent;
      else if (champ.value.trim() !== "") precedent = champ.value;
    }
  };

  return (
    <form ref={formulaire} action={action} key={etat.ok ? `ok-${annee}` : undefined} className="flex flex-col gap-3">
      {etat.message && <Message ton={etat.ok ? "succes" : "erreur"}>{etat.message}</Message>}
      <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <table className="w-full min-w-max border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-10 bg-white px-2 py-2 text-left font-semibold text-gray-700">
                Mois {annee}
              </th>
              {definitions.map((d) => (
                <th key={d.code} scope="col" className="max-w-44 px-2 py-2 text-left align-bottom font-semibold text-gray-700">
                  <span className="block leading-tight">{d.libelle}</span>
                  <span className="block text-xs font-normal text-gray-500">
                    en {UNITES_SAISIE[d.unite]}
                    {d.hausseBonne ? "" : " · maximum"}
                  </span>
                  {modifiable && (
                    <button type="button" onClick={() => recopier(d.code)} className="mt-1 inline-flex min-h-8 items-center gap-1 rounded-lg px-1.5 text-xs font-semibold text-papel-700 hover:bg-papel-50" title="Remplir les mois vides avec la valeur du mois précédent">
                      <ArrowDownToLine size={14} aria-hidden /> Recopier
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MOIS.map((libelle, i) => (
              <tr key={libelle} className="odd:bg-gray-50/60">
                <th scope="row" className="sticky left-0 z-10 bg-inherit px-2 py-1 text-left font-semibold text-gray-900">
                  {libelle}
                </th>
                {definitions.map((d) => {
                  const n = nom(d.code, i + 1);
                  return (
                    <td key={d.code} className="px-2 py-1">
                      <input
                        name={n}
                        defaultValue={v[n] ?? ""}
                        disabled={!modifiable}
                        inputMode="decimal"
                        aria-label={`${d.libelle} – ${libelle} ${annee}`}
                        aria-invalid={e[n] ? true : undefined}
                        className={`min-h-11 w-36 rounded-xl border bg-white px-3 text-right tabular-nums outline-none focus:border-papel-600 focus:ring-2 focus:ring-papel-200 disabled:bg-gray-50 disabled:text-gray-700 md:min-h-10 ${e[n] ? "border-red-600" : "border-gray-300"}`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modifiable ? (
        <Bouton type="submit" disabled={enCours} className="self-start">
          {enCours ? "Enregistrement…" : "Enregistrer les objectifs"}
        </Bouton>
      ) : (
        <p className="text-sm text-gray-600">Les objectifs sont fixés par la Direction.</p>
      )}
    </form>
  );
}
