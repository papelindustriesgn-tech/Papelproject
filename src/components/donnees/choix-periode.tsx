"use client";

import { CalendarDays, Check, ChevronDown } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { adresseFiltres } from "@/lib/formulaires/filtres-analyse";
import type { OptionFiltre } from "./filtres";

type Genre = "jour" | "semaine" | "mois" | "annee" | "perso";
const ONGLETS: { code: Genre; libelle: string }[] = [
  { code: "jour", libelle: "Jour" },
  { code: "semaine", libelle: "Semaine" },
  { code: "mois", libelle: "Mois" },
  { code: "annee", libelle: "Année" },
  { code: "perso", libelle: "Dates" },
];

const champ = "min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm md:min-h-10";

/**
 * Filtre de date unique des vues d'ensemble : UN bouton (la période affichée) qui se déroule en un panneau
 * avec les sous-filtres Jour, Semaine, Mois, Année (et des dates choisies). Un choix recharge la page avec la
 * période dans l'adresse ; gamme et commercial sont gardés.
 */
export function ChoixPeriode({
  code,
  du,
  au,
  libelle,
  aujourdhui,
  mois,
  semaines,
  annees,
}: {
  /** Code de la période affichée (7j, 30j, trimestre : présentés sous « Dates »). */
  code: string;
  du: string;
  au: string;
  /** Texte du bouton (« Octobre 2026 », « Aujourd'hui »…). */
  libelle: string;
  aujourdhui: string;
  mois: OptionFiltre[];
  semaines: OptionFiltre[];
  annees: OptionFiltre[];
}) {
  const routeur = useRouter();
  const chemin = usePathname();
  const recherche = useSearchParams();
  const [enCours, demarrer] = useTransition();
  const actuel: Genre = ONGLETS.some((g) => g.code === code) ? (code as Genre) : "perso";
  const [ouvert, setOuvert] = useState(false);
  const [onglet, setOnglet] = useState<Genre>(actuel);
  const [dates, setDates] = useState({ du, au });
  const conteneur = useRef<HTMLDivElement>(null);

  // Fermeture au clic en dehors ou avec Échap.
  useEffect(() => {
    if (!ouvert) return;
    const clic = (e: MouseEvent) => {
      if (conteneur.current && !conteneur.current.contains(e.target as Node)) setOuvert(false);
    };
    const touche = (e: KeyboardEvent) => e.key === "Escape" && setOuvert(false);
    document.addEventListener("mousedown", clic);
    document.addEventListener("keydown", touche);
    return () => {
      document.removeEventListener("mousedown", clic);
      document.removeEventListener("keydown", touche);
    };
  }, [ouvert]);

  const aller = (changements: Record<string, string | null>) => {
    setOuvert(false);
    const adresse = adresseFiltres(Object.fromEntries(recherche.entries()), { jour: null, mois: null, annee: null, du: null, au: null, ...changements });
    demarrer(() => routeur.push(`${chemin}${adresse}`, { scroll: false }));
  };

  /** Une ligne de choix du panneau (cochée si c'est la période affichée). */
  const choix = (cle: string, texte: string, actif: boolean, changements: Record<string, string | null>) => (
    <li key={cle}>
      <button
        type="button"
        onClick={() => aller(changements)}
        aria-current={actif ? "true" : undefined}
        className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-3 text-left text-sm md:min-h-10 ${actif ? "bg-papel-50 font-bold text-papel-800" : "text-gray-800 hover:bg-gray-50"}`}
      >
        {texte}
        {actif && <Check size={16} aria-hidden />}
      </button>
    </li>
  );

  const hier = new Date(Date.parse(`${aujourdhui}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

  return (
    <div ref={conteneur} className="relative">
      <button
        type="button"
        onClick={() => {
          setOnglet(actuel);
          setOuvert((o) => !o);
        }}
        aria-expanded={ouvert}
        aria-haspopup="dialog"
        className={`ombre-carte flex min-h-12 items-center gap-2 rounded-2xl bg-papel-700 px-4 text-sm font-semibold text-white transition hover:bg-papel-800 ${enCours ? "opacity-60" : ""}`}
      >
        <CalendarDays size={18} aria-hidden />
        <span>{libelle}</span>
        <ChevronDown size={16} aria-hidden className={`transition ${ouvert ? "rotate-180" : ""}`} />
      </button>

      {ouvert && (
        <div role="dialog" aria-label="Choisir la période" className="ombre-carte absolute left-0 z-30 mt-2 w-[min(25rem,calc(100vw-1.5rem))] rounded-2xl bg-white p-2">
          <div className="flex gap-1 rounded-xl bg-gray-100 p-1" role="tablist" aria-label="Type de période">
            {ONGLETS.map((o) => (
              <button
                key={o.code}
                type="button"
                role="tab"
                aria-selected={onglet === o.code}
                onClick={() => setOnglet(o.code)}
                className={`min-h-10 flex-1 rounded-lg px-1 text-xs font-bold sm:text-sm ${onglet === o.code ? "bg-white text-papel-800 shadow-sm" : "text-gray-600"}`}
              >
                {o.libelle}
              </button>
            ))}
          </div>

          <div className="mt-2 max-h-80 overflow-y-auto">
            {onglet === "jour" && (
              <div className="flex flex-col gap-2 p-1">
                <ul>
                  {choix("auj", "Aujourd'hui", actuel === "jour" && du === aujourdhui, { periode: "jour" })}
                  {choix("hier", "Hier", actuel === "jour" && du === hier, { periode: "jour", jour: hier })}
                </ul>
                <label className="flex flex-col gap-1 px-2 text-sm font-semibold text-gray-700">
                  Un autre jour
                  <input type="date" max={aujourdhui} defaultValue={actuel === "jour" ? du : ""} onChange={(e) => e.target.value && aller({ periode: "jour", jour: e.target.value })} className={champ} />
                </label>
              </div>
            )}
            {onglet === "semaine" && <ul>{semaines.map((s) => choix(s.valeur, s.libelle, actuel === "semaine" && du === s.valeur, { periode: "semaine", jour: s.valeur }))}</ul>}
            {onglet === "mois" && <ul>{mois.map((m, i) => choix(m.valeur, i === 0 ? `${m.libelle} (en cours)` : m.libelle, actuel === "mois" && du.slice(0, 7) === m.valeur, { periode: "mois", mois: m.valeur }))}</ul>}
            {onglet === "annee" && <ul>{annees.map((a, i) => choix(a.valeur, i === 0 ? `${a.libelle} (en cours)` : a.libelle, actuel === "annee" && du.slice(0, 4) === a.valeur, { periode: "annee", annee: a.valeur }))}</ul>}
            {onglet === "perso" && (
              <form
                className="flex flex-col gap-2 p-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (dates.du && dates.au) aller({ periode: "perso", du: dates.du <= dates.au ? dates.du : dates.au, au: dates.du <= dates.au ? dates.au : dates.du });
                }}
              >
                <label className="flex flex-col gap-1 text-sm font-semibold text-gray-700">
                  Du
                  <input type="date" max={aujourdhui} value={dates.du} onChange={(e) => setDates({ ...dates, du: e.target.value })} className={champ} />
                </label>
                <label className="flex flex-col gap-1 text-sm font-semibold text-gray-700">
                  Au
                  <input type="date" max={aujourdhui} value={dates.au} onChange={(e) => setDates({ ...dates, au: e.target.value })} className={champ} />
                </label>
                <button className="min-h-11 rounded-xl bg-papel-700 font-semibold text-white hover:bg-papel-800">Afficher</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
