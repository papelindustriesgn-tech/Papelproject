"use client";

import { CalendarDays } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { adresseFiltres } from "@/lib/formulaires/filtres-analyse";
import type { OptionFiltre } from "./filtres";

type Genre = "jour" | "semaine" | "mois" | "annee" | "perso";
const GENRES: { code: Genre; libelle: string }[] = [
  { code: "jour", libelle: "Jour" },
  { code: "semaine", libelle: "Semaine" },
  { code: "mois", libelle: "Mois" },
  { code: "annee", libelle: "Année" },
  { code: "perso", libelle: "Dates choisies" },
];

const champ = "min-h-11 cursor-pointer rounded-xl bg-gray-50 px-3 text-sm font-semibold text-gray-900 outline-none ring-1 ring-gray-200 focus:ring-2 focus:ring-papel-500 md:min-h-10";

/**
 * Filtre de date unique des vues d'ensemble : une liste déroulante pour choisir Jour, Semaine, Mois, Année
 * (ou des dates précises), puis le jour, la semaine, le mois ou l'année voulus. La page se recharge avec
 * le choix dans l'adresse ; gamme et commercial sont gardés.
 */
export function ChoixPeriode({
  code,
  du,
  au,
  aujourdhui,
  mois,
  semaines,
  annees,
}: {
  /** Code de la période affichée (7j, 30j, trimestre : présentés comme « Dates choisies »). */
  code: string;
  du: string;
  au: string;
  aujourdhui: string;
  mois: OptionFiltre[];
  semaines: OptionFiltre[];
  annees: OptionFiltre[];
}) {
  const routeur = useRouter();
  const chemin = usePathname();
  const recherche = useSearchParams();
  const [enCours, demarrer] = useTransition();
  const actuel: Genre = GENRES.some((g) => g.code === code) ? (code as Genre) : "perso";
  const [genre, setGenre] = useState<Genre>(actuel);
  const [dates, setDates] = useState({ du, au });

  const aller = (changements: Record<string, string | null>) => {
    const adresse = adresseFiltres(Object.fromEntries(recherche.entries()), { jour: null, mois: null, annee: null, du: null, au: null, ...changements });
    demarrer(() => routeur.push(`${chemin}${adresse}`, { scroll: false }));
  };

  // Changer de genre affiche tout de suite la période en cours (aujourd'hui, cette semaine, ce mois, cette année).
  const changerGenre = (g: Genre) => {
    setGenre(g);
    if (g !== "perso") aller({ periode: g });
  };

  return (
    <div className={`ombre-carte flex max-w-full flex-wrap items-center gap-2 rounded-2xl bg-white p-1.5 ${enCours ? "opacity-60" : ""}`} role="group" aria-label="Période">
      <label className="flex items-center gap-2 rounded-xl bg-papel-700 pl-3 text-white">
        <CalendarDays size={16} aria-hidden className="shrink-0" />
        <span className="sr-only">Type de période</span>
        <select
          value={genre}
          onChange={(e) => changerGenre(e.target.value as Genre)}
          aria-label="Type de période"
          className="min-h-11 cursor-pointer appearance-none bg-transparent pr-7 text-sm font-semibold outline-none md:min-h-10 [&>option]:text-gray-900"
          style={{ backgroundImage: "none" }}
        >
          {GENRES.map((g) => (
            <option key={g.code} value={g.code}>
              {g.libelle}
            </option>
          ))}
        </select>
        <span aria-hidden className="pointer-events-none -ml-6 mr-2 text-xs opacity-80">▾</span>
      </label>

      {genre === "jour" && (
        <input
          type="date"
          aria-label="Jour"
          max={aujourdhui}
          value={actuel === "jour" ? du : aujourdhui}
          onChange={(e) => e.target.value && aller({ periode: "jour", jour: e.target.value })}
          className={champ}
        />
      )}
      {genre === "semaine" && (
        <select aria-label="Semaine" value={actuel === "semaine" ? du : semaines[0]?.valeur} onChange={(e) => aller({ periode: "semaine", jour: e.target.value })} className={champ}>
          {semaines.map((s) => (
            <option key={s.valeur} value={s.valeur}>
              {s.libelle}
            </option>
          ))}
        </select>
      )}
      {genre === "mois" && (
        <select aria-label="Mois" value={actuel === "mois" ? du.slice(0, 7) : mois[0]?.valeur} onChange={(e) => aller({ periode: "mois", mois: e.target.value })} className={champ}>
          {mois.map((m) => (
            <option key={m.valeur} value={m.valeur}>
              {m.libelle}
            </option>
          ))}
        </select>
      )}
      {genre === "annee" && (
        <select aria-label="Année" value={actuel === "annee" ? du.slice(0, 4) : annees[0]?.valeur} onChange={(e) => aller({ periode: "annee", annee: e.target.value })} className={champ}>
          {annees.map((a) => (
            <option key={a.valeur} value={a.valeur}>
              {a.libelle}
            </option>
          ))}
        </select>
      )}
      {genre === "perso" && (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (dates.du && dates.au) aller({ periode: "perso", du: dates.du <= dates.au ? dates.du : dates.au, au: dates.du <= dates.au ? dates.au : dates.du });
          }}
        >
          <label className="flex items-center gap-1 text-sm text-gray-600">
            Du
            <input type="date" max={aujourdhui} value={dates.du} onChange={(e) => setDates({ ...dates, du: e.target.value })} className={champ} />
          </label>
          <label className="flex items-center gap-1 text-sm text-gray-600">
            au
            <input type="date" max={aujourdhui} value={dates.au} onChange={(e) => setDates({ ...dates, au: e.target.value })} className={champ} />
          </label>
          <button className="min-h-11 rounded-xl bg-papel-700 px-4 text-sm font-semibold text-white hover:bg-papel-800 md:min-h-10">Afficher</button>
        </form>
      )}
    </div>
  );
}
