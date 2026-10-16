"use client";

import { useActionState } from "react";
import { Bouton, Champ, Message, Selection } from "@/components/ui";
import { ETAT_INITIAL } from "@/lib/formulaires/etat";
import { creerPiece } from "../../actions";

export function FormulaireNouvellePiece({ clients, type, client, dateDuJour }: { clients: { id: string; libelle: string }[]; type: string; client?: string; dateDuJour: string }) {
  const [etat, action, enCours] = useActionState(creerPiece, ETAT_INITIAL);
  const v = etat.valeurs ?? {};
  const e = etat.erreurs ?? {};
  return (
    <form action={action} className="flex flex-col gap-3">
      {etat.message && <Message ton="erreur">{etat.message}</Message>}
      <div className="grid gap-3 sm:grid-cols-3">
        <Selection libelle="Type" name="type_piece" defaultValue={v.type_piece ?? type} erreur={e.type_piece}>
          <option value="devis">Devis</option>
          <option value="commande">Commande</option>
          <option value="facture">Facture directe</option>
        </Selection>
        <Selection libelle="Client" name="client_id" defaultValue={v.client_id ?? client ?? ""} erreur={e.client_id}>
          <option value="">— Choisir —</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.libelle}
            </option>
          ))}
        </Selection>
        <Champ libelle="Date" name="date_piece" type="date" required defaultValue={v.date_piece ?? dateDuJour} erreur={e.date_piece} />
        <Champ libelle="Notes (apparaissent sur le document)" name="notes" defaultValue={v.notes} erreur={e.notes} className="sm:col-span-3" />
      </div>
      <Bouton type="submit" disabled={enCours} className="self-start">
        Créer et ajouter les produits
      </Bouton>
    </form>
  );
}
