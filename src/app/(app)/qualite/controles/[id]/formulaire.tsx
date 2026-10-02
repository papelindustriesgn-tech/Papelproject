"use client";

import { useActionState, useState } from "react";
import { Bouton, Message } from "@/components/ui";
import { ETAT_INITIAL } from "@/lib/formulaires/etat";
import { lireNombre } from "@/lib/formulaires/nombres";
import { libelleTolerance, mesureConforme } from "@/lib/metier/qualite";
import { saisirEtValiderControle } from "../../actions";

export interface CritereSaisie {
  id: string;
  libelle: string;
  type_mesure: string;
  unite: string;
  valeur_min: number | null;
  valeur_max: number | null;
}

/** Saisie des mesures : la conformité s'affiche immédiatement (même règle que la base, qui recalcule à l'enregistrement). */
export function FormulaireMesures({ controleId, criteres }: { controleId: string; criteres: CritereSaisie[] }) {
  const [etat, action, enCours] = useActionState(saisirEtValiderControle.bind(null, controleId), ETAT_INITIAL);
  const [valeurs, setValeurs] = useState<Record<string, string>>(etat.valeurs ?? {});
  const e = etat.erreurs ?? {};
  return (
    <form action={action} className="flex flex-col gap-3">
      {etat.message && <Message ton="erreur">{etat.message}</Message>}
      {criteres.map((c) => {
        const tol = { min: c.valeur_min, max: c.valeur_max };
        const n = lireNombre(valeurs[`valeur_${c.id}`] ?? "");
        const verdict = c.type_mesure === "mesure" && n !== null ? mesureConforme(n, tol) : null;
        return (
          <fieldset key={c.id} className="rounded-lg border border-gray-200 p-3">
            <legend className="px-1 font-semibold">{c.libelle}</legend>
            {c.type_mesure === "mesure" ? (
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex min-w-0 flex-col">
                  <span className="text-sm text-gray-700">Valeur{c.unite ? ` (${c.unite})` : ""} — tolérance {libelleTolerance(tol, c.unite)}</span>
                  <input
                    name={`valeur_${c.id}`}
                    inputMode="decimal"
                    aria-label={`${c.libelle} : valeur`}
                    value={valeurs[`valeur_${c.id}`] ?? ""}
                    onChange={(ev) => setValeurs({ ...valeurs, [`valeur_${c.id}`]: ev.target.value })}
                    className="min-h-11 w-40 rounded-lg border border-gray-300 px-3"
                  />
                </label>
                {verdict !== null && <span className={`font-semibold ${verdict ? "text-papel-700" : "text-red-700"}`}>{verdict ? "Conforme" : "Hors tolérance"}</span>}
                {e[`valeur_${c.id}`] && <span className="text-sm text-red-700">{e[`valeur_${c.id}`]}</span>}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {[
                  ["conforme", "Conforme"],
                  ["non_conforme", "Non conforme"],
                ].map(([v, l]) => (
                  <label key={v} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3">
                    <input type="radio" name={`visuel_${c.id}`} value={v} defaultChecked={etat.valeurs?.[`visuel_${c.id}`] === v} className="size-5 accent-papel-700" aria-label={`${c.libelle} : ${l}`} />
                    {l}
                  </label>
                ))}
              </div>
            )}
            <input name={`commentaire_${c.id}`} placeholder="Commentaire (facultatif)" aria-label={`${c.libelle} : commentaire`} defaultValue={etat.valeurs?.[`commentaire_${c.id}`]} className="mt-2 min-h-11 w-full rounded-lg border border-gray-300 px-3" />
          </fieldset>
        );
      })}
      <label className="flex flex-col">
        <span className="text-sm font-medium text-gray-700">Observations</span>
        <input name="notes" defaultValue={etat.valeurs?.notes} className="min-h-11 rounded-lg border border-gray-300 px-3" />
      </label>
      <p className="text-sm text-gray-700">Les critères laissés vides ne sont pas comptés. Une mesure hors tolérance rend le contrôle non conforme : une non-conformité est ouverte et, à réception, la bobine est bloquée.</p>
      <Bouton type="submit" disabled={enCours} className="self-start">Enregistrer et valider le contrôle</Bouton>
    </form>
  );
}
