"use client";

import { useActionState, useState } from "react";
import { Bouton, Champ, Message, Selection } from "@/components/ui";
import { ETAT_INITIAL } from "@/lib/formulaires/etat";
import { enregistrerClient } from "../actions";

type Option = { id: string; libelle: string };

export interface ValeursClient {
  nom: string;
  type_client_id: string;
  responsable: string;
  telephone: string;
  adresse: string;
  quartier_id: string;
  nif: string;
  condition_paiement: string;
  delai_paiement_jours: string;
  plafond_credit_gnf: string;
  commercial_id: string;
  notes: string;
}

export function FormulaireClient({ id, initial, types, quartiers, commerciaux }: { id: string | null; initial?: ValeursClient; types: Option[]; quartiers: Option[]; commerciaux: Option[] }) {
  const [etat, action, enCours] = useActionState(enregistrerClient.bind(null, id), ETAT_INITIAL);
  const v: Partial<ValeursClient> = { ...initial, ...(etat.ok ? {} : etat.valeurs) };
  const e = etat.erreurs ?? {};
  const [condition, setCondition] = useState(v.condition_paiement ?? "comptant");
  const liste = (o: Option[]) => o.map((x) => <option key={x.id} value={x.id}>{x.libelle}</option>);
  return (
    <form action={action} className="flex flex-col gap-3">
      {etat.message && <Message ton={etat.ok ? "succes" : "erreur"}>{etat.message}</Message>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Champ libelle="Nom / raison sociale" name="nom" required defaultValue={v.nom} erreur={e.nom} />
        <Selection libelle="Type de client" name="type_client_id" defaultValue={v.type_client_id ?? ""} erreur={e.type_client_id}>
          <option value="">— Choisir —</option>
          {liste(types)}
        </Selection>
        <Champ libelle="Responsable" name="responsable" defaultValue={v.responsable} erreur={e.responsable} />
        <Champ libelle="Téléphone" name="telephone" type="tel" defaultValue={v.telephone} erreur={e.telephone} placeholder="+224 6xx xx xx xx" />
        <Champ libelle="Adresse" name="adresse" defaultValue={v.adresse} erreur={e.adresse} />
        <Selection libelle="Quartier" name="quartier_id" defaultValue={v.quartier_id ?? ""} erreur={e.quartier_id}>
          <option value="">— Non précisé —</option>
          {liste(quartiers)}
        </Selection>
        <Champ libelle="NIF" name="nif" defaultValue={v.nif} erreur={e.nif} />
        <Selection libelle="Commercial responsable" name="commercial_id" defaultValue={v.commercial_id ?? ""} erreur={e.commercial_id}>
          <option value="">— Aucun —</option>
          {liste(commerciaux)}
        </Selection>
        <Selection libelle="Condition de paiement" name="condition_paiement" value={condition} onChange={(ev) => setCondition(ev.target.value)} erreur={e.condition_paiement}>
          <option value="comptant">Comptant</option>
          <option value="credit">Crédit</option>
        </Selection>
        {condition === "credit" && (
          <>
            <Champ libelle="Délai de paiement (jours)" name="delai_paiement_jours" inputMode="numeric" defaultValue={v.delai_paiement_jours} erreur={e.delai_paiement_jours} />
            <Champ libelle="Plafond de crédit (GNF)" name="plafond_credit_gnf" inputMode="numeric" defaultValue={v.plafond_credit_gnf} erreur={e.plafond_credit_gnf} aide="0 = pas de plafond" />
          </>
        )}
        <Champ libelle="Notes" name="notes" defaultValue={v.notes} erreur={e.notes} className="sm:col-span-2" />
      </div>
      <Bouton type="submit" disabled={enCours} className="self-start">
        {id ? "Enregistrer" : "Créer le client"}
      </Bouton>
    </form>
  );
}
