"use client";

import { useActionState } from "react";
import { Bouton, Champ, Message, Selection } from "@/components/ui";
import { ETAT_INITIAL } from "@/lib/formulaires/etat";
import { ajouterFrais, enregistrerSuivi } from "../../actions";

type Dates = Record<string, string | null>;

const ETAPES = [
  ["Embarquement", "date_embarquement_prevue", "date_embarquement_reelle"],
  ["Arrivée au port", "date_arrivee_port_prevue", "date_arrivee_port_reelle"],
  ["Dédouanement", "date_dedouanement_prevue", "date_dedouanement_reelle"],
  ["Livraison à l'usine", "date_livraison_prevue", "date_livraison_reelle"],
] as const;

export function FormulaireSuivi({ conteneurId, dates, notes }: { conteneurId: string; dates: Dates; notes: string }) {
  const [etat, action, enCours] = useActionState(enregistrerSuivi.bind(null, conteneurId), ETAT_INITIAL);
  return (
    <form action={action} className="flex flex-col gap-3">
      {etat.message && <Message ton={etat.ok ? "succes" : "erreur"}>{etat.message}</Message>}
      <div className="grid gap-x-3 gap-y-2 sm:grid-cols-[1fr_1fr_1fr]">
        <span className="hidden font-semibold sm:block">Étape</span>
        <span className="hidden font-semibold sm:block">Date prévue</span>
        <span className="hidden font-semibold sm:block">Date réelle</span>
        {ETAPES.map(([libelle, prevue, reelle]) => (
          <div key={libelle} className="contents">
            <span className="self-center font-medium">{libelle}</span>
            <Champ libelle={`${libelle} — prévue`} name={prevue} type="date" defaultValue={dates[prevue] ?? ""} erreur={etat.erreurs?.[prevue]} className="[&>label]:sr-only" />
            <Champ libelle={`${libelle} — réelle`} name={reelle} type="date" defaultValue={dates[reelle] ?? ""} erreur={etat.erreurs?.[reelle]} className="[&>label]:sr-only" />
          </div>
        ))}
      </div>
      <Champ libelle="Notes" name="notes" defaultValue={notes} />
      <Bouton type="submit" disabled={enCours} className="self-start">Enregistrer le suivi</Bouton>
    </form>
  );
}

export function FormulaireFrais({ conteneurId, types, dateDuJour }: { conteneurId: string; types: { id: string; libelle: string }[]; dateDuJour: string }) {
  const [etat, action, enCours] = useActionState(ajouterFrais.bind(null, conteneurId), ETAT_INITIAL);
  const v = etat.ok ? {} : (etat.valeurs ?? {});
  const e = etat.erreurs ?? {};
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      {etat.message && <div className="w-full"><Message ton={etat.ok ? "succes" : "erreur"}>{etat.message}</Message></div>}
      <Selection libelle="Type de frais" name="type_frais_id" defaultValue={v.type_frais_id ?? ""} erreur={e.type_frais_id} className="basis-48 flex-1">
        <option value="">— Choisir —</option>
        {types.map((t) => (
          <option key={t.id} value={t.id}>{t.libelle}</option>
        ))}
      </Selection>
      <Selection libelle="Devise" name="devise" defaultValue={v.devise ?? "GNF"} className="basis-24">
        <option value="GNF">GNF</option>
        <option value="USD">USD</option>
      </Selection>
      <Champ libelle="Montant" name="montant" inputMode="decimal" defaultValue={v.montant} erreur={e.montant} className="basis-32 flex-1" />
      <Champ libelle="Date" name="date_frais" type="date" defaultValue={v.date_frais ?? dateDuJour} erreur={e.date_frais} className="basis-36" />
      <Champ libelle="Prestataire" name="prestataire" defaultValue={v.prestataire} className="basis-40 flex-1" />
      <Champ libelle="N° de facture" name="reference" defaultValue={v.reference} className="basis-32 flex-1" />
      <Bouton type="submit" disabled={enCours}>Ajouter</Bouton>
    </form>
  );
}
