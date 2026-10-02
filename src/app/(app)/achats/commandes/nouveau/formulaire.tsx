"use client";

import { useActionState } from "react";
import { Bouton, Champ, Message, Selection } from "@/components/ui";
import { ETAT_INITIAL } from "@/lib/formulaires/etat";
import { creerBc } from "../../actions";

export function FormulaireBc({ fournisseurs, demandes, dateDuJour }: { fournisseurs: { id: string; nom: string; devise: string }[]; demandes: { id: string; libelle: string }[]; dateDuJour: string }) {
  const [etat, action, enCours] = useActionState(creerBc, ETAT_INITIAL);
  const v = etat.valeurs ?? {};
  const e = etat.erreurs ?? {};
  return (
    <form action={action} className="flex flex-col gap-3">
      {etat.message && <Message ton="erreur">{etat.message}</Message>}
      <div className="grid gap-3 sm:grid-cols-3">
        <Selection libelle="Fournisseur" name="fournisseur_id" defaultValue={v.fournisseur_id ?? ""} erreur={e.fournisseur_id}>
          <option value="">— Choisir —</option>
          {fournisseurs.map((f) => (
            <option key={f.id} value={f.id}>{f.nom} ({f.devise})</option>
          ))}
        </Selection>
        <Selection libelle="Devise" name="devise" defaultValue={v.devise ?? "USD"} erreur={e.devise}>
          <option value="USD">USD (taux du jour figé à l&apos;envoi)</option>
          <option value="GNF">GNF</option>
        </Selection>
        <Champ libelle="Date de commande" name="date_commande" type="date" defaultValue={v.date_commande ?? dateDuJour} erreur={e.date_commande} />
        <Champ libelle="Incoterm" name="incoterm" defaultValue={v.incoterm} placeholder="CFR Conakry" erreur={e.incoterm} />
        <Champ libelle="Livraison prévue à l'usine" name="date_livraison_prevue" type="date" defaultValue={v.date_livraison_prevue} erreur={e.date_livraison_prevue} />
        <Champ libelle="Frais d'approche estimés (GNF)" name="frais_estimes_gnf" inputMode="numeric" defaultValue={v.frais_estimes_gnf} erreur={e.frais_estimes_gnf} aide="Pour comparer coût prévu et coût réel" />
        <Champ libelle="Notes" name="notes" defaultValue={v.notes} className="sm:col-span-3" />
      </div>
      {demandes.length > 0 && (
        <fieldset>
          <legend className="mb-1 font-medium">Demandes approuvées à rattacher</legend>
          {demandes.map((d) => (
            <label key={d.id} className="flex min-h-11 items-center gap-2">
              <input type="checkbox" name="demandes" value={d.id} className="size-5 accent-papel-700" /> {d.libelle}
            </label>
          ))}
        </fieldset>
      )}
      <Bouton type="submit" disabled={enCours} className="self-start">
        Créer et ajouter les lignes
      </Bouton>
    </form>
  );
}
