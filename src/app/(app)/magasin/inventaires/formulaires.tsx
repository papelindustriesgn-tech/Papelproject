"use client";

import { useActionState, useState } from "react";
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
      <Champ libelle="Nom de l'inventaire" name="libelle" required erreur={etat.erreurs?.libelle} placeholder="Stock de départ, ou Inventaire de novembre" className="min-w-64 flex-1" />
      <Selection libelle="Quoi compter ?" name="famille" defaultValue="">
        <option value="">Tout le stock</option>
        {FAMILLES_ARTICLES.map((f) => (
          <option key={f.valeur} value={f.valeur}>
            {f.libelle}
          </option>
        ))}
      </Selection>
      <Bouton type="submit" disabled={enCours}>
        {enCours ? "Préparation…" : "Préparer la feuille de comptage"}
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

/**
 * Feuille de comptage : une case par article (ou par bobine). Une seule feuille, deux boutons : enregistrer pour continuer
 * plus tard, ou valider. Les cases laissées vides gardent le stock de l'ERP (aucun écart) : un comptage partiel ne bloque plus.
 */
export function FeuilleComptage({ inventaireId, lignes, modifiable }: { inventaireId: string; lignes: LigneComptage[]; modifiable: boolean }) {
  const [etat, enregistrer, enCours] = useActionState(enregistrerComptages.bind(null, inventaireId), ETAT_INITIAL);
  const [etatValidation, valider, validationEnCours] = useActionState(validerInventaire.bind(null, inventaireId), ETAT_INITIAL);
  const [confirmer, setConfirmer] = useState(false);
  const [saisies, setSaisies] = useState<Record<string, string>>({});
  const remplie = (l: LigneComptage) => (saisies[l.id] !== undefined ? saisies[l.id].trim() !== "" : l.comptee !== null);
  const comptees = lignes.filter(remplie).length;
  const restantes = lignes.length - comptees;
  const message = etatValidation.message ? etatValidation : etat;
  const valeurs = { ...(etat.valeurs ?? {}), ...(etatValidation.valeurs ?? {}) };
  const erreurs = { ...(etat.erreurs ?? {}), ...(etatValidation.erreurs ?? {}) };

  if (!lignes.length) {
    return (
      <p className="text-gray-700">
        Aucun article à compter dans ce périmètre. Les <strong>bobines</strong> ne s&apos;entrent pas par l&apos;inventaire : chaque bobine reçue
        s&apos;enregistre dans <a href="/magasin/bobines" className="font-semibold text-papel-700 underline">Bobines → Réceptionner</a> (numéro et poids).
      </p>
    );
  }

  return (
    <form className="flex flex-col gap-3">
      {modifiable && (
        <div className="rounded-xl bg-papel-50 p-3" role="status">
          <div className="flex items-baseline justify-between gap-2 font-semibold text-papel-900">
            <span>
              {comptees} compté(s) sur {lignes.length}
            </span>
            {restantes > 0 && <span className="text-sm font-normal">Les cases vides gardent le stock actuel</span>}
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-papel-600 transition-all" style={{ width: `${(comptees / lignes.length) * 100}%` }} />
          </div>
        </div>
      )}
      {message.message && <Message ton={message.ok ? "succes" : "erreur"}>{message.message}</Message>}
      <ul className="divide-y divide-gray-100">
        {lignes.map((l) => {
          const brut = saisies[l.id] ?? valeurs[`compte_${l.id}`] ?? (l.comptee === null ? "" : String(l.comptee).replace(".", ","));
          const n = brut.trim() === "" ? null : Number(brut.replace(/\s/g, "").replace(",", "."));
          const ecart = n === null || Number.isNaN(n) ? null : Math.round((n - l.theorique) * 1000) / 1000;
          return (
            <li key={l.id} className="flex flex-wrap items-center gap-3 py-2.5">
              <div className="min-w-48 flex-1">
                <div className="font-semibold">{l.libelle}</div>
                {l.lot && <div className="font-mono text-sm text-gray-600">Bobine n° {l.lot}</div>}
                <div className="text-sm text-gray-600">
                  Dans l&apos;ERP : {l.theorique.toLocaleString("fr-FR")} {l.unite}
                  {ecart !== null && ecart !== 0 && (
                    <span className={`ml-2 font-semibold ${ecart > 0 ? "text-green-800" : "text-red-800"}`}>
                      {ecart > 0 ? "+" : ""}
                      {ecart.toLocaleString("fr-FR")} {l.unite} {ecart > 0 ? "en plus" : "en moins"}
                    </span>
                  )}
                  {ecart === 0 && <span className="ml-2 font-semibold text-gray-700">✓ juste</span>}
                </div>
                {erreurs[`compte_${l.id}`] && <div className="text-sm font-semibold text-red-700">{erreurs[`compte_${l.id}`]}</div>}
              </div>
              <label className="flex items-center gap-2">
                <span className="sr-only">Quantité comptée pour {l.libelle}</span>
                <input
                  name={`compte_${l.id}`}
                  inputMode="decimal"
                  disabled={!modifiable}
                  value={brut}
                  onChange={(e) => setSaisies((s) => ({ ...s, [l.id]: e.target.value }))}
                  aria-invalid={erreurs[`compte_${l.id}`] ? true : undefined}
                  placeholder="Compté"
                  className="min-h-11 w-32 rounded-xl border border-gray-300 px-3 text-right disabled:bg-gray-100 md:min-h-10"
                />
                <span className="w-10 text-gray-700">{l.unite}</span>
              </label>
            </li>
          );
        })}
      </ul>
      {modifiable && (
        <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t border-gray-100 bg-white/95 p-4 backdrop-blur md:-mx-5 md:px-5">
          {!confirmer ? (
            <div className="flex flex-wrap gap-2">
              <Bouton type="button" onClick={() => setConfirmer(true)}>
                Valider l&apos;inventaire
              </Bouton>
              <Bouton type="submit" formAction={enregistrer} variante="secondaire" disabled={enCours}>
                {enCours ? "Enregistrement…" : "Enregistrer et continuer plus tard"}
              </Bouton>
            </div>
          ) : (
            <div className="flex flex-col gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3">
              <p>
                Le stock de l&apos;ERP va prendre les quantités comptées.
                {restantes > 0 && ` Les ${restantes} case(s) vide(s) gardent le stock actuel.`} <strong>On ne peut pas revenir en arrière</strong> (une
                erreur se corrige par un nouvel inventaire).
              </p>
              <div className="flex flex-wrap gap-2">
                <Bouton type="submit" formAction={valider} disabled={validationEnCours}>
                  {validationEnCours ? "Validation…" : "Oui, valider"}
                </Bouton>
                <Bouton type="button" variante="discret" onClick={() => setConfirmer(false)}>
                  Non, je vérifie encore
                </Bouton>
              </div>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
