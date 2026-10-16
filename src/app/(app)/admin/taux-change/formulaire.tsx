"use client";

import { useActionState } from "react";
import { Bouton, Champ, Message } from "@/components/ui";
import { ETAT_INITIAL } from "@/lib/formulaires/etat";
import { ajouterTaux } from "./actions";

export function FormulaireTaux({ dateDuJour }: { dateDuJour: string }) {
  const [etat, action, enCours] = useActionState(ajouterTaux, ETAT_INITIAL);
  const v = etat.ok ? {} : (etat.valeurs ?? {});
  return (
    <form action={action} className="flex flex-col gap-3">
      {etat.message && <Message ton={etat.ok ? "succes" : "erreur"}>{etat.message}</Message>}
      <div className="grid gap-3 sm:grid-cols-3">
        <Champ libelle="Date d'effet" name="date_effet" type="date" required defaultValue={v.date_effet ?? dateDuJour} erreur={etat.erreurs?.date_effet} />
        <Champ libelle="1 USD = … GNF" name="taux_gnf" inputMode="decimal" required defaultValue={v.taux_gnf} erreur={etat.erreurs?.taux_gnf} placeholder="9 450" />
        <Champ libelle="Note" name="note" defaultValue={v.note} erreur={etat.erreurs?.note} placeholder="Source : BCRG…" />
      </div>
      <Bouton type="submit" disabled={enCours} className="self-start">
        Ajouter le taux
      </Bouton>
    </form>
  );
}
