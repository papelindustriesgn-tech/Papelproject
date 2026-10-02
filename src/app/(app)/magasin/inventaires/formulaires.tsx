"use client";

import { useActionState } from "react";
import { Bouton, Champ, Message, Selection } from "@/components/ui";
import { ETAT_INITIAL } from "@/lib/formulaires/etat";
import { FAMILLES_ARTICLES } from "@/lib/referentiels/definitions";
import { enregistrerComptages, ouvrirInventaire, validerInventaire } from "../actions";

export function FormulaireOuverture() {
  const [etat, action, enCours] = useActionState(ouvrirInventaire, ETAT_INITIAL);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      {etat.message && (
        <div className="w-full">
          <Message ton="erreur">{etat.message}</Message>
        </div>
      )}
      <Champ libelle="Nom de l'inventaire" name="libelle" required erreur={etat.erreurs?.libelle} placeholder="Inventaire mensuel – octobre" className="min-w-64 flex-1" />
      <Selection libelle="Périmètre" name="famille" defaultValue="">
        <option value="">Tout le stock</option>
        {FAMILLES_ARTICLES.map((f) => (
          <option key={f.valeur} value={f.valeur}>
            {f.libelle}
          </option>
        ))}
      </Selection>
      <Bouton type="submit" disabled={enCours}>
        Ouvrir l&apos;inventaire
      </Bouton>
    </form>
  );
}

export interface LigneComptage {
  id: string;
  libelle: string;
  lot: string | null;
  unite: string;
  theorique: number;
  comptee: number | null;
}

/** Feuille de comptage : une case par article / bobine. Le stock théorique est affiché pour aider le contrôle. */
export function FeuilleComptage({ inventaireId, lignes, modifiable }: { inventaireId: string; lignes: LigneComptage[]; modifiable: boolean }) {
  const [etat, action, enCours] = useActionState(enregistrerComptages.bind(null, inventaireId), ETAT_INITIAL);
  const [etatValidation, valider, validationEnCours] = useActionState(validerInventaire.bind(null, inventaireId), ETAT_INITIAL);
  const restantes = lignes.filter((l) => l.comptee === null).length;
  return (
    <div className="flex flex-col gap-3">
      <form action={action} className="flex flex-col gap-3">
        {etat.message && <Message ton={etat.ok ? "succes" : "erreur"}>{etat.message}</Message>}
        <ul className="divide-y divide-gray-100">
          {lignes.map((l) => {
            const ecart = l.comptee === null ? null : l.comptee - l.theorique;
            return (
              <li key={l.id} className="flex flex-wrap items-center gap-3 py-2">
                <div className="min-w-48 flex-1">
                  <div className="font-semibold">{l.libelle}</div>
                  {l.lot && <div className="font-mono text-sm text-gray-600">Lot {l.lot}</div>}
                  <div className="text-sm text-gray-600">
                    Théorique : {l.theorique.toLocaleString("fr-FR")} {l.unite}
                    {ecart !== null && ecart !== 0 && (
                      <span className={`ml-2 font-semibold ${ecart > 0 ? "text-green-800" : "text-red-800"}`}>
                        Écart : {ecart > 0 ? "+" : ""}
                        {ecart.toLocaleString("fr-FR")}
                      </span>
                    )}
                  </div>
                </div>
                <label className="flex items-center gap-2">
                  <span className="sr-only">Quantité comptée pour {l.libelle}</span>
                  <input
                    name={`compte_${l.id}`}
                    inputMode="decimal"
                    disabled={!modifiable}
                    defaultValue={etat.valeurs?.[`compte_${l.id}`] ?? (l.comptee === null ? "" : String(l.comptee).replace(".", ","))}
                    aria-invalid={etat.erreurs?.[`compte_${l.id}`] ? true : undefined}
                    placeholder="Compté"
                    className="min-h-11 w-32 rounded-lg border border-gray-300 px-3 disabled:bg-gray-100"
                  />
                  <span className="text-gray-700">{l.unite}</span>
                </label>
              </li>
            );
          })}
        </ul>
        {modifiable && (
          <Bouton type="submit" variante="secondaire" disabled={enCours} className="self-start">
            Enregistrer les comptages
          </Bouton>
        )}
      </form>
      {modifiable && (
        <form action={valider} className="flex flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3">
          {etatValidation.message && <Message ton={etatValidation.ok ? "succes" : "erreur"}>{etatValidation.message}</Message>}
          <p>{restantes > 0 ? `Encore ${restantes} ligne(s) à compter avant de pouvoir valider.` : "Toutes les lignes sont comptées. La validation passe les écarts en stock (action définitive)."}</p>
          <Bouton type="submit" disabled={validationEnCours || restantes > 0} className="self-start">
            Valider l&apos;inventaire
          </Bouton>
        </form>
      )}
    </div>
  );
}
