"use client";

import { useActionState } from "react";
import { Bouton, Champ, Message, Selection } from "@/components/ui";
import { ETAT_INITIAL } from "@/lib/formulaires/etat";
import { PRIORITES, TYPES_INTERVENTION } from "@/lib/maintenance/libelles";
import { creerIntervention } from "../actions";

export function FormulaireOt({ equipements }: { equipements: { id: string; libelle: string }[] }) {
  const [etat, action, enCours] = useActionState(creerIntervention, ETAT_INITIAL);
  const v = etat.valeurs ?? {};
  const e = etat.erreurs ?? {};
  return (
    <form action={action} className="flex flex-col gap-3">
      {etat.message && <Message ton="erreur">{etat.message}</Message>}
      <div className="grid gap-3 sm:grid-cols-3">
        <Selection libelle="Équipement" name="equipement_id" defaultValue={v.equipement_id ?? ""} erreur={e.equipement_id}>
          <option value="">— Choisir —</option>
          {equipements.map((x) => (
            <option key={x.id} value={x.id}>{x.libelle}</option>
          ))}
        </Selection>
        <Selection libelle="Type" name="type_intervention" defaultValue={v.type_intervention ?? "curative"}>
          {Object.entries(TYPES_INTERVENTION).map(([val, l]) => (
            <option key={val} value={val}>{l}</option>
          ))}
        </Selection>
        <Selection libelle="Priorité" name="priorite" defaultValue={v.priorite ?? "normale"}>
          {Object.entries(PRIORITES).map(([val, p]) => (
            <option key={val} value={val}>{p.libelle}</option>
          ))}
        </Selection>
        <Champ libelle="Description" name="description" defaultValue={v.description} erreur={e.description} className="sm:col-span-3" />
      </div>
      <label className="flex min-h-11 items-center gap-2">
        <input type="checkbox" name="arret_machine" defaultChecked={v.arret_machine === "on"} className="size-5 accent-papel-700" />
        Machine à l&apos;arrêt
      </label>
      <Bouton type="submit" disabled={enCours} className="self-start">Créer l&apos;ordre de travail</Bouton>
    </form>
  );
}
