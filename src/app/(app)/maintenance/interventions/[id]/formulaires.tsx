"use client";

import { useActionState } from "react";
import { Bouton, Champ, Message, Selection } from "@/components/ui";
import { ETAT_INITIAL } from "@/lib/formulaires/etat";
import { ajouterPiece, enregistrerIntervention } from "../../actions";

export interface SuiviIntervention {
  debut: string;
  fin: string;
  intervenant: string;
  cause: string;
  travaux: string;
  arret_machine: boolean;
  cout_main_oeuvre_gnf: number;
  cout_externe_gnf: number;
}

export function FormulaireSuivi({ id, valeurs, curative }: { id: string; valeurs: SuiviIntervention; curative: boolean }) {
  const [etat, action, enCours] = useActionState(enregistrerIntervention.bind(null, id), ETAT_INITIAL);
  const v = etat.valeurs ?? {};
  const val = (k: keyof SuiviIntervention) => v[k] ?? String(valeurs[k] ?? "");
  const e = etat.erreurs ?? {};
  return (
    <form action={action} className="flex flex-col gap-3">
      {etat.message && <Message ton={etat.ok ? "succes" : "erreur"}>{etat.message}</Message>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Champ libelle="Début de l'intervention" name="debut" type="datetime-local" defaultValue={val("debut")} erreur={e.debut} />
        <Champ libelle="Fin de l'intervention" name="fin" type="datetime-local" defaultValue={val("fin")} erreur={e.fin} />
        <Champ libelle="Intervenant(s)" name="intervenant" defaultValue={val("intervenant")} />
        {curative && <Champ libelle="Cause de la panne" name="cause" defaultValue={val("cause")} erreur={e.cause} />}
        <label className="flex flex-col sm:col-span-2">
          <span className="text-sm font-medium text-gray-700">Travaux réalisés</span>
          <textarea name="travaux" rows={3} defaultValue={val("travaux")} className="rounded-lg border border-gray-300 p-3" />
        </label>
        <Champ libelle="Main-d'œuvre (GNF)" name="cout_main_oeuvre_gnf" inputMode="numeric" defaultValue={val("cout_main_oeuvre_gnf")} erreur={e.cout_main_oeuvre_gnf} />
        <Champ libelle="Prestataire externe (GNF)" name="cout_externe_gnf" inputMode="numeric" defaultValue={val("cout_externe_gnf")} erreur={e.cout_externe_gnf} />
      </div>
      <label className="flex min-h-11 items-center gap-2">
        <input type="checkbox" name="arret_machine" defaultChecked={v.arret_machine !== undefined ? v.arret_machine === "on" : valeurs.arret_machine} className="size-5 accent-papel-700" />
        Machine à l&apos;arrêt pendant l&apos;intervention
      </label>
      <div className="flex flex-wrap gap-2">
        <Bouton type="submit" disabled={enCours} variante="secondaire">Enregistrer</Bouton>
        <Bouton type="submit" name="terminer" value="1" disabled={enCours}>Enregistrer et terminer</Bouton>
      </div>
    </form>
  );
}

export function FormulairePiece({ id, pieces }: { id: string; pieces: { id: string; libelle: string }[] }) {
  const [etat, action, enCours] = useActionState(ajouterPiece.bind(null, id), ETAT_INITIAL);
  const v = etat.ok ? {} : (etat.valeurs ?? {});
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      {etat.message && <div className="w-full"><Message ton={etat.ok ? "succes" : "erreur"}>{etat.message}</Message></div>}
      <Selection libelle="Pièce" name="article_id" defaultValue={v.article_id ?? ""} erreur={etat.erreurs?.article_id} className="basis-64 flex-1">
        <option value="">— Choisir —</option>
        {pieces.map((p) => (
          <option key={p.id} value={p.id}>{p.libelle}</option>
        ))}
      </Selection>
      <Champ libelle="Quantité" name="quantite" inputMode="decimal" defaultValue={v.quantite ?? "1"} erreur={etat.erreurs?.quantite} className="basis-24" />
      <Bouton type="submit" disabled={enCours}>Ajouter</Bouton>
    </form>
  );
}
