import type { Metadata } from "next";
import { ActionsAppli } from "@/components/coque/entree-appli";
import { CarteObjectifs } from "@/components/objectifs/carte-objectifs";
import { SelecteurPeriode } from "@/components/donnees/selecteur-periode";
import { GraphiqueArrets, GraphiqueProduction, GraphiqueRendement } from "@/components/graphiques/production";
import { Carte, TitrePage } from "@/components/ui";
import { GraphiqueAnneau } from "@/components/graphiques/hero";
import { CarteHero } from "@/components/ui/carte-hero";
import { ecartPoints, ecartRelatif, Indicateur, jourCourt, PastilleVariation } from "@/components/ui/indicateur";
import { aujourdhui } from "@/lib/formulaires/dates";
import { lireFiltresAnalyse, lirePeriode } from "@/lib/formulaires/filtres-analyse";
import { joursDeLaPeriode, serieRegroupee } from "@/lib/formulaires/periode";
import { chargerOptionsFiltres, decrireFiltres } from "@/lib/filtres/options";
import { formaterPoids, kg, paquetsVersColis, type Paquets } from "@/lib/metier/unites";
import { minutes, pct } from "@/lib/production/affichage";
import { agreger, chargerFiches, regrouper, seuilsProduction } from "@/lib/production/indicateurs";
import { chargerCoutsUsine } from "@/lib/performance/charger";
import { gnf, nombre } from "@/lib/stocks/libelles";

export const metadata: Metadata = { title: "Production" };

