"use client";

import { useActionState } from "react";
import { Bouton, Champ, Message, Selection } from "@/components/ui";
import { creerDemande } from "@/lib/achats/demandes";
import { ETAT_INITIAL } from "@/lib/formulaires/etat";

/** Formulaire de demande d'achat (magasin, production, achats). */
export function FormulaireDemande({ espace, articles }: { espace: string; articles: { id: string; libelle: string; unite: string }[] }) {
  const [etat, action, enCours] = useActionState(creerDemande.bind(null, espace), ETAT_INITIAL);
  const v = etat.ok ? {} : (etat.valeurs ?? {});
  const e = etat.erreurs ?? {};
  return (
    <form action={action} className="flex flex-col gap-3">
      {etat.message && <Message ton={etat.ok ? "succes" : "erreur"}>{etat.message}</Message>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Selection libelle="Article" name="article_id" defaultValue={v.article_id ?? ""} erreur={e.article_id}>
          <option value="">— Choisir —</option>
          {articles.map((a) => (
            <option key={a.id} value={a.id}>
              {a.libelle} ({a.unite})
            </option>
          ))}
        </Selection>
        <Champ libelle="Quantité (dans l'unité de l'article)" name="quantite" inputMode="decimal" required defaultValue={v.quantite} erreur={e.quantite} />
        <Champ libelle="Date de besoin" name="date_besoin" type="date" defaultValue={v.date_besoin} erreur={e.date_besoin} />
        <Champ libelle="Motif" name="motif" required defaultValue={v.motif} erreur={e.motif} />
      </div>
      <Bouton type="submit" disabled={enCours} className="self-start">
        Envoyer la demande
      </Bouton>
    </form>
  );
}
