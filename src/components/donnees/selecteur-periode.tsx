import { X } from "lucide-react";
import Link from "next/link";
import { adresseFiltres, type FiltresAnalyse } from "@/lib/formulaires/filtres-analyse";
import { aujourdhui } from "@/lib/formulaires/dates";
import { libelleMois, listeAnnees, listeMois, listeSemaines, PERIODES, type Periode } from "@/lib/formulaires/periode";
import { ChoixFiltre } from "./choix-filtre";
import { ChoixPeriode } from "./choix-periode";
import type { OptionFiltre } from "./filtres";

/**
 * Barre de filtres des vues d'ensemble : UN filtre de date (liste déroulante Jour / Semaine / Mois / Année /
 * Dates choisies, puis le jour, la semaine, le mois ou l'année voulus) et, quand la page les prend en compte,
 * gamme de produits et commercial. Tout est dans l'adresse : on peut la partager.
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
  const filtreActif = !!(filtres?.produit || filtres?.commercial);
  const jour = aujourdhui();
  const libelle =
    periode.code === "mois"
      ? libelleMois(periode.du.slice(0, 7))
      : periode.code === "annee"
        ? `Année ${periode.du.slice(0, 4)}`
        : periode.code === "jour"
          ? periode.du === jour ? "Aujourd'hui" : "Jour choisi"
          : periode.code === "semaine"
            ? "Semaine du lundi"
            : PERIODES.find((p) => p.code === periode.code)?.libelle;

  return (
    <div className="mb-4 print:hidden">
      <div className="flex flex-wrap items-center gap-2">
        <ChoixPeriode
          key={`${periode.code}${periode.du}${periode.au}`}
          code={periode.code}
          du={periode.du}
          au={periode.au}
          aujourdhui={jour}
          mois={listeMois(jour)}
          semaines={listeSemaines(jour)}
          annees={listeAnnees(jour)}
        />
        {filtres && gammes && gammes.length > 0 && <ChoixFiltre nom="produit" libelle="Gamme de produits" tous="Toutes gammes" options={gammes} valeur={filtres.produit} />}
        {filtres && commerciaux && commerciaux.length > 0 && <ChoixFiltre nom="commercial" libelle="Commercial" tous="Tous commerciaux" options={commerciaux} valeur={filtres.commercial} />}
        {filtreActif && (
          <Link href={adresseFiltres(actuels, { produit: null, commercial: null })} scroll={false} className="flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-medium text-gray-600 hover:bg-white hover:text-gray-900">
            <X size={14} aria-hidden /> Effacer les filtres
          </Link>
        )}
      </div>
      <p className="mt-1.5 text-sm text-gray-500">
        {libelle} · du {periode.du.split("-").reverse().join("/")} au {periode.au.split("-").reverse().join("/")}
      </p>
    </div>
  );
}
