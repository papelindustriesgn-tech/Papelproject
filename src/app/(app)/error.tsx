"use client";

import { RefreshCw } from "lucide-react";
import { Bouton, Carte } from "@/components/ui";

/**
 * Erreur de chargement d'une page : on n'affiche ni zéro ni liste vide (ce serait faux), mais un message
 * clair et un bouton pour réessayer. Le menu reste disponible (il est dans le layout, au-dessus).
 */
export default function ErreurPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <Carte>
      <div role="alert" className="flex flex-col gap-3">
        <h1 className="text-lg font-bold text-gray-900">Les données n&apos;ont pas pu être chargées</h1>
        <p className="text-gray-700">
          La connexion au serveur a échoué ou une requête a été refusée. Pour ne pas vous induire en erreur, aucun chiffre n&apos;est affiché. Vérifiez la
          connexion internet puis réessayez.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Bouton type="button" onClick={() => retry()}>
            <RefreshCw size={16} aria-hidden /> Réessayer
          </Bouton>
          {error.digest && <span className="text-sm text-gray-500">Référence pour l&apos;administrateur : {error.digest}</span>}
        </div>
      </div>
    </Carte>
  );
}
