"use client";

import { useActionState } from "react";
import { Bouton, Message } from "@/components/ui";
import { ETAT_INITIAL } from "@/lib/formulaires/etat";
import { modifierLigneLivraison, validerLivraison } from "../../actions";

export function FormulaireLigneLivraison({ ligneId, livraisonId, paquets }: { ligneId: string; livraisonId: string; paquets: number }) {
  const [etat, action, enCours] = useActionState(modifierLigneLivraison.bind(null, ligneId, livraisonId), ETAT_INITIAL);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input name="paquets" defaultValue={paquets} inputMode="numeric" aria-label="Paquets à livrer" className="min-h-11 w-28 rounded-lg border border-gray-300 px-2" />
      <span>paquets</span>
      <Bouton type="submit" variante="discret" disabled={enCours}>
        OK
      </Bouton>
      {(etat.erreurs?.paquets || (!etat.ok && etat.message)) && <span className="text-sm text-red-700">{etat.erreurs?.paquets ?? etat.message}</span>}
    </form>
  );
}

export function BoutonValiderLivraison({ livraisonId }: { livraisonId: string }) {
  const [etat, action, enCours] = useActionState(validerLivraison.bind(null, livraisonId), ETAT_INITIAL);
  return (
    <form action={action} className="flex flex-col gap-2">
      {etat.message && <Message ton={etat.ok ? "succes" : "erreur"}>{etat.message}</Message>}
      <Bouton type="submit" disabled={enCours} className="self-start">
        {enCours ? "Validation…" : "Valider la livraison (sortie de stock)"}
      </Bouton>
    </form>
  );
}
