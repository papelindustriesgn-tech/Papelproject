"use client";

import { useActionState } from "react";
import { Bouton, Champ, Message, Selection } from "@/components/ui";
import { ETAT_INITIAL } from "@/lib/formulaires/etat";
import { creerFactureFournisseur } from "../../actions";

type Option = { id: string; libelle: string };

export function FormulaireFacture({ fournisseurs, categories, dateDuJour }: { fournisseurs: Option[]; categories: Option[]; dateDuJour: string }) {
  const [etat, action, enCours] = useActionState(creerFactureFournisseur, ETAT_INITIAL);
  const v = etat.valeurs ?? {};
  const e = etat.erreurs ?? {};
  return (
    <form action={action} className="flex flex-col gap-3">
      {etat.message && <Message ton="erreur">{etat.message}</Message>}
      <div className="grid gap-3 sm:grid-cols-3">
        <Selection libelle="Fournisseur" name="fournisseur_id" defaultValue={v.fournisseur_id ?? ""} erreur={e.fournisseur_id}>
          <option value="">— Aucun (bénéficiaire ci-contre) —</option>
          {fournisseurs.map((f) => (
            <option key={f.id} value={f.id}>{f.libelle}</option>
          ))}
        </Selection>
        <Champ libelle="Bénéficiaire (sans fiche)" name="tiers" defaultValue={v.tiers} erreur={e.tiers} placeholder="Station, administration…" />
        <Champ libelle="N° de facture du fournisseur" name="reference_fournisseur" defaultValue={v.reference_fournisseur} />
        <Champ libelle="Libellé" name="libelle" defaultValue={v.libelle} erreur={e.libelle} className="sm:col-span-2" />
        <Selection libelle="Catégorie" name="categorie_id" defaultValue={v.categorie_id ?? ""} erreur={e.categorie_id}>
          <option value="">— Choisir —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.libelle}</option>
          ))}
        </Selection>
        <Champ libelle="Date de facture" name="date_facture" type="date" defaultValue={v.date_facture ?? dateDuJour} erreur={e.date_facture} />
        <Champ libelle="Échéance" name="date_echeance" type="date" defaultValue={v.date_echeance ?? dateDuJour} erreur={e.date_echeance} />
        <Selection libelle="Devise" name="devise" defaultValue={v.devise ?? "GNF"}>
          <option value="GNF">GNF</option>
          <option value="USD">USD (taux de la date de facture)</option>
        </Selection>
        <Champ libelle="Montant HT" name="montant_ht" inputMode="decimal" defaultValue={v.montant_ht} erreur={e.montant_ht} />
        <Champ libelle="TVA" name="montant_tva" inputMode="decimal" defaultValue={v.montant_tva} erreur={e.montant_tva} aide="0 si pas de TVA récupérable" />
      </div>
      <Bouton type="submit" disabled={enCours} className="self-start">Enregistrer la facture</Bouton>
    </form>
  );
}
