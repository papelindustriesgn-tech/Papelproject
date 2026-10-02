"use client";

import { useActionState } from "react";
import { Bouton, Champ, Message, Selection } from "@/components/ui";
import { ETAT_INITIAL } from "@/lib/formulaires/etat";
import { receptionnerBobine } from "../actions";

export function FormulaireReception({
  articles,
  fournisseurs,
  dateDuJour,
}: {
  articles: { id: string; libelle: string }[];
  fournisseurs: { id: string; nom: string }[];
  dateDuJour: string;
}) {
  const [etat, action, enCours] = useActionState(receptionnerBobine, ETAT_INITIAL);
  const v = etat.ok ? {} : (etat.valeurs ?? {});
  const e = etat.erreurs ?? {};
  return (
    <form action={action} className="flex flex-col gap-3">
      {etat.message && <Message ton={etat.ok ? "succes" : "erreur"}>{etat.message}</Message>}
      <div className="grid gap-3 sm:grid-cols-3">
        <Selection libelle="Article" name="article_id" defaultValue={v.article_id ?? (articles.length === 1 ? articles[0].id : "")} erreur={e.article_id}>
          <option value="">— Choisir —</option>
          {articles.map((a) => (
            <option key={a.id} value={a.id}>
              {a.libelle}
            </option>
          ))}
        </Selection>
        <Champ libelle="N° de lot" name="numero_lot" required defaultValue={v.numero_lot} erreur={e.numero_lot} />
        <Selection libelle="Fournisseur" name="fournisseur_id" defaultValue={v.fournisseur_id ?? ""} erreur={e.fournisseur_id}>
          <option value="">— Non précisé —</option>
          {fournisseurs.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nom}
            </option>
          ))}
        </Selection>
        <Champ libelle="Poids net (kg)" name="poids_net_kg" inputMode="decimal" required defaultValue={v.poids_net_kg} erreur={e.poids_net_kg} />
        <Champ libelle="Coût réel rendu usine (GNF/kg)" name="cout_kg_gnf" inputMode="decimal" defaultValue={v.cout_kg_gnf} erreur={e.cout_kg_gnf} aide="Prix + fret + transit + douane + transport" />
        <Champ libelle="Date de réception" name="date_reception" type="date" required defaultValue={v.date_reception ?? dateDuJour} max={dateDuJour} erreur={e.date_reception} />
        <Champ libelle="Grammage (g/m²)" name="grammage_g_m2" inputMode="decimal" defaultValue={v.grammage_g_m2 ?? "13"} erreur={e.grammage_g_m2} />
        <Champ libelle="Largeur (mm)" name="largeur_mm" inputMode="decimal" defaultValue={v.largeur_mm} erreur={e.largeur_mm} />
        <Champ libelle="Diamètre (mm)" name="diametre_mm" inputMode="decimal" defaultValue={v.diametre_mm} erreur={e.diametre_mm} />
        <Champ libelle="Nombre de plis" name="plis" inputMode="numeric" defaultValue={v.plis} erreur={e.plis} />
        <Champ libelle="Notes" name="notes" defaultValue={v.notes} erreur={e.notes} className="sm:col-span-2" />
      </div>
      <Bouton type="submit" disabled={enCours} className="self-start">
        {enCours ? "Enregistrement…" : "Réceptionner la bobine"}
      </Bouton>
    </form>
  );
}
