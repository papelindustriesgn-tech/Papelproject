"use client";

import { useActionState } from "react";
import { Bouton, Champ, Message, Selection } from "@/components/ui";
import { ETAT_INITIAL } from "@/lib/formulaires/etat";
import { creerTournee } from "../../actions";

export function FormulaireTournee({ vehicules, chauffeurs, dateDuJour }: { vehicules: { id: string; libelle: string }[]; chauffeurs: { id: string; nom: string }[]; dateDuJour: string }) {
  const [etat, action, enCours] = useActionState(creerTournee, ETAT_INITIAL);
  const v = etat.valeurs ?? {};
  const e = etat.erreurs ?? {};
  return (
    <form action={action} className="flex flex-col gap-3">
      {etat.message && <Message ton="erreur">{etat.message}</Message>}
      <div className="grid gap-3 sm:grid-cols-3">
        <Champ libelle="Date" name="date_tournee" type="date" defaultValue={v.date_tournee ?? dateDuJour} erreur={e.date_tournee} />
        <Selection libelle="Véhicule" name="vehicule_id" defaultValue={v.vehicule_id ?? ""} erreur={e.vehicule_id}>
          <option value="">— Choisir —</option>
          {vehicules.map((x) => (
            <option key={x.id} value={x.id}>{x.libelle}</option>
          ))}
        </Selection>
        <Selection libelle="Chauffeur" name="chauffeur_id" defaultValue={v.chauffeur_id ?? ""} erreur={e.chauffeur_id}>
          <option value="">— Choisir —</option>
          {chauffeurs.map((x) => (
            <option key={x.id} value={x.id}>{x.nom}</option>
          ))}
        </Selection>
        <Champ libelle="Notes" name="notes" defaultValue={v.notes} className="sm:col-span-3" />
      </div>
      <Bouton type="submit" disabled={enCours} className="self-start">Créer et charger les bons</Bouton>
    </form>
  );
}
