"use client";

import { useActionState, useState } from "react";
import { Bouton, Champ, Message, Selection } from "@/components/ui";
import { ETAT_INITIAL } from "@/lib/formulaires/etat";
import { ETAPES_CONTROLE } from "@/lib/qualite/libelles";
import { creerControle } from "../actions";

type Option = { id: string; libelle: string };

export function FormulaireNouveauControle({ lots, fiches, dateDuJour }: { lots: Option[]; fiches: Option[]; dateDuJour: string }) {
  const [etat, action, enCours] = useActionState(creerControle, ETAT_INITIAL);
  const v = etat.valeurs ?? {};
  const e = etat.erreurs ?? {};
  const [etape, setEtape] = useState(v.etape ?? "reception");
  return (
    <form action={action} className="flex flex-col gap-3">
      {etat.message && <Message ton="erreur">{etat.message}</Message>}
      <div className="grid gap-3 sm:grid-cols-3">
        <Selection libelle="Étape" name="etape" value={etape} onChange={(ev) => setEtape(ev.target.value)} erreur={e.etape}>
          {Object.entries(ETAPES_CONTROLE).map(([val, l]) => (
            <option key={val} value={val}>{l}</option>
          ))}
        </Selection>
        {etape === "reception" ? (
          <Selection libelle="Bobine" name="lot_id" defaultValue={v.lot_id ?? ""} erreur={e.lot_id}>
            <option value="">— Choisir —</option>
            {lots.map((l) => (
              <option key={l.id} value={l.id}>{l.libelle}</option>
            ))}
          </Selection>
        ) : (
          <Selection libelle="Lot de produits finis (fiche)" name="fiche_id" defaultValue={v.fiche_id ?? ""} erreur={e.fiche_id}>
            <option value="">— Choisir —</option>
            {fiches.map((f) => (
              <option key={f.id} value={f.id}>{f.libelle}</option>
            ))}
          </Selection>
        )}
        <Champ libelle="Date du contrôle" name="date_controle" type="date" defaultValue={v.date_controle ?? dateDuJour} max={dateDuJour} erreur={e.date_controle} />
      </div>
      <Bouton type="submit" disabled={enCours} className="self-start">Commencer le contrôle</Bouton>
    </form>
  );
}
