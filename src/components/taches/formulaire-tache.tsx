"use client";

import { useActionState } from "react";
import { Bouton, Champ, Message, Selection } from "@/components/ui";
import { ETAT_INITIAL } from "@/lib/formulaires/etat";
import { creerTache } from "@/lib/taches/actions";

/** Nouvelle demande à un autre service : à qui, quoi, pour quand. */
export function FormulaireTache({ espace, services }: { espace: string; services: { code: string; libelle: string }[] }) {
  const [etat, action, enCours] = useActionState(creerTache.bind(null, espace), ETAT_INITIAL);
  const v = etat.ok ? {} : (etat.valeurs ?? {});
  const e = etat.erreurs ?? {};
  return (
    <form action={action} className="flex flex-col gap-3">
      {etat.message && <Message ton={etat.ok ? "succes" : "erreur"}>{etat.message}</Message>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Selection libelle="Pour le service" name="espace_destinataire" defaultValue={v.espace_destinataire ?? ""} erreur={e.espace_destinataire}>
          <option value="">— Choisir —</option>
          {services.map((s) => (
            <option key={s.code} value={s.code}>
              {s.libelle}
            </option>
          ))}
        </Selection>
        <Champ libelle="Échéance (facultatif)" name="echeance" type="date" defaultValue={v.echeance} erreur={e.echeance} />
        <Champ libelle="Demande" name="titre" required placeholder="Ex. Préparer 20 colis de Petit 100 pour CMD-2026-00012" defaultValue={v.titre} erreur={e.titre} className="sm:col-span-2" />
        <Champ libelle="Détails (facultatif)" name="description" defaultValue={v.description} erreur={e.description} className="sm:col-span-2" />
      </div>
      <label className="flex min-h-11 items-center gap-2">
        <input type="checkbox" name="urgente" defaultChecked={v.urgente === "on"} className="size-5 accent-papel-700" />
        Urgent
      </label>
      <Bouton type="submit" disabled={enCours} className="self-start">
        Envoyer la demande
      </Bouton>
    </form>
  );
}
