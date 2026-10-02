"use client";

import { useActionState } from "react";
import { Bouton, Champ, Message, Selection } from "@/components/ui";
import { ETAT_INITIAL } from "@/lib/formulaires/etat";
import { creerOrdre } from "../actions";

type Option = { id: string; libelle: string };

export function FormulaireOrdre({ conditionnements, campagnes, lignes, dateDuJour }: { conditionnements: Option[]; campagnes: Option[]; lignes: Option[]; dateDuJour: string }) {
  const [etat, action, enCours] = useActionState(creerOrdre, ETAT_INITIAL);
  const v = etat.ok ? {} : (etat.valeurs ?? {});
  const e = etat.erreurs ?? {};
  const liste = (o: Option[]) => o.map((x) => <option key={x.id} value={x.id}>{x.libelle}</option>);
  return (
    <form action={action} className="flex flex-col gap-3">
      {etat.message && <Message ton={etat.ok ? "succes" : "erreur"}>{etat.message}</Message>}
      <div className="grid gap-3 sm:grid-cols-3">
        <Selection libelle="Produit et colis" name="conditionnement_id" defaultValue={v.conditionnement_id ?? ""} erreur={e.conditionnement_id}>
          <option value="">— Choisir —</option>
          {liste(conditionnements)}
        </Selection>
        <Champ libelle="Quantité visée (colis)" name="quantite_colis" inputMode="numeric" required defaultValue={v.quantite_colis} erreur={e.quantite_colis} />
        <Selection libelle="Ligne" name="ligne_id" defaultValue={v.ligne_id ?? (lignes.length === 1 ? lignes[0].id : "")} erreur={e.ligne_id}>
          <option value="">— Non précisée —</option>
          {liste(lignes)}
        </Selection>
        <Champ libelle="Début prévu" name="date_debut_prevue" type="date" required defaultValue={v.date_debut_prevue ?? dateDuJour} erreur={e.date_debut_prevue} />
        <Champ libelle="Fin prévue" name="date_fin_prevue" type="date" required defaultValue={v.date_fin_prevue ?? dateDuJour} erreur={e.date_fin_prevue} />
        <Selection libelle="Campagne" name="campagne_id" defaultValue={v.campagne_id ?? ""} erreur={e.campagne_id}>
          <option value="">— Aucune —</option>
          {liste(campagnes)}
        </Selection>
        <Champ libelle="Notes" name="notes" defaultValue={v.notes} erreur={e.notes} className="sm:col-span-3" />
      </div>
      <Bouton type="submit" disabled={enCours} className="self-start">
        Créer l&apos;ordre
      </Bouton>
    </form>
  );
}
