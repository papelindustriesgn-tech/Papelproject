"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { adresseFiltres } from "@/lib/formulaires/filtres-analyse";
import type { OptionFiltre } from "./filtres";

/**
 * Pastille « Mois » sous forme de liste déroulante : on choisit le mois à afficher (le plus récent en haut).
 * La page se recharge avec `?periode=mois&mois=AAAA-MM` ; gamme et commercial sont gardés.
 */
export function ChoixMois({ mois, valeur }: { mois: OptionFiltre[]; valeur: string | null }) {
  const routeur = useRouter();
  const chemin = usePathname();
  const recherche = useSearchParams();
  const [enCours, demarrer] = useTransition();
  return (
    <label className={`relative flex min-h-10 shrink-0 items-center rounded-xl text-sm font-semibold transition ${valeur ? "bg-papel-700 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"} ${enCours ? "opacity-60" : ""}`}>
      <span className="sr-only">Mois</span>
      <select
        value={valeur ?? ""}
        aria-label="Choisir le mois"
        onChange={(e) => {
          const adresse = adresseFiltres(Object.fromEntries(recherche.entries()), { periode: "mois", mois: e.target.value, du: null, au: null });
          demarrer(() => routeur.push(`${chemin}${adresse}`, { scroll: false }));
        }}
        className="min-h-10 cursor-pointer appearance-none bg-transparent py-0 pl-2.5 pr-6 outline-none sm:pl-3.5 sm:pr-7 [&>option]:text-gray-900"
      >
        {!valeur && (
          <option value="" disabled>
            Mois
          </option>
        )}
        {mois.map((m) => (
          <option key={m.valeur} value={m.valeur}>
            {m.libelle}
          </option>
        ))}
      </select>
      <span aria-hidden className="pointer-events-none absolute right-2 text-xs opacity-70">▾</span>
    </label>
  );
}
