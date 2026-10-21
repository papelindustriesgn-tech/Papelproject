"use client";

import { useActionState } from "react";
import { ETAT_INITIAL } from "@/lib/formulaires/etat";
import { reattribuer } from "./actions";

/** Liste déroulante de réattribution d'un point de vente (enregistre dès le choix). */
export function Reattribution({ pvaId, commercialId, commerciaux }: { pvaId: string; commercialId: string; commerciaux: { id: string; nom: string }[] }) {
  const [etat, action, enCours] = useActionState(reattribuer.bind(null, pvaId), ETAT_INITIAL);
  return (
    <form action={action} className="flex flex-col gap-1">
      <select
        name="commercial_id"
        defaultValue={commercialId}
        disabled={enCours}
        aria-label="Commercial"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="min-h-11 rounded border border-gray-300 bg-white px-2 md:min-h-9"
      >
        {commerciaux.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nom}
          </option>
        ))}
      </select>
      {etat.message && <span className={`text-sm ${etat.ok ? "text-green-700" : "text-red-700"}`}>{etat.message}</span>}
    </form>
  );
}
