"use client";

import { useActionState } from "react";
import { Bouton, Champ, Message, Selection } from "@/components/ui";
import { ETAT_INITIAL } from "@/lib/formulaires/etat";
import { PRIORITES } from "@/lib/maintenance/libelles";
import { signalerPanne } from "@/lib/maintenance/signalement";

/** Signalement d'une panne (production, maintenance). */
export function FormulairePanne({ espace, equipements }: { espace: string; equipements: { id: string; libelle: string }[] }) {
  const [etat, action, enCours] = useActionState(signalerPanne.bind(null, espace), ETAT_INITIAL);
  const v = etat.ok ? {} : (etat.valeurs ?? {});
  const e = etat.erreurs ?? {};
  return (
    <form action={action} className="flex flex-col gap-3">
      {etat.message && <Message ton={etat.ok ? "succes" : "erreur"}>{etat.message}</Message>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Selection libelle="Équipement" name="equipement_id" defaultValue={v.equipement_id ?? ""} erreur={e.equipement_id}>
          <option value="">— Choisir —</option>
          {equipements.map((x) => (
            <option key={x.id} value={x.id}>{x.libelle}</option>
          ))}
        </Selection>
        <Selection libelle="Priorité" name="priorite" defaultValue={v.priorite ?? "urgente"}>
          {Object.entries(PRIORITES).map(([val, p]) => (
            <option key={val} value={val}>{p.libelle}</option>
          ))}
        </Selection>
        <Champ libelle="Description de la panne" name="description" defaultValue={v.description} erreur={e.description} className="sm:col-span-2" />
      </div>
      <label className="flex min-h-11 items-center gap-2">
        <input type="checkbox" name="arret_machine" defaultChecked={v.arret_machine !== undefined ? v.arret_machine === "on" : true} className="size-5 accent-papel-700" />
        La machine est à l&apos;arrêt
      </label>
      <Bouton type="submit" disabled={enCours} className="self-start">Signaler la panne</Bouton>
    </form>
  );
}
