import { X } from "lucide-react";
import Link from "next/link";
import { adresseFiltres, type FiltresAnalyse } from "@/lib/formulaires/filtres-analyse";
import { aujourdhui } from "@/lib/formulaires/dates";
import { libelleMois, listeAnnees, listeMois, listeSemaines, type Periode } from "@/lib/formulaires/periode";
import { ChoixFiltre } from "./choix-filtre";
import { ChoixPeriode } from "./choix-periode";
import type { OptionFiltre } from "./filtres";

/**
 * Barre de filtres des vues d'ensemble : UN bouton de date qui se déroule (sous-filtres Jour / Semaine / Mois /
 * Année / Dates) et, quand la page les prend en compte,
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
  const jjmmaaaa = (d: string) => d.split("-").reverse().join("/");
  // Texte du bouton de date : la période affichée, en clair.
  const libelle =
    periode.code === "mois"
      ? libelleMois(periode.du.slice(0, 7))
      : periode.code === "annee"
        ? `Année ${periode.du.slice(0, 4)}`
        : periode.code === "jour"
          ? periode.du === jour ? "Aujourd'hui" : `Le ${jjmmaaaa(periode.du)}`
          : periode.code === "semaine"
            ? `Semaine du ${jjmmaaaa(periode.du).slice(0, 5)}`
            : `Du ${jjmmaaaa(periode.du)} au ${jjmmaaaa(periode.au)}`;

  return (
    <div className="mb-4 print:hidden">
      <div className="flex flex-wrap items-center gap-2">
        <ChoixPeriode
          key={`${periode.code}${periode.du}${periode.au}`}
          code={periode.code}
          du={periode.du}
          au={periode.au}
          libelle={libelle}
          aujourdhui={jour}
          mois={listeMois(jour).map((m) => ({ valeur: m.valeur, libelle: libelleMois(m.valeur) }))}
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
        Du {jjmmaaaa(periode.du)} au {jjmmaaaa(periode.au)}
      </p>
    </div>
  );
}
