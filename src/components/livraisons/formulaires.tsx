"use client";

import { useActionState, useState } from "react";
import { Bouton, Message } from "@/components/ui";
import { ETAT_INITIAL } from "@/lib/formulaires/etat";
import { modifierQuantitePreparee, validerBonLivraison } from "@/lib/livraisons/actions";

const champ = "min-h-11 w-20 rounded-xl border border-gray-300 px-2 text-center md:min-h-10";

/** Quantité préparée d'un produit : colis complets + paquets en plus, enregistrée au changement. */
export function QuantitePreparee({ ligneId, livraisonId, paquets, paquetsParColis }: { ligneId: string; livraisonId: string; paquets: number; paquetsParColis: number }) {
  const [etat, action, enCours] = useActionState(modifierQuantitePreparee.bind(null, ligneId, livraisonId, paquetsParColis), ETAT_INITIAL);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-1">
        <input name="colis" inputMode="numeric" defaultValue={Math.floor(paquets / paquetsParColis)} className={champ} aria-label="Colis préparés" />
        <span>colis</span>
      </label>
      <span aria-hidden>+</span>
      <label className="flex items-center gap-1">
        <input name="vrac" inputMode="numeric" defaultValue={paquets % paquetsParColis} className={champ} aria-label="Paquets en plus" />
        <span>paquets</span>
      </label>
      <Bouton type="submit" variante="secondaire" disabled={enCours}>
        {enCours ? "…" : "Enregistrer"}
      </Bouton>
      {etat.message && <span className={`text-sm ${etat.ok ? "text-green-800" : "text-red-700"}`}>{etat.message}</span>}
      {etat.erreurs?.colis && <span className="text-sm text-red-700">{etat.erreurs.colis}</span>}
    </form>
  );
}

/** Validation avec récapitulatif : ce qui va sortir du stock, puis confirmation (un seul envoi). */
export function ValiderBon({ livraisonId, espace, recapitulatif, bloque }: { livraisonId: string; espace: string; recapitulatif: string[]; bloque: string | null }) {
  const [etat, action, enCours] = useActionState(validerBonLivraison.bind(null, livraisonId, espace), ETAT_INITIAL);
  const [confirmer, setConfirmer] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      {etat.message && <Message ton={etat.ok ? "succes" : "erreur"}>{etat.message}</Message>}
      {bloque && <Message ton="erreur">{bloque}</Message>}
      {!confirmer ? (
        <Bouton type="button" onClick={() => setConfirmer(true)} disabled={!!bloque} className="self-start">
          Les colis sont prêts : valider la sortie du stock
        </Bouton>
      ) : (
        <form action={action} className="flex flex-col gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3">
          <p className="font-semibold">Ces colis vont sortir du stock :</p>
          <ul className="list-disc pl-5">
            {recapitulatif.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <p className="text-sm">Après validation, le bon ne se modifie plus. Une erreur se corrige par un retour à la livraison ou un avoir.</p>
          <div className="flex flex-wrap gap-2">
            <Bouton type="submit" disabled={enCours}>
              {enCours ? "Validation…" : "Oui, valider"}
            </Bouton>
            <Bouton type="button" variante="discret" onClick={() => setConfirmer(false)}>
              Non, je vérifie encore
            </Bouton>
          </div>
        </form>
      )}
    </div>
  );
}
