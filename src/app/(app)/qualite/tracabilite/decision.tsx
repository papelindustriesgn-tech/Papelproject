"use client";

import { useActionState } from "react";
import { Bouton, Champ, Message } from "@/components/ui";
import { ETAT_INITIAL } from "@/lib/formulaires/etat";
import { deciderLot } from "../actions";

/** Blocage (quarantaine) ou libération motivée d'une bobine. */
export function DecisionLot({ lotId, bloquee }: { lotId: string; bloquee: boolean }) {
  const [etat, action, enCours] = useActionState(deciderLot.bind(null, lotId, !bloquee), ETAT_INITIAL);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      {etat.message && <div className="w-full"><Message ton={etat.ok ? "succes" : "erreur"}>{etat.message}</Message></div>}
      <Champ libelle="Motif de la décision" name="motif" className="basis-64 flex-1" />
      <Bouton type="submit" disabled={enCours} variante={bloquee ? "principal" : "secondaire"}>
        {bloquee ? "Libérer la bobine" : "Bloquer la bobine"}
      </Bouton>
    </form>
  );
}
