"use client";

import { useActionState } from "react";
import { ETAT_INITIAL, type EtatFormulaire } from "@/lib/formulaires/etat";
import { Bouton, Message } from "./index";

/**
 * Bouton qui lance une action serveur et affiche son refus à côté, en mots simples (jamais une page d'erreur) ;
 * bloqué pendant l'envoi (pas de double enregistrement). L'action redirige si tout va bien.
 */
export function BoutonAction({
  action,
  libelle,
  enCoursLibelle = "Enregistrement…",
  variante,
}: {
  action: (e: EtatFormulaire) => Promise<EtatFormulaire>;
  libelle: string;
  enCoursLibelle?: string;
  variante?: "principal" | "secondaire" | "discret";
}) {
  const [etat, envoyer, enCours] = useActionState(action, ETAT_INITIAL);
  return (
    <form action={envoyer} className="flex flex-col gap-2">
      {etat.message && <Message ton={etat.ok ? "succes" : "erreur"}>{etat.message}</Message>}
      <Bouton type="submit" variante={variante} disabled={enCours} className="self-start">
        {enCours ? enCoursLibelle : libelle}
      </Bouton>
    </form>
  );
}
