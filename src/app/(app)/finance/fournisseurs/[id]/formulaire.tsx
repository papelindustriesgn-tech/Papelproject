"use client";

import { useActionState } from "react";
import { Bouton, Champ, Message, Selection } from "@/components/ui";
import { ETAT_INITIAL } from "@/lib/formulaires/etat";
import { reglerFacture } from "../../actions";

export function FormulaireReglement({ factureId, comptes, reste, dateDuJour }: { factureId: string; comptes: { id: string; libelle: string }[]; reste: number; dateDuJour: string }) {
  const [etat, action, enCours] = useActionState(reglerFacture.bind(null, factureId), ETAT_INITIAL);
  const v = etat.ok ? {} : (etat.valeurs ?? {});
  const e = etat.erreurs ?? {};
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      {etat.message && <div className="w-full"><Message ton={etat.ok ? "succes" : "erreur"}>{etat.message}</Message></div>}
      <Selection libelle="Payé depuis" name="compte_id" defaultValue={v.compte_id ?? ""} erreur={e.compte_id} className="basis-56 flex-1">
        <option value="">— Choisir —</option>
        {comptes.map((c) => (
          <option key={c.id} value={c.id}>{c.libelle}</option>
        ))}
      </Selection>
      <Champ libelle="Montant (GNF)" name="montant_gnf" inputMode="numeric" defaultValue={v.montant_gnf ?? String(reste)} erreur={e.montant_gnf} className="basis-36 flex-1" />
      <Champ libelle="Date" name="date_reglement" type="date" defaultValue={v.date_reglement ?? dateDuJour} max={dateDuJour} erreur={e.date_reglement} className="basis-36" />
      <Champ libelle="Référence (chèque, virement…)" name="reference" defaultValue={v.reference} className="basis-40 flex-1" />
      <Bouton type="submit" disabled={enCours}>Enregistrer le règlement</Bouton>
    </form>
  );
}
