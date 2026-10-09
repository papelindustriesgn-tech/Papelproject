"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Bouton } from "@/components/ui";
import { ETAT_INITIAL } from "@/lib/formulaires/etat";
import { genererChargesMois } from "../actions";

export function BoutonChargesMois() {
  const [etat, action, enCours] = useActionState(genererChargesMois, ETAT_INITIAL);
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <Bouton type="submit" disabled={enCours} variante="secondaire">Générer les charges fixes du mois</Bouton>
      <Link href="/finance/listes/charges-recurrentes" className="font-semibold text-papel-700 underline">Gérer les charges fixes</Link>
      {etat.message && <span role="status" className="text-sm">{etat.message}</span>}
    </form>
  );
}
