"use client";

import { useActionState } from "react";
import { Bouton, Champ, Message, Selection } from "@/components/ui";
import { ETAT_INITIAL } from "@/lib/formulaires/etat";
import { creerFiche } from "../../actions";

type Option = { id: string; libelle: string };

export function FormulaireNouvelleFiche({ postes, lignes, equipes, ordres, dateDuJour }: { postes: Option[]; lignes: Option[]; equipes: Option[]; ordres: Option[]; dateDuJour: string }) {
  const [etat, action, enCours] = useActionState(creerFiche, ETAT_INITIAL);
  const v = etat.valeurs ?? {};
  const e = etat.erreurs ?? {};
  const liste = (options: Option[]) => options.map((o) => <option key={o.id} value={o.id}>{o.libelle}</option>);
  return (
    <form action={action} className="flex flex-col gap-3">
      {etat.message && <Message ton="erreur">{etat.message}</Message>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Champ libelle="Date" name="date_production" type="date" required defaultValue={v.date_production ?? dateDuJour} max={dateDuJour} erreur={e.date_production} />
        <Selection libelle="Poste" name="poste_id" defaultValue={v.poste_id ?? ""} erreur={e.poste_id}>
          <option value="">— Choisir —</option>
          {liste(postes)}
        </Selection>
        <Selection libelle="Ligne" name="ligne_id" defaultValue={v.ligne_id ?? (lignes.length === 1 ? lignes[0].id : "")} erreur={e.ligne_id}>
          <option value="">— Choisir —</option>
          {liste(lignes)}
        </Selection>
        <Selection libelle="Équipe" name="equipe_id" defaultValue={v.equipe_id ?? ""} erreur={e.equipe_id}>
          <option value="">— Non précisée —</option>
          {liste(equipes)}
        </Selection>
        <Selection libelle="Ordre de fabrication" name="of_id" defaultValue={v.of_id ?? ""} erreur={e.of_id}>
          <option value="">— Aucun —</option>
          {liste(ordres)}
        </Selection>
      </div>
      <Bouton type="submit" disabled={enCours} className="self-start">
        Ouvrir la fiche
      </Bouton>
    </form>
  );
}
