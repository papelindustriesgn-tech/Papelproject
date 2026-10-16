"use client";

import { useActionState } from "react";
import { Bouton, Champ, Message } from "@/components/ui";
import { ETAT_INITIAL } from "@/lib/formulaires/etat";
import { definirCodeSerie, modifierIdentite, modifierRoles, reinitialiserMotDePasse } from "../actions";
import { CasesRoles } from "../cases-roles";

export function FormulaireRoles({ utilisateurId, roles }: { utilisateurId: string; roles: string[] }) {
  const [etat, action, enCours] = useActionState(modifierRoles.bind(null, utilisateurId), ETAT_INITIAL);
  return (
    <form action={action} className="flex flex-col gap-3">
      {etat.message && <Message ton={etat.ok ? "succes" : "erreur"}>{etat.message}</Message>}
      <CasesRoles coches={roles} erreur={etat.erreurs?._} />
      <Bouton type="submit" disabled={enCours} className="self-start">
        Enregistrer les rôles
      </Bouton>
    </form>
  );
}

export function FormulaireIdentite({ utilisateurId, nom, prenom, telephone }: { utilisateurId: string; nom: string; prenom: string; telephone: string }) {
  const [etat, action, enCours] = useActionState(modifierIdentite.bind(null, utilisateurId), ETAT_INITIAL);
  return (
    <form action={action} className="flex flex-col gap-3">
      {etat.message && <Message ton={etat.ok ? "succes" : "erreur"}>{etat.message}</Message>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Champ libelle="Prénom" name="prenom" defaultValue={etat.valeurs?.prenom ?? prenom} erreur={etat.erreurs?.prenom} />
        <Champ libelle="Nom" name="nom" required defaultValue={etat.valeurs?.nom ?? nom} erreur={etat.erreurs?.nom} />
      </div>
      <Champ libelle="Téléphone" name="telephone" type="tel" defaultValue={etat.valeurs?.telephone ?? telephone} erreur={etat.erreurs?.telephone} />
      <Bouton type="submit" variante="secondaire" disabled={enCours} className="self-start">
        Enregistrer
      </Bouton>
    </form>
  );
}

export function FormulaireMotDePasse({ utilisateurId }: { utilisateurId: string }) {
  const [etat, action, enCours] = useActionState(reinitialiserMotDePasse.bind(null, utilisateurId), ETAT_INITIAL);
  return (
    <form action={action} className="flex flex-col gap-3">
      {etat.message && <Message ton={etat.ok ? "succes" : "erreur"}>{etat.message}</Message>}
      <Champ libelle="Nouveau mot de passe" name="motDePasse" type="text" autoComplete="off" required erreur={etat.erreurs?.motDePasse} />
      <Bouton type="submit" variante="secondaire" disabled={enCours} className="self-start">
        Changer le mot de passe
      </Bouton>
    </form>
  );
}

export function FormulaireCodeSerie({ utilisateurId, code }: { utilisateurId: string; code: string | null }) {
  const [etat, action, enCours] = useActionState(definirCodeSerie.bind(null, utilisateurId), ETAT_INITIAL);
  return (
    <form action={action} className="flex flex-col gap-3">
      {etat.message && <Message ton={etat.ok ? "succes" : "erreur"}>{etat.message}</Message>}
      <Champ
        libelle="Code de série"
        name="code_serie"
        defaultValue={etat.valeurs?.code_serie ?? code ?? ""}
        erreur={etat.erreurs?.code_serie}
        aide="Ex. C04 → factures FA-2026-C04-00001, devis DEV-2026-C04-00001"
        autoCapitalize="characters"
      />
      <Bouton type="submit" variante="secondaire" disabled={enCours} className="self-start">
        Enregistrer la série
      </Bouton>
    </form>
  );
}
