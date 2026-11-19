"use client";

import { useActionState } from "react";
import { Bouton, Champ, Message } from "@/components/ui";
import { confirmerDateLivraison } from "@/lib/commandes/actions";
import { ETAT_INITIAL } from "@/lib/formulaires/etat";

/** Confirmer (ou changer) la date de livraison promise au client ; la date souhaitée est proposée. */
export function ConfirmerDate({ commandeId, proposee, min }: { commandeId: string; proposee: string; min: string }) {
  const [etat, action, enCours] = useActionState(confirmerDateLivraison.bind(null, commandeId), ETAT_INITIAL);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      {etat.message && (
        <div className="w-full">
          <Message ton={etat.ok ? "succes" : "erreur"}>{etat.message}</Message>
        </div>
      )}
      <Champ libelle="Date de livraison promise" name="date" type="date" min={min} defaultValue={etat.valeurs?.date ?? proposee} erreur={etat.erreurs?.date} className="basis-44" />
      <Champ libelle="Remarque (facultatif)" name="note" defaultValue={etat.valeurs?.note} className="basis-56 flex-1" />
      <Bouton type="submit" disabled={enCours}>
        {enCours ? "Enregistrement…" : "Confirmer la date"}
      </Bouton>
    </form>
  );
}
