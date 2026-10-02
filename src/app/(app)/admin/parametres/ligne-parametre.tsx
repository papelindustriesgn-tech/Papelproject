"use client";

import { useActionState } from "react";
import { Bouton } from "@/components/ui";
import { ETAT_INITIAL } from "@/lib/formulaires/etat";
import { versPourcentage } from "@/lib/formulaires/nombres";
import { modifierParametre } from "./actions";

export interface Parametre {
  cle: string;
  libelle: string;
  description: string;
  type_valeur: string;
  unite: string | null;
  valeur: unknown;
}

function valeurAffichee(p: Parametre): string {
  if (p.type_valeur === "pourcentage") return versPourcentage(Number(p.valeur));
  if (p.type_valeur === "liste") return Array.isArray(p.valeur) ? p.valeur.join(", ") : "";
  return String(p.valeur ?? "");
}

/** Un paramètre = une ligne avec son propre bouton « Enregistrer ». */
export function LigneParametre({ p }: { p: Parametre }) {
  const [etat, action, enCours] = useActionState(modifierParametre.bind(null, p.cle), ETAT_INITIAL);
  const id = `param-${p.cle}`;
  return (
    <form action={action} className="flex flex-col gap-2 border-b border-gray-100 py-3 sm:flex-row sm:items-center">
      <div className="sm:w-1/2">
        <label htmlFor={id} className="font-medium">
          {p.libelle}
        </label>
        {p.description && <p className="text-sm text-gray-600">{p.description}</p>}
      </div>
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {p.type_valeur === "booleen" ? (
          <input id={id} name="valeur" type="checkbox" defaultChecked={p.valeur === true} className="size-6 accent-papel-700" />
        ) : (
          <input
            id={id}
            name="valeur"
            defaultValue={valeurAffichee(p)}
            inputMode={["nombre", "pourcentage", "entier"].includes(p.type_valeur) ? "decimal" : undefined}
            aria-invalid={etat.erreurs?.valeur ? true : undefined}
            className="min-h-11 w-40 flex-1 rounded-lg border border-gray-300 px-3 sm:max-w-xs"
          />
        )}
        <span className="text-gray-600">{p.type_valeur === "pourcentage" ? "%" : p.unite}</span>
        <Bouton type="submit" variante="secondaire" disabled={enCours}>
          Enregistrer
        </Bouton>
        {(etat.erreurs?.valeur || etat.message) && (
          <p role="status" className={`w-full text-sm font-medium ${etat.ok ? "text-green-800" : "text-red-700"}`}>
            {etat.erreurs?.valeur ?? etat.message}
          </p>
        )}
      </div>
    </form>
  );
}
