"use client";

import { Check, Copy } from "lucide-react";
import { useActionState, useState } from "react";
import { Bouton, Champ, Message } from "@/components/ui";
import type { JeuExcel } from "@/lib/excel/jeux";
import { creerCle } from "./actions";

function BoutonCopier({ texte }: { texte: string }) {
  const [copie, setCopie] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(texte);
        setCopie(true);
        setTimeout(() => setCopie(false), 2000);
      }}
      className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded bg-papel-700 px-3 text-sm font-medium text-white hover:bg-papel-800 md:min-h-9"
    >
      {copie ? <Check size={16} /> : <Copy size={16} />} {copie ? "Copié" : "Copier"}
    </button>
  );
}

/** Création d'une connexion : affiche une seule fois les adresses à coller dans Excel. */
export function FormulaireCle({ base, jeux }: { base: string; jeux: JeuExcel[] }) {
  const [etat, action, enCours] = useActionState(creerCle, {});
  if (etat.cle) {
    return (
      <div className="flex flex-col gap-3">
        <Message ton="succes">Connexion créée. Copiez maintenant les adresses dont vous avez besoin : elles ne seront plus affichées.</Message>
        <ul className="flex flex-col gap-2">
          {jeux.map((j) => {
            const adresse = `${base}/api/excel/${j.code}?cle=${etat.cle}`;
            return (
              <li key={j.code} className="flex flex-col gap-1 rounded border border-gray-200 p-2 md:flex-row md:items-center md:justify-between">
                <span className="min-w-0">
                  <span className="block font-semibold">{j.libelle}</span>
                  <span className="block truncate font-mono text-xs text-gray-500">{adresse}</span>
                </span>
                <BoutonCopier texte={adresse} />
              </li>
            );
          })}
        </ul>
        <p className="text-sm text-gray-600">Pour une période précise, ajoutez à la fin de l&apos;adresse : <span className="font-mono">&amp;du=2026-01-01&amp;au=2026-12-31</span> (sinon : depuis le 1er janvier).</p>
      </div>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-3 md:flex-row md:items-end">
      {etat.message && <Message ton="erreur">{etat.message}</Message>}
      <Champ libelle="Nom de la connexion" name="libelle" placeholder="Ex. Excel du comptable" required className="md:w-80" />
      <Bouton type="submit" disabled={enCours}>
        {enCours ? "Création…" : "Créer la connexion"}
      </Bouton>
    </form>
  );
}
