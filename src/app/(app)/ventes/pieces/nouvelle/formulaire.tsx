"use client";

import { useActionState, useState } from "react";
import { Bouton, Champ, Message, Selection } from "@/components/ui";
import { ETAT_INITIAL } from "@/lib/formulaires/etat";
import { creerPiece } from "../../actions";

/** Les trois façons de commencer une vente, expliquées en une phrase (grands boutons à toucher plutôt qu'une liste). */
const TYPES = [
  { code: "devis", titre: "Devis", explication: "Le client demande un prix. Rien n'est réservé ni facturé." },
  { code: "commande", titre: "Commande", explication: "Le client a dit oui. On livrera, puis on facturera." },
  { code: "facture", titre: "Facture tout de suite", explication: "Vente immédiate : le client est facturé maintenant." },
];

export function FormulaireNouvellePiece({ clients, type, client, dateDuJour }: { clients: { id: string; libelle: string }[]; type: string; client?: string; dateDuJour: string }) {
  const [etat, action, enCours] = useActionState(creerPiece, ETAT_INITIAL);
  const v = etat.valeurs ?? {};
  const e = etat.erreurs ?? {};
  const [choix, setChoix] = useState(v.type_piece ?? type);
  return (
    <form action={action} className="flex flex-col gap-4">
      {etat.message && <Message ton="erreur">{etat.message}</Message>}
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-gray-700">1. Que voulez-vous faire ?</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {TYPES.map((t) => (
            <label
              key={t.code}
              className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border-2 p-3 ${choix === t.code ? "border-papel-600 bg-papel-50" : "border-gray-200 bg-white"}`}
            >
              <input type="radio" name="type_piece" value={t.code} checked={choix === t.code} onChange={() => setChoix(t.code)} className="mt-1 size-5 accent-papel-700" />
              <span>
                <span className="block font-semibold text-gray-900">{t.titre}</span>
                <span className="block text-sm text-gray-600">{t.explication}</span>
              </span>
            </label>
          ))}
        </div>
        {e.type_piece && <p className="mt-1 text-sm text-red-700">{e.type_piece}</p>}
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <Selection libelle="2. Pour quel client ?" name="client_id" defaultValue={v.client_id ?? client ?? ""} erreur={e.client_id}>
          <option value="">— Choisir le client —</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.libelle}
            </option>
          ))}
        </Selection>
        <Champ libelle="3. Date" name="date_piece" type="date" required defaultValue={v.date_piece ?? dateDuJour} erreur={e.date_piece} />
        <Champ libelle="Remarque imprimée sur le document (facultatif)" name="notes" defaultValue={v.notes} erreur={e.notes} className="sm:col-span-2" />
      </div>
      <Bouton type="submit" disabled={enCours} className="self-start">
        {enCours ? "Création…" : "Continuer : choisir les produits"}
      </Bouton>
    </form>
  );
}
