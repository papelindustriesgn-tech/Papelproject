"use client";

import { useActionState } from "react";
import { Bouton, Champ, Message, Selection } from "@/components/ui";
import { ETAT_INITIAL } from "@/lib/formulaires/etat";
import { enregistrerMouvement, enregistrerVirement } from "../actions";

type Option = { id: string; libelle: string };

export function FormulaireMouvement({ comptes, categories, dateDuJour }: { comptes: Option[]; categories: Option[]; dateDuJour: string }) {
  const [etat, action, enCours] = useActionState(enregistrerMouvement, ETAT_INITIAL);
  const v = etat.ok ? {} : (etat.valeurs ?? {});
  const e = etat.erreurs ?? {};
  return (
    <form action={action} className="flex flex-col gap-3">
      {etat.message && <Message ton={etat.ok ? "succes" : "erreur"}>{etat.message}</Message>}
      <div className="grid gap-3 sm:grid-cols-3">
        <Selection libelle="Compte" name="compte_id" defaultValue={v.compte_id ?? ""} erreur={e.compte_id}>
          <option value="">— Choisir —</option>
          {comptes.map((c) => (
            <option key={c.id} value={c.id}>{c.libelle}</option>
          ))}
        </Selection>
        <Selection libelle="Sens" name="sens" defaultValue={v.sens ?? "sortie"}>
          <option value="sortie">Sortie</option>
          <option value="entree">Entrée</option>
        </Selection>
        <Champ libelle="Montant (devise du compte)" name="montant" inputMode="decimal" defaultValue={v.montant} erreur={e.montant} />
        <Champ libelle="Date" name="date_operation" type="date" defaultValue={v.date_operation ?? dateDuJour} max={dateDuJour} erreur={e.date_operation} />
        <Selection libelle="Catégorie (sortie)" name="categorie_id" defaultValue={v.categorie_id ?? ""}>
          <option value="">—</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.libelle}</option>
          ))}
        </Selection>
        <Champ libelle="Libellé" name="libelle" defaultValue={v.libelle} erreur={e.libelle} placeholder="Frais bancaires, apport…" />
        <Champ libelle="Référence" name="reference" defaultValue={v.reference} />
      </div>
      <Bouton type="submit" disabled={enCours} className="self-start">Enregistrer le mouvement</Bouton>
    </form>
  );
}

export function FormulaireVirement({ comptes, dateDuJour }: { comptes: Option[]; dateDuJour: string }) {
  const [etat, action, enCours] = useActionState(enregistrerVirement, ETAT_INITIAL);
  const v = etat.valeurs ?? {};
  const e = etat.erreurs ?? {};
  return (
    <form action={action} className="flex flex-col gap-3">
      {etat.message && <Message ton="erreur">{etat.message}</Message>}
      <div className="grid gap-3 sm:grid-cols-3">
        <Selection libelle="De" name="de" defaultValue={v.de ?? ""} erreur={e.de}>
          <option value="">— Choisir —</option>
          {comptes.map((c) => (
            <option key={c.id} value={c.id}>{c.libelle}</option>
          ))}
        </Selection>
        <Selection libelle="Vers" name="vers" defaultValue={v.vers ?? ""} erreur={e.vers}>
          <option value="">— Choisir —</option>
          {comptes.map((c) => (
            <option key={c.id} value={c.id}>{c.libelle}</option>
          ))}
        </Selection>
        <Champ libelle="Montant (GNF)" name="montant_gnf" inputMode="numeric" defaultValue={v.montant_gnf} erreur={e.montant_gnf} />
        <Champ libelle="Date" name="date_operation" type="date" defaultValue={v.date_operation ?? dateDuJour} max={dateDuJour} />
        <Champ libelle="Libellé" name="libelle" defaultValue={v.libelle ?? "Dépôt des espèces à la banque"} className="sm:col-span-2" />
      </div>
      <Bouton type="submit" disabled={enCours} variante="secondaire" className="self-start">Enregistrer le virement</Bouton>
    </form>
  );
}
