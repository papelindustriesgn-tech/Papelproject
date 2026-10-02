"use client";

import { useActionState } from "react";
import { Bouton, Champ, Message } from "@/components/ui";
import { ETAT_INITIAL } from "@/lib/formulaires/etat";
import { seConnecter } from "./actions";

export function FormulaireConnexion() {
  const [etat, action, enCours] = useActionState(seConnecter, ETAT_INITIAL);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {etat.message && <Message ton="erreur">{etat.message}</Message>}
      <Champ
        libelle="Identifiant"
        name="identifiant"
        autoComplete="username"
        autoCapitalize="none"
        required
        defaultValue={etat.valeurs?.identifiant}
        erreur={etat.erreurs?.identifiant}
      />
      <Champ
        libelle="Mot de passe"
        name="motDePasse"
        type="password"
        autoComplete="current-password"
        required
        erreur={etat.erreurs?.motDePasse}
      />
      <Bouton type="submit" disabled={enCours} className="mt-2 text-lg">
        {enCours ? "Connexion…" : "Se connecter"}
      </Bouton>
    </form>
  );
}
