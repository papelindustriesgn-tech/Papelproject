import type { Metadata } from "next";
import { ActionsAppli } from "@/components/coque/entree-appli";
import { IndicateursEssentiels } from "@/components/direction/sections";
import { SelecteurPeriode } from "@/components/donnees/selecteur-periode";
import { GraphiqueAnneau } from "@/components/graphiques/hero";
import { CarteObjectifs } from "@/components/objectifs/carte-objectifs";
import { Carte, TitrePage } from "@/components/ui";
import { BoutonImprimer } from "@/components/ui/bouton-imprimer";
import { CarteHero } from "@/components/ui/carte-hero";
import { ecartRelatif, PastilleVariation } from "@/components/ui/indicateur";
import { chargerSynthese } from "@/lib/direction/synthese";
import { chargerCoutsUsine, chargerIndicateursLivraison } from "@/lib/performance/charger";
import { chargerOptionsFiltres, decrireFiltres } from "@/lib/filtres/options";
import { aujourdhui } from "@/lib/formulaires/dates";
import { lireFiltresAnalyse, lirePeriode } from "@/lib/formulaires/filtres-analyse";
import { serieRegroupee } from "@/lib/formulaires/periode";
import { gnf } from "@/lib/stocks/libelles";

export const metadata: Metadata = { title: "Tableau de bord" };

/**
 * Tableau de bord de la Direction : l'essentiel de l'usine sur un écran (chiffre d'affaires, 8 chiffres clés rangés
 * par question : argent, coût du paquet, usine, clients ; objectifs). Le détail est dans chaque application (liens des tuiles) et dans le rapport de la semaine.
 */
export default async function TableauDeBordDirection({ searchParams }: PageProps<"/direction">) {
  const sp = await searchParams;
  const periode = lirePeriode(sp, aujourdhui());
  const filtres = lireFiltresAnalyse(sp);
  const [s, options, couts, coutsPrec, livraison, livraisonPrec] = await Promise.all([
    chargerSynthese(periode, filtres),
    chargerOptionsFiltres(),
    chargerCoutsUsine(periode.du, periode.au),
    chargerCoutsUsine(periode.precedente.du, periode.precedente.au),
    chargerIndicateursLivraison(periode.du, periode.au),
    chargerIndicateursLivraison(periode.precedente.du, periode.precedente.au),
  ]);
  const filtre = !!(filtres.produit || filtres.commercial);
  const filtresTexte = decrireFiltres(filtres, options);

  return (
    <>
      <TitrePage
        titre="Tableau de bord"
        sousTitre={filtresTexte ? `Filtré : ${filtresTexte}` : "Toute l'usine en un coup d'œil"}
        action={
          <>
            <BoutonImprimer />
            <ActionsAppli espace="direction" />
          </>
        }
      />
      <SelecteurPeriode periode={periode} params={sp} filtres={filtres} gammes={options.produits} commerciaux={options.commerciaux} />
      <div className="mb-4 grid gap-4 xl:grid-cols-3">
        <CarteHero
          className="xl:col-span-2"
          titre="Chiffre d'affaires HT"
          valeur={gnf(s.ventes.caHtGnf)}
          sousTitre={
            <span className="flex flex-wrap items-center gap-2">
              Comparé à la période précédente <PastilleVariation v={{ ecart: ecartRelatif(s.ventes.caHtGnf, s.ventesPrec.caHtGnf) }} />
            </span>
          }
          points={serieRegroupee(periode, (d) => s.ventes.caParJour.get(d) ?? 0)}
          format="gnf"
          lien="/ventes"
          stats={[
            { libelle: "Marge brute", valeur: gnf(s.marge.margeGnf), detail: s.marge.taux === null ? undefined : `${(Math.round(s.marge.taux * 1000) / 10).toLocaleString("fr-FR")} % du CA` },
            { libelle: "Trésorerie", valeur: gnf(s.finance.tresorerieGnf) },
            { libelle: "Production", valeur: `${s.production.paquetsBons.toLocaleString("fr-FR")} paquets` },
          ]}
        />
        <Carte titre="Chiffre d'affaires par produit" className="break-inside-avoid">
          <GraphiqueAnneau donnees={s.ventes.parProduit.map((p) => ({ libelle: p.libelle, valeur: p.caHtGnf }))} format="gnf" libelleTotal="CA HT" />
        </Carte>
      </div>
      <IndicateursEssentiels s={s} couts={couts} coutsPrec={coutsPrec} livraison={livraison} livraisonPrec={livraisonPrec} filtre={filtre} />
      <CarteObjectifs
        espace="direction"
        du={periode.du}
        au={periode.au}
        filtre={filtre}
        reels={{
          ca_ttc: s.ventes.caTtcGnf,
          paquets_produits: s.production.paquetsBons,
          papier_kg: s.production.tonnesConsommees * 1000,
          marge_brute: s.marge.margeGnf,
          encaissements: s.ventes.encaisseGnf,
          resultat: filtre ? null : s.marge.margeGnf - couts.chargesGnf,
          cout_complet_paquet: couts.parPaquet?.totalGnf ?? null,
          otif: livraison.otif,
        }}
      />
    </>
  );
}
