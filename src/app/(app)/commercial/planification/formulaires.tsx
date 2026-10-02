"use client";

import { useActionState, useState } from "react";
import { Bouton, Champ, Message, Selection } from "@/components/ui";
import { ETAT_INITIAL } from "@/lib/formulaires/etat";
import { enregistrerObjectifs, enregistrerTournee } from "../actions";

type Commercial = { id: string; nom: string };
type Pva = { id: string; nom: string; commercialId: string; repere: string };

export function FormulaireObjectifs({ commercial, mois, valeurs }: { commercial: Commercial; mois: string; valeurs: { visites: number; nouveaux_pva: number; ca_ht_gnf: number; colis: number } | null }) {
  const [etat, action, enCours] = useActionState(enregistrerObjectifs.bind(null, commercial.id, mois), ETAT_INITIAL);
  const e = etat.erreurs ?? {};
  return (
    <form action={action} className="flex flex-wrap items-end gap-2 border-b border-gray-100 py-3">
      <div className="w-full font-semibold sm:w-40">{commercial.nom}</div>
      <Champ libelle="Visites" name="visites" inputMode="numeric" defaultValue={valeurs?.visites ?? 0} erreur={e.visites} className="basis-24 flex-1" />
      <Champ libelle="Nouveaux PVA" name="nouveaux_pva" inputMode="numeric" defaultValue={valeurs?.nouveaux_pva ?? 0} erreur={e.nouveaux_pva} className="basis-24 flex-1" />
      <Champ libelle="CA HT (GNF)" name="ca_ht_gnf" inputMode="numeric" defaultValue={valeurs?.ca_ht_gnf ?? 0} erreur={e.ca_ht_gnf} className="basis-36 flex-1" />
      <Champ libelle="Colis" name="colis" inputMode="numeric" defaultValue={valeurs?.colis ?? 0} erreur={e.colis} className="basis-24 flex-1" />
      <Bouton type="submit" variante="secondaire" disabled={enCours}>
        Enregistrer
      </Bouton>
      {etat.message && <span className={etat.ok ? "w-full text-green-800" : "w-full text-red-700"}>{etat.message}</span>}
    </form>
  );
}

export function FormulaireTournee({ commerciaux, pva, dateDuJour }: { commerciaux: Commercial[]; pva: Pva[]; dateDuJour: string }) {
  const [etat, action, enCours] = useActionState(enregistrerTournee, ETAT_INITIAL);
  const [commercialId, setCommercialId] = useState(commerciaux[0]?.id ?? "");
  return (
    <form action={action} className="flex flex-col gap-3">
      {etat.message && <Message ton={etat.ok ? "succes" : "erreur"}>{etat.message}</Message>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Selection libelle="Commercial" name="commercial_id" value={commercialId} onChange={(e) => setCommercialId(e.target.value)} erreur={etat.erreurs?.commercial_id}>
          {commerciaux.map((c) => (
            <option key={c.id} value={c.id}>{c.nom}</option>
          ))}
        </Selection>
        <Champ libelle="Date" name="date_tournee" type="date" defaultValue={dateDuJour} erreur={etat.erreurs?.date_tournee} />
      </div>
      <fieldset>
        <legend className="mb-1 font-medium">Points de vente à visiter (dans l&apos;ordre de la liste)</legend>
        <div className="grid gap-1 sm:grid-cols-2">
          {pva
            .filter((p) => p.commercialId === commercialId)
            .map((p) => (
              <label key={p.id} className="flex min-h-11 items-center gap-2 rounded-lg border border-gray-200 px-3">
                <input type="checkbox" name="pva" value={p.id} className="size-5 accent-papel-700" />
                <span>
                  {p.nom} <span className="text-sm text-gray-600">{p.repere}</span>
                </span>
              </label>
            ))}
        </div>
        {etat.erreurs?.pva && <p className="text-sm font-medium text-red-700">{etat.erreurs.pva}</p>}
      </fieldset>
      <Bouton type="submit" disabled={enCours} className="self-start">
        Enregistrer la tournée
      </Bouton>
    </form>
  );
}
