import type { Metadata } from "next";
import { GraphiqueAnneau } from "@/components/graphiques/hero";
import { CarteHero } from "@/components/ui/carte-hero";
import { ecartRelatif, PastilleVariation } from "@/components/ui/indicateur";
import { gnf, nombre } from "@/lib/stocks/libelles";
import { CarteObjectifs } from "@/components/direction/objectifs";
import { formaterPoids, kg } from "@/lib/metier/unites";
import { chargerObjectif } from "@/lib/objectifs/charger";
import { RaccourcisAppli } from "@/components/coque/entree-appli";
import { CarteDynamique } from "@/components/carte/carte-dynamique";
import { lireParam } from "@/components/donnees/filtres";
import { SelecteurPeriode } from "@/components/donnees/selecteur-periode";
import { BlocsIndicateurs, ListeAlertes } from "@/components/direction/sections";
import { GraphiqueRendement } from "@/components/graphiques/production";
import { Carte, TitrePage } from "@/components/ui";
import { BoutonImprimer } from "@/components/ui/bouton-imprimer";
import { chargerSynthese } from "@/lib/direction/synthese";
import { aujourdhui, formaterDate } from "@/lib/formulaires/dates";
import { lireFiltresAnalyse } from "@/lib/formulaires/filtres-analyse";
import { joursDeLaPeriode, resoudrePeriode, serieRegroupee } from "@/lib/formulaires/periode";
import { chargerOptionsFiltres, decrireFiltres } from "@/lib/filtres/options";
import { clientServeur } from "@/lib/supabase/serveur";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function TableauDeBordDirection({ searchParams }: PageProps<"/direction">) {
  const sp = await searchParams;
  const periode = resoudrePeriode(lireParam(sp, "periode") ?? "mois", aujourdhui(), lireParam(sp, "du"), lireParam(sp, "au"), lireParam(sp, "mois"));
  const filtres = lireFiltresAnalyse(sp);
  const supabase = await clientServeur();
  let requetePva = supabase.from("pva_carte").select("id, nom, latitude, longitude, derniere_rupture, type_libelle, commercial_nom").eq("actif", true);
  if (filtres.commercial) requetePva = requetePva.eq("commercial_id", filtres.commercial);
  const [s, { data: pva }, options, objectif] = await Promise.all([chargerSynthese(periode, filtres), requetePva, chargerOptionsFiltres(), chargerObjectif(periode.du, periode.au)]);
  const filtresTexte = decrireFiltres(filtres, options);
  const jours = joursDeLaPeriode(periode);

  return (
    <>
      <TitrePage
        titre="Tableau de bord"
        sousTitre={`Du ${formaterDate(periode.du)} au ${formaterDate(periode.au)}${filtresTexte ? ` · ${filtresTexte}` : ""} · comparaison avec la période précédente`}
        action={<BoutonImprimer />}
      />
      <ListeAlertes alertes={s.alertes} />
      <SelecteurPeriode periode={periode} params={sp} filtres={filtres} gammes={options.produits} commerciaux={options.commerciaux} />
      <div className="mb-5 grid gap-4 xl:grid-cols-3">
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
      <CarteObjectifs
        objectif={objectif}
        filtre={!!(filtres.produit || filtres.commercial)}
        lienReglage="/direction/listes/objectifs"
        lignes={
          objectif
            ? [
                { libelle: "Chiffre d'affaires HT", reel: s.ventes.caHtGnf, objectif: objectif.caHtGnf, format: gnf },
                { libelle: "Paquets produits", reel: s.production.paquetsBons, objectif: objectif.paquets, format: (v) => `${nombre(v)} paquets` },
                { libelle: "Papier transformé", reel: s.production.tonnesConsommees * 1000, objectif: objectif.productionKg, format: (v) => formaterPoids(kg(v)) },
              ]
            : []
        }
      />
      <BlocsIndicateurs s={s} jours={jours} />
      <RaccourcisAppli espace="direction" />
      <div className="mb-5 grid gap-4">
        <Carte titre="Rendement réel / théorique par jour" className="break-inside-avoid">
          <GraphiqueRendement
            donnees={jours.map((d) => {
              const r = s.rendementParJour.get(d);
              return { date: d, ratio: r === undefined || r === null ? null : Math.round(r * 1000) / 10 };
            })}
            seuilPct={s.seuils.rendementMin * 100}
          />
        </Carte>
      </div>
      <Carte titre="Couverture des points de vente" className="break-inside-avoid">
        <CarteDynamique
          hauteur={380}
          points={(pva ?? [])
            .filter((p) => p.latitude !== null)
            .map((p) => ({
              id: p.id!,
              latitude: p.latitude!,
              longitude: p.longitude!,
              libelle: p.nom!,
              detail: `${p.type_libelle} · ${p.commercial_nom}${p.derniere_rupture ? " · RUPTURE" : ""}`,
              couleur: p.derniere_rupture ? "#e34948" : "#2a78d6",
              creux: !!p.derniere_rupture,
            }))}
        />
        <p className="mt-2 text-sm text-gray-600">Bleu : point de vente approvisionné · Rouge creux : rupture constatée à la dernière visite.</p>
      </Carte>
    </>
  );
}
