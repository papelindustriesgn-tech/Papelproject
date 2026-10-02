"use client";

import { useActionState } from "react";
import { Bouton } from "@/components/ui";
import { ETAT_INITIAL } from "@/lib/formulaires/etat";
import { traiterDemande } from "../actions";

export function FormulaireTraitement({ id }: { id: string }) {
  const [etatA, approuver, enCoursA] = useActionState(traiterDemande.bind(null, id, "approuvee"), ETAT_INITIAL);
  const [etatR, refuser, enCoursR] = useActionState(traiterDemande.bind(null, id, "refusee"), ETAT_INITIAL);
  const message = etatA.message ?? etatR.message;
  return (
    <form className="flex flex-wrap items-center gap-2">
      <input name="commentaire" placeholder="Commentaire" aria-label="Commentaire" className="min-h-11 rounded-lg border border-gray-300 px-2" />
      <Bouton formAction={approuver} disabled={enCoursA} variante="secondaire">
        Approuver
      </Bouton>
      <Bouton formAction={refuser} disabled={enCoursR} variante="discret">
        Refuser
      </Bouton>
      {message && <span className="text-sm">{message}</span>}
    </form>
  );
}
