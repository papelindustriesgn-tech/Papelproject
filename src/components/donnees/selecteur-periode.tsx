import { CalendarRange, X } from "lucide-react";
import Link from "next/link";
import { adresseFiltres, type FiltresAnalyse } from "@/lib/formulaires/filtres-analyse";
import { aujourdhui } from "@/lib/formulaires/dates";
import { libelleMois, listeMois, PERIODES, type Periode } from "@/lib/formulaires/periode";
import { ChoixFiltre } from "./choix-filtre";
import { ChoixMois } from "./choix-mois";
import type { OptionFiltre } from "./filtres";

/**
 * Les quatre périodes demandées par la direction : Jour, Semaine, Mois (liste déroulante des mois), Année ;
 * les autres sont repliées dans « Autres dates ».
 */
const PRINCIPALES: Record<string, string> = { jour: "Jour", semaine: "Semaine", mois: "Mois", annee: "Année" };
const AUTRES: Record<string, string> = { "7j": "7 derniers jours", "30j": "30 derniers jours", trimestre: "Ce trimestre" };

/**
 * Barre de filtres des vues d'ensemble : période (jour, semaine, mois, année, autres dates) et, quand la page
 * les prend en compte, gamme de produits et commercial. Tout est dans l'adresse : on peut la partager.
 * Une liste vide (aucune gamme, ou commerciaux non visibles pour ce rôle) n'affiche pas son filtre.
 */
export function SelecteurPeriode({
  periode,
  params = {},
  filtres,
  gammes,
  commerciaux,
}: {
  periode: Periode;
  /** Paramètres actuels de l'adresse (pour garder les autres filtres quand on en change un). */
  params?: Record<string, string | string[] | undefined>;
  filtres?: FiltresAnalyse;
  gammes?: OptionFiltre[];
  commerciaux?: OptionFiltre[];
}) {
  const actuels = Object.fromEntries(Object.entries(params).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const lienPeriode = (code: string) => adresseFiltres(actuels, { periode: code, mois: null, du: null, au: null });
  const autreActive = periode.code === "perso" || periode.code in AUTRES;
  const pastille = (actif: boolean) =>
    `flex min-h-10 shrink-0 items-center rounded-xl px-2.5 text-sm font-semibold transition sm:px-3.5 ${actif ? "bg-papel-700 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"}`;
  const filtreActif = !!(filtres?.produit || filtres?.commercial);

  return (
    <div className="mb-4 print:hidden">
      <div className="flex flex-wrap items-center gap-2">
        <div className="ombre-carte flex max-w-full flex-wrap gap-1 rounded-2xl bg-white p-1" role="group" aria-label="Période">
          {Object.entries(PRINCIPALES).map(([code, libelle]) =>
            code === "mois" ? (
              <ChoixMois key={code} mois={listeMois(aujourdhui())} valeur={periode.code === "mois" ? periode.du.slice(0, 7) : null} />
            ) : (
              <Link key={code} href={lienPeriode(code)} scroll={false} aria-current={periode.code === code ? "true" : undefined} className={pastille(periode.code === code)}>
                {libelle}
              </Link>
            ),
          )}
        </div>
        <details className="relative" open={periode.code === "perso"}>
          <summary className={`ombre-carte flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-2xl px-3.5 text-sm font-semibold ${autreActive ? "bg-papel-700 text-white" : "bg-white text-gray-700"}`}>
            <CalendarRange size={16} aria-hidden /> {AUTRES[periode.code] ?? (periode.code === "perso" ? "Dates choisies" : "Autres dates")}
          </summary>
          <div className="ombre-carte absolute left-0 z-20 mt-2 w-72 rounded-2xl bg-white p-3 md:w-max">
            <div className="mb-3 flex flex-wrap gap-1">
              {Object.entries(AUTRES).map(([code, libelle]) => (
                <Link key={code} href={lienPeriode(code)} scroll={false} aria-current={periode.code === code ? "true" : undefined} className={`${pastille(periode.code === code)} ring-1 ring-gray-200`}>
                  {libelle}
                </Link>
              ))}
            </div>
            <form className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="periode" value="perso" />
              {filtres?.produit && <input type="hidden" name="produit" value={filtres.produit} />}
              {filtres?.commercial && <input type="hidden" name="commercial" value={filtres.commercial} />}
              <label className="flex flex-col">
                <span className="text-sm font-medium text-gray-700">Du</span>
                <input type="date" name="du" defaultValue={periode.du} className="min-h-11 rounded-xl border border-gray-200 bg-white px-3 md:min-h-10" />
              </label>
              <label className="flex flex-col">
                <span className="text-sm font-medium text-gray-700">Au</span>
                <input type="date" name="au" defaultValue={periode.au} className="min-h-11 rounded-xl border border-gray-200 bg-white px-3 md:min-h-10" />
              </label>
              <button className="min-h-11 rounded-xl bg-papel-700 px-4 font-medium text-white hover:bg-papel-800 md:min-h-10">Afficher</button>
            </form>
          </div>
        </details>
        {filtres && gammes && gammes.length > 0 && <ChoixFiltre nom="produit" libelle="Gamme de produits" tous="Toutes gammes" options={gammes} valeur={filtres.produit} />}
        {filtres && commerciaux && commerciaux.length > 0 && <ChoixFiltre nom="commercial" libelle="Commercial" tous="Tous commerciaux" options={commerciaux} valeur={filtres.commercial} />}
        {filtreActif && (
          <Link href={adresseFiltres(actuels, { produit: null, commercial: null })} scroll={false} className="flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-medium text-gray-600 hover:bg-white hover:text-gray-900">
            <X size={14} aria-hidden /> Effacer les filtres
          </Link>
        )}
      </div>
      <p className="mt-1.5 text-sm text-gray-500">
        {periode.code === "mois" ? libelleMois(periode.du.slice(0, 7)) : PERIODES.find((p) => p.code === periode.code)?.libelle} · du {periode.du.split("-").reverse().join("/")} au {periode.au.split("-").reverse().join("/")}
      </p>
    </div>
  );
}
