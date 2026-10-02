"use client";

import { useActionState } from "react";
import { Bouton, Message, Selection } from "@/components/ui";
import { ETAT_INITIAL } from "@/lib/formulaires/etat";
import { associerPiece } from "../../actions";

export function FormulaireAssocierPiece({ equipementId, pieces }: { equipementId: string; pieces: { id: string; libelle: string }[] }) {
  const [etat, action, enCours] = useActionState(associerPiece.bind(null, equipementId), ETAT_INITIAL);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      {etat.message && <div className="w-full"><Message ton={etat.ok ? "succes" : "erreur"}>{etat.message}</Message></div>}
      <Selection libelle="Pièce détachée" name="article_id" defaultValue="" erreur={etat.erreurs?.article_id} className="basis-64 flex-1">
        <option value="">— Choisir —</option>
        {pieces.map((p) => (
          <option key={p.id} value={p.id}>{p.libelle}</option>
        ))}
      </Selection>
      <label className="flex min-h-11 items-center gap-2">
        <input type="checkbox" name="critique" className="size-5 accent-papel-700" /> Pièce critique
      </label>
      <Bouton type="submit" disabled={enCours}>Associer</Bouton>
    </form>
  );
}
