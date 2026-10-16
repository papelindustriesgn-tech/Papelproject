"use client";

import { useActionState } from "react";
import { Bouton, Champ, Message } from "@/components/ui";
import { ETAT_INITIAL } from "@/lib/formulaires/etat";
import { creerUtilisateur } from "./actions";
import { CasesRoles } from "./cases-roles";

export function FormulaireCreation() {
  const [etat, action, enCours] = useActionState(creerUtilisateur, ETAT_INITIAL);
  const v = etat.ok ? {} : (etat.valeurs ?? {});
  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      {etat.message && <Message ton={etat.ok ? "succes" : "erreur"}>{etat.message}</Message>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Champ libelle="Identifiant de connexion" name="identifiant" required defaultValue={v.identifiant} erreur={etat.erreurs?.identifiant} aide="Ex. : commercial4 ou m.diallo" autoCapitalize="none" />
        <Champ libelle="Mot de passe provisoire" name="motDePasse" type="text" required erreur={etat.erreurs?.motDePasse} aide="8 caractères minimum" autoComplete="off" />
        <Champ libelle="Nom" name="nom" required defaultValue={v.nom} erreur={etat.erreurs?.nom} />
        <Champ libelle="Prénom" name="prenom" defaultValue={v.prenom} erreur={etat.erreurs?.prenom} />
        <Champ libelle="Téléphone" name="telephone" type="tel" defaultValue={v.telephone} erreur={etat.erreurs?.telephone} placeholder="+224 6xx xx xx xx" />
      </div>
      <CasesRoles erreur={etat.erreurs?.roles} />
      <Bouton type="submit" disabled={enCours} className="self-start">
        {enCours ? "Création…" : "Créer le compte"}
      </Bouton>
    </form>
  );
}
