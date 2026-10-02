"use client";

import { useActionState, useId, useState } from "react";
import { Bouton, Message } from "@/components/ui";
import { ETAT_INITIAL } from "@/lib/formulaires/etat";
import { enregistrerLigne, supprimerLigne } from "@/lib/referentiels/actions";
import type { ChampReferentiel } from "@/lib/referentiels/definitions";

export type OptionsReferences = Record<string, { valeur: string; libelle: string }[]>;

function SaisieChamp({ c, valeur, erreur, options, desactive }: { c: ChampReferentiel; valeur?: string; erreur?: string; options: OptionsReferences; desactive?: boolean }) {
  const id = useId();
  const base = `min-h-11 w-full rounded-lg border bg-white px-3 ${erreur ? "border-red-600" : "border-gray-300"} disabled:bg-gray-100`;
  const choix = c.type === "choix" ? (c.options ?? []) : c.type === "reference" ? (options[c.nom] ?? []) : null;
  return (
    <label htmlFor={id} className="flex min-w-0 flex-1 basis-36 flex-col gap-1">
      <span className="text-sm font-medium text-gray-700">
        {c.libelle}
        {c.requis && <span className="text-red-700"> *</span>}
      </span>
      {choix ? (
        <select id={id} name={c.nom} defaultValue={valeur ?? ""} disabled={desactive} className={base} aria-invalid={erreur ? true : undefined}>
          <option value="">— Choisir —</option>
          {choix.map((o) => (
            <option key={o.valeur} value={o.valeur}>
              {o.libelle}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          name={c.nom}
          defaultValue={c.type === "heure" ? (valeur ?? "").slice(0, 5) : c.type === "decimal" ? (valeur ?? "").replace(".", ",") : (valeur ?? "")}
          disabled={desactive}
          inputMode={c.type === "entier" ? "numeric" : c.type === "decimal" ? "decimal" : undefined}
          type={c.type === "date" ? "date" : c.type === "heure" ? "time" : "text"}
          className={base}
          aria-invalid={erreur ? true : undefined}
        />
      )}
      {erreur && <span className="text-sm font-medium text-red-700">{erreur}</span>}
    </label>
  );
}

/** Formulaire d'ajout (id = null) ou de modification d'une ligne d'une liste de référence. */
export function FormulaireLigne({
  espace,
  code,
  id,
  champs,
  valeurs,
  options,
}: {
  espace: string;
  code: string;
  id: string | null;
  champs: ChampReferentiel[];
  valeurs?: Record<string, string>;
  options: OptionsReferences;
}) {
  const [etat, action, enCours] = useActionState(enregistrerLigne.bind(null, espace, code, id), ETAT_INITIAL);
  const v = id === null && etat.ok ? {} : { ...valeurs, ...(etat.ok ? {} : etat.valeurs) };
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      {champs.map((c) => (
        <SaisieChamp key={c.nom} c={c} valeur={v[c.nom]} erreur={etat.erreurs?.[c.nom]} options={options} desactive={id !== null && c.figeApresCreation} />
      ))}
      <Bouton type="submit" variante={id === null ? "principal" : "secondaire"} disabled={enCours}>
        {id === null ? "Ajouter" : "Enregistrer"}
      </Bouton>
      {etat.message && (
        <div className="w-full">
          <Message ton={etat.ok ? "succes" : "erreur"}>{etat.message}</Message>
        </div>
      )}
    </form>
  );
}

export function BoutonSupprimer({ espace, code, id }: { espace: string; code: string; id: string }) {
  const [etat, action, enCours] = useActionState(supprimerLigne.bind(null, espace, code, id), ETAT_INITIAL);
  const [confirmer, setConfirmer] = useState(false);
  if (!confirmer)
    return (
      <Bouton type="button" variante="discret" onClick={() => setConfirmer(true)}>
        Supprimer
      </Bouton>
    );
  return (
    <form action={action} className="flex items-center gap-2">
      <Bouton type="submit" variante="danger" disabled={enCours}>
        Confirmer la suppression
      </Bouton>
      <Bouton type="button" variante="discret" onClick={() => setConfirmer(false)}>
        Annuler
      </Bouton>
      {etat.message && <span className={etat.ok ? "text-green-800" : "font-medium text-red-700"}>{etat.message}</span>}
    </form>
  );
}
