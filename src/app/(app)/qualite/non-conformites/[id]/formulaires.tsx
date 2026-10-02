"use client";

import { useActionState } from "react";
import { Bouton, Champ, Message, Selection } from "@/components/ui";
import { ETAT_INITIAL } from "@/lib/formulaires/etat";
import { GRAVITES_NC } from "@/lib/qualite/libelles";
import { ajouterAction, analyserNc, cloturerNc } from "../../actions";

export function FormulaireAnalyse({ ncId, cause, statut, gravite }: { ncId: string; cause: string; statut: string; gravite: string }) {
  const [etat, action, enCours] = useActionState(analyserNc.bind(null, ncId), ETAT_INITIAL);
  return (
    <form action={action} className="flex flex-col gap-3">
      {etat.message && <Message ton={etat.ok ? "succes" : "erreur"}>{etat.message}</Message>}
      <label className="flex flex-col">
        <span className="text-sm font-medium text-gray-700">Cause racine (analyse des 5 pourquoi, 5M…)</span>
        <textarea name="cause_racine" defaultValue={cause} rows={3} className="rounded-lg border border-gray-300 p-3" />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <Selection libelle="Gravité" name="gravite" defaultValue={gravite} erreur={etat.erreurs?.gravite}>
          {Object.entries(GRAVITES_NC).map(([v, g]) => (
            <option key={v} value={v}>{g.libelle}</option>
          ))}
        </Selection>
        <Selection libelle="Statut" name="statut" defaultValue={statut}>
          <option value="ouverte">Ouverte</option>
          <option value="en_traitement">En traitement</option>
        </Selection>
      </div>
      <Bouton type="submit" disabled={enCours} variante="secondaire" className="self-start">Enregistrer l&apos;analyse</Bouton>
    </form>
  );
}

export function FormulaireAction({ ncId }: { ncId: string }) {
  const [etat, action, enCours] = useActionState(ajouterAction.bind(null, ncId), ETAT_INITIAL);
  const v = etat.ok ? {} : (etat.valeurs ?? {});
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      {etat.message && <div className="w-full"><Message ton={etat.ok ? "succes" : "erreur"}>{etat.message}</Message></div>}
      <Champ libelle="Action corrective" name="description" defaultValue={v.description} erreur={etat.erreurs?.description} className="basis-64 flex-[2]" />
      <Champ libelle="Responsable" name="responsable" defaultValue={v.responsable} className="basis-40 flex-1" />
      <Champ libelle="Échéance" name="echeance" type="date" defaultValue={v.echeance} erreur={etat.erreurs?.echeance} className="basis-36" />
      <Bouton type="submit" disabled={enCours}>Ajouter</Bouton>
    </form>
  );
}

export function BoutonCloturer({ ncId }: { ncId: string }) {
  const [etat, action, enCours] = useActionState(cloturerNc.bind(null, ncId), ETAT_INITIAL);
  return (
    <form action={action} className="flex flex-col gap-2">
      {etat.message && <Message ton="erreur">{etat.message}</Message>}
      <Bouton type="submit" disabled={enCours} className="self-start">Clôturer la non-conformité</Bouton>
    </form>
  );
}
