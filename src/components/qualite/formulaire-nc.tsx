"use client";

import { useActionState } from "react";
import { Bouton, Champ, Message, Selection } from "@/components/ui";
import { ETAT_INITIAL } from "@/lib/formulaires/etat";
import { declarerNc } from "@/lib/qualite/declaration";
import { GRAVITES_NC, ORIGINES_NC } from "@/lib/qualite/libelles";

type Option = { id: string; libelle: string };

/** Déclaration d'une non-conformité (rattachement facultatif à une bobine, un lot de produits finis ou un client). */
export function FormulaireNc({ espace, origine, types, lots, fiches, clients }: { espace: string; origine: string; types: Option[]; lots: Option[]; fiches: Option[]; clients: Option[] }) {
  const [etat, action, enCours] = useActionState(declarerNc.bind(null, espace), ETAT_INITIAL);
  const v = etat.ok ? {} : (etat.valeurs ?? {});
  const e = etat.erreurs ?? {};
  return (
    <form action={action} className="flex flex-col gap-3">
      {etat.message && <Message ton={etat.ok ? "succes" : "erreur"}>{etat.message}</Message>}
      <div className="grid gap-3 sm:grid-cols-3">
        <Selection libelle="Origine" name="origine" defaultValue={v.origine ?? origine} erreur={e.origine}>
          {Object.entries(ORIGINES_NC).map(([val, l]) => (
            <option key={val} value={val}>{l}</option>
          ))}
        </Selection>
        <Selection libelle="Type" name="type_id" defaultValue={v.type_id ?? ""} erreur={e.type_id}>
          <option value="">— Non précisé —</option>
          {types.map((t) => (
            <option key={t.id} value={t.id}>{t.libelle}</option>
          ))}
        </Selection>
        <Selection libelle="Gravité" name="gravite" defaultValue={v.gravite ?? "majeure"}>
          {Object.entries(GRAVITES_NC).map(([val, g]) => (
            <option key={val} value={val}>{g.libelle}</option>
          ))}
        </Selection>
        <Champ libelle="Description du problème" name="description" defaultValue={v.description} erreur={e.description} className="sm:col-span-3" />
        <Selection libelle="Bobine concernée" name="lot_id" defaultValue={v.lot_id ?? ""} erreur={e.lot_id}>
          <option value="">—</option>
          {lots.map((t) => (
            <option key={t.id} value={t.id}>{t.libelle}</option>
          ))}
        </Selection>
        <Selection libelle="Lot de produits finis" name="fiche_id" defaultValue={v.fiche_id ?? ""} erreur={e.fiche_id}>
          <option value="">—</option>
          {fiches.map((t) => (
            <option key={t.id} value={t.id}>{t.libelle}</option>
          ))}
        </Selection>
        <Selection libelle="Client" name="client_id" defaultValue={v.client_id ?? ""} erreur={e.client_id}>
          <option value="">—</option>
          {clients.map((t) => (
            <option key={t.id} value={t.id}>{t.libelle}</option>
          ))}
        </Selection>
      </div>
      <Bouton type="submit" disabled={enCours} className="self-start">Déclarer la non-conformité</Bouton>
    </form>
  );
}
