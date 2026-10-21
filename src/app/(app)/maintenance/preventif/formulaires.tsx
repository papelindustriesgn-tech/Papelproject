"use client";

import { useActionState } from "react";
import { Bouton, Champ, Message, Selection } from "@/components/ui";
import { ETAT_INITIAL } from "@/lib/formulaires/etat";
import { creerPlan, genererPreventifs } from "../actions";

export function FormulairePlan({ equipements }: { equipements: { id: string; libelle: string }[] }) {
  const [etat, action, enCours] = useActionState(creerPlan, ETAT_INITIAL);
  const v = etat.ok ? {} : (etat.valeurs ?? {});
  const e = etat.erreurs ?? {};
  return (
    <form action={action} className="flex flex-col gap-3">
      {etat.message && <Message ton={etat.ok ? "succes" : "erreur"}>{etat.message}</Message>}
      <div className="grid gap-3 sm:grid-cols-3">
        <Selection libelle="Équipement" name="equipement_id" defaultValue={v.equipement_id ?? ""} erreur={e.equipement_id}>
          <option value="">— Choisir —</option>
          {equipements.map((x) => (
            <option key={x.id} value={x.id}>{x.libelle}</option>
          ))}
        </Selection>
        <Champ libelle="Opération" name="libelle" defaultValue={v.libelle} erreur={e.libelle} placeholder="Graissage, vidange…" />
        <Champ libelle="Tous les (jours)" name="frequence_jours" inputMode="numeric" defaultValue={v.frequence_jours} erreur={e.frequence_jours} />
        <Champ libelle="Durée estimée (min)" name="duree_estimee_min" inputMode="numeric" defaultValue={v.duree_estimee_min} erreur={e.duree_estimee_min} />
        <Champ libelle="Consignes" name="consignes" defaultValue={v.consignes} className="sm:col-span-2" />
      </div>
      <Bouton type="submit" disabled={enCours} className="self-start">Ajouter le plan</Bouton>
    </form>
  );
}

export function BoutonGenerer() {
  const [etat, action, enCours] = useActionState(genererPreventifs, ETAT_INITIAL);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <Bouton type="submit" disabled={enCours}>Créer les OT des 7 prochains jours</Bouton>
      {etat.message && <span role="status" className="text-sm">{etat.message}</span>}
    </form>
  );
}
