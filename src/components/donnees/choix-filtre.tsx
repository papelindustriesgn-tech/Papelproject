"use client";

import { Package, UserRound } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { adresseFiltres } from "@/lib/formulaires/filtres-analyse";
import type { OptionFiltre } from "./filtres";

const ICONES = { produit: Package, commercial: UserRound };

/**
 * Liste déroulante d'un filtre de vue d'ensemble (gamme, commercial) : un choix suffit, la page se recharge
 * avec le filtre dans l'adresse (les autres filtres et la période sont gardés).
 */
export function ChoixFiltre({ nom, libelle, tous, options, valeur }: { nom: "produit" | "commercial"; libelle: string; tous: string; options: OptionFiltre[]; valeur: string | null }) {
  const routeur = useRouter();
  const chemin = usePathname();
  const recherche = useSearchParams();
  const [enCours, demarrer] = useTransition();
  const Icone = ICONES[nom];
  return (
    <label className={`ombre-carte flex min-h-12 items-center gap-2 rounded-2xl px-3 transition ${valeur ? "bg-papel-700 text-white" : "bg-white text-gray-700"} ${enCours ? "opacity-60" : ""}`}>
      <Icone size={16} aria-hidden className="shrink-0" />
      <span className="sr-only">{libelle}</span>
      <select
        value={valeur ?? ""}
        aria-label={libelle}
        onChange={(e) => {
          const adresse = adresseFiltres(Object.fromEntries(recherche.entries()), { [nom]: e.target.value || null });
          demarrer(() => routeur.push(`${chemin}${adresse}`, { scroll: false }));
        }}
        className="min-h-11 max-w-[13rem] cursor-pointer appearance-none truncate bg-transparent pr-1 text-sm font-semibold outline-none md:min-h-10 [&>option]:text-gray-900"
      >
        <option value="">{tous}</option>
        {options.map((o) => (
          <option key={o.valeur} value={o.valeur}>
            {o.libelle}
          </option>
        ))}
      </select>
      <span aria-hidden className="text-xs opacity-70">▾</span>
    </label>
  );
}