export default async function TableauDeBordProduction({ searchParams }: PageProps<"/production">) {
  const sp = await searchParams;
  const periode = lirePeriode(sp, aujourdhui());
  const filtres = lireFiltresAnalyse(sp);
  const [fiches, precedentes, seuils, options, couts, coutsPrec] = await Promise.all([
    chargerFiches({ du: periode.du, au: periode.au, produit: filtres.produit }),
    chargerFiches({ du: periode.precedente.du, au: periode.precedente.au, produit: filtres.produit }),
    seuilsProduction(),
    chargerOptionsFiltres(),
    // Coûts de toute l'usine (énergie, charges, matière) : ils ne se découpent pas par gamme.
    chargerCoutsUsine(periode.du, periode.au),
    chargerCoutsUsine(periode.precedente.du, periode.precedente.au),
  ]);
  const gamme = decrireFiltres({ ...filtres, commercial: null }, options);
  const ind = agreger(fiches);
  const indPrec = agreger(precedentes);

  // Production par produit (paquets et colis du conditionnement produit)
  const parProduit = new Map<string, { paquets: number; colis: number; reste: number }>();
  for (const f of fiches)
    for (const l of f.lignes) {
      const c = paquetsVersColis(l.paquets as Paquets, { paquetsParColis: l.paquetsParColis });
      const e = parProduit.get(l.produitLibelle) ?? { paquets: 0, colis: 0, reste: 0 };
      parProduit.set(l.produitLibelle, { paquets: e.paquets + l.paquets, colis: e.colis + c.colis, reste: e.reste + c.restePaquets });
    }
  const produits = [...parProduit.keys()].sort();

  const jours = joursDeLaPeriode(periode);
  const parJour = new Map(regrouper(fiches, (f) => f.date).map((g) => [g.cle, g]));
  const donneesRendement = jours.map((d) => ({ date: d, ratio: parJour.get(d)?.indicateurs.ratioRendement != null ? Math.round(parJour.get(d)!.indicateurs.ratioRendement! * 1000) / 10 : null }));
  const donneesProduction = jours.map((d) => {
    const ligne: Record<string, number | string> = { date: d };
    for (const p of produits) ligne[p] = (parJour.get(d)?.fiches ?? []).flatMap((f) => f.lignes).filter((l) => l.produitLibelle === p).reduce((s, l) => s + l.paquets, 0);
    return ligne;
  });
  const arretsParCause = new Map<string, number>();
  for (const f of fiches) for (const a of f.arrets) if (!a.planifie) arretsParCause.set(a.cause, (arretsParCause.get(a.cause) ?? 0) + a.minutes);
  const donneesArrets = [...arretsParCause.entries()].map(([cause, m]) => ({ cause, minutes: m })).sort((a, b) => b.minutes - a.minutes);

  return (
    <>
      <TitrePage titre="Production" sousTitre={gamme ? `Filtré : ${gamme} (fiches mixtes au prorata du papier)` : "Ce que l'usine a produit et comment"} action={<ActionsAppli espace="production" />} />
      <SelecteurPeriode periode={periode} params={sp} filtres={{ ...filtres, commercial: null }} gammes={options.produits} />

      <div className="mb-4 grid gap-4 xl:grid-cols-3">
        <CarteHero
          className="xl:col-span-2"
          titre="Production"
          valeur={`${nombre(ind.paquetsBons)} paquets`}
          sousTitre={
            <span className="flex flex-wrap items-center gap-2">
              {fiches.length} fiche(s) validée(s) <PastilleVariation v={{ ecart: ecartRelatif(ind.paquetsBons, indPrec.paquetsBons) }} />
            </span>
          }
          points={serieRegroupee(periode, (d) => parJour.get(d)?.indicateurs.paquetsBons ?? null)}
          format="nombre"
          lien="/production/fiches"
          stats={[
            { libelle: "Papier consommé", valeur: formaterPoids(kg(ind.tonnesConsommees * 1000)) },
            { libelle: "Rendement / théorique", valeur: pct(ind.ratioRendement), detail: `Seuil ${pct(seuils.ratioRendementMin, 0)}` },
            { libelle: "TRS", valeur: pct(ind.trs), detail: `Pertes ${pct(ind.tauxPerte)}` },
          ]}
        />
        <Carte titre="Production par produit">
          <GraphiqueAnneau donnees={produits.map((p) => ({ libelle: p, valeur: parProduit.get(p)!.paquets }))} format="nombre" libelleTotal="Paquets" />
        </Carte>
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Indicateur
          libelle="Rendement réel / théorique"
          valeur={pct(ind.ratioRendement)}
          variation={{ ecart: ecartPoints(ind.ratioRendement, indPrec.ratioRendement), unite: "points" }}
          tendance={jours.map((d) => ({ libelle: jourCourt(d), valeur: parJour.get(d)?.indicateurs.ratioRendement ?? null }))}
          formatTendance="pct"
          detail={`Seuil d'alerte : ${pct(seuils.ratioRendementMin, 0)}`}
          ton={ind.ratioRendement !== null && ind.ratioRendement < seuils.ratioRendementMin ? "danger" : "normal"}
          lien="/production/fiches"
        />
        <Indicateur
          libelle="Taux de perte"
          valeur={pct(ind.tauxPerte)}
          variation={{ ecart: ecartPoints(ind.tauxPerte, indPrec.tauxPerte), unite: "points", hausseBonne: false }}
          tendance={jours.map((d) => ({ libelle: jourCourt(d), valeur: parJour.get(d)?.indicateurs.tauxPerte ?? null }))}
          formatTendance="pct"
          detail={`Seuil d'alerte : ${pct(seuils.tauxPerteMax, 0)}`}
          ton={ind.tauxPerte !== null && ind.tauxPerte > seuils.tauxPerteMax ? "danger" : "normal"}
          lien="/production/fiches"
        />
        <Indicateur
          libelle="Arrêts non planifiés"
          valeur={minutes(ind.minutesArretNonPlanifie)}
          variation={{ ecart: ecartRelatif(ind.minutesArretNonPlanifie, indPrec.minutesArretNonPlanifie), hausseBonne: false }}
          detail={`Disponibilité : ${pct(ind.disponibilite)}`}
          lien="/production/pannes"
        />
        <Indicateur
          libelle="Coût de l'énergie par tonne"
          valeur={couts.energieParTonne === null ? "—" : gnf(couts.energieParTonne)}
          variation={{ ecart: ecartRelatif(couts.energieParTonne, coutsPrec.energieParTonne), hausseBonne: false }}
          detail={
            couts.energieParTonne === null
              ? "Pas de papier consommé sur des fiches validées"
              : `Énergie : ${gnf(couts.energieGnf)} pour ${formaterPoids(kg(couts.papierKg))}${filtres.produit ? " · toutes gammes" : ""}`
          }
        />
        <Indicateur
          libelle="Coût complet par paquet"
          valeur={couts.parPaquet === null ? "—" : gnf(couts.parPaquet.totalGnf)}
          variation={{ ecart: ecartRelatif(couts.parPaquet?.totalGnf ?? null, coutsPrec.parPaquet?.totalGnf ?? null), hausseBonne: false }}
          detail={
            couts.parPaquet === null
              ? "Pas de paquet produit sur des fiches validées"
              : `Matière ${gnf(couts.parPaquet.matiereGnf)} + charges ${gnf(couts.parPaquet.chargesGnf)}${filtres.produit ? " · toutes gammes" : ""}`
          }
        />
      </div>
      <CarteObjectifs
        espace="production"
        du={periode.du}
        au={periode.au}
        filtre={!!filtres.produit}
        reels={{
          paquets_produits: ind.paquetsBons,
          papier_kg: ind.tonnesConsommees * 1000,
          rendement: ind.ratioRendement,
          taux_perte: ind.tauxPerte,
          trs: ind.trs,
          cout_energie_tonne: couts.energieParTonne,
          cout_complet_paquet: couts.parPaquet?.totalGnf ?? null,
        }}
      />

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Carte titre="Rendement réel / théorique par jour">
          <GraphiqueRendement donnees={donneesRendement} seuilPct={seuils.ratioRendementMin * 100} />
        </Carte>
        <Carte titre="Paquets produits par jour">
          <GraphiqueProduction donnees={donneesProduction} produits={produits} />
        </Carte>
      </div>

      <div className="mb-4 grid gap-4">
        <Carte titre="Temps d'arrêt non planifié par cause">
          {donneesArrets.length ? <GraphiqueArrets donnees={donneesArrets} /> : <p className="text-gray-700">Aucun arrêt non planifié.</p>}
        </Carte>
      </div>

    </>
  );
}
