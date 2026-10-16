import type { Metadata } from "next";
import { RaccourcisAppli, UrgencesAppli } from "@/components/coque/entree-appli";
import Link from "next/link";
import { lireParam } from "@/components/donnees/filtres";
import { SelecteurPeriode } from "@/components/donnees/selecteur-periode";
import { GraphiqueArrets, GraphiqueProduction, GraphiqueRendement } from "@/components/graphiques/production";
import { Badge, Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { GraphiqueAnneau } from "@/components/graphiques/hero";
import { CarteHero } from "@/components/ui/carte-hero";
import { ecartPoints, ecartRelatif, Indicateur, jourCourt, PastilleVariation } from "@/components/ui/indicateur";
import { aujourdhui, formaterDate } from "@/lib/formulaires/dates";
import { lireFiltresAnalyse } from "@/lib/formulaires/filtres-analyse";
import { joursDeLaPeriode, resoudrePeriode, serieRegroupee } from "@/lib/formulaires/periode";
import { chargerOptionsFiltres, decrireFiltres } from "@/lib/filtres/options";
import { formaterPoids, kg, paquetsVersColis, type Paquets } from "@/lib/metier/unites";
import { libelleAlerte, minutes, pct } from "@/lib/production/affichage";
import { agreger, chargerFiches, regrouper, rendementReelParProduit, seuilsProduction } from "@/lib/production/indicateurs";
import { nombre } from "@/lib/stocks/libelles";
import { CarteObjectifs } from "@/components/direction/objectifs";
import { chargerObjectif } from "@/lib/objectifs/charger";

export const metadata: Metadata = { title: "Production" };

export default async function TableauDeBordProduction({ searchParams }: PageProps<"/production">) {
  const sp = await searchParams;
  const periode = resoudrePeriode(lireParam(sp, "periode"), aujourdhui(), lireParam(sp, "du"), lireParam(sp, "au"), lireParam(sp, "mois"));
  const filtres = lireFiltresAnalyse(sp);
  const [fiches, precedentes, seuils, options] = await Promise.all([
    chargerFiches({ du: periode.du, au: periode.au, produit: filtres.produit }),
    chargerFiches({ du: periode.precedente.du, au: periode.precedente.au, produit: filtres.produit }),
    seuilsProduction(),
    chargerOptionsFiltres(),
  ]);
  const objectif = await chargerObjectif(periode.du, periode.au);
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

  const parPoste = regrouper(fiches, (f) => `${String(f.posteOrdre).padStart(2, "0")}|${f.poste}`).sort((a, b) => a.cle.localeCompare(b.cle));
  const parEquipe = regrouper(fiches, (f) => f.equipe ?? "Non précisée").sort((a, b) => a.cle.localeCompare(b.cle));
  const rendementsProduits = rendementReelParProduit(fiches);
  const fichesEnAlerte = fiches.filter((f) => f.alertes.length).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 15);

  const tableauGroupes = (groupes: typeof parPoste, libelle: (cle: string) => string) => (
    <Tableau entetes={["", "Fiches", "Papier", "Paquets", "Rendement", "Perte", "Arrêts", "TRS"]}>
      {groupes.map((g) => (
        <tr key={g.cle}>
          <Cellule className="font-semibold">{libelle(g.cle)}</Cellule>
          <Cellule>{g.fiches.length}</Cellule>
          <Cellule>{formaterPoids(kg(g.indicateurs.tonnesConsommees * 1000))}</Cellule>
          <Cellule>{nombre(g.indicateurs.paquetsBons)}</Cellule>
          <Cellule>{pct(g.indicateurs.ratioRendement)}</Cellule>
          <Cellule>{pct(g.indicateurs.tauxPerte)}</Cellule>
          <Cellule>{minutes(g.indicateurs.minutesArretNonPlanifie)}</Cellule>
          <Cellule>{pct(g.indicateurs.trs)}</Cellule>
        </tr>
      ))}
    </Tableau>
  );

  return (
    <>
      <TitrePage titre="Production" sousTitre={`Du ${formaterDate(periode.du)} au ${formaterDate(periode.au)} · ${fiches.length} fiche(s) validée(s)${gamme ? ` · ${gamme} (fiches mixtes au prorata du papier)` : ""}`} />
      <UrgencesAppli espace="production" />
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
      <CarteObjectifs
        objectif={objectif}
        filtre={!!filtres.produit}
        lignes={
          objectif
            ? [
                { libelle: "Paquets produits", reel: ind.paquetsBons, objectif: objectif.paquets, format: (v) => `${nombre(v)} paquets` },
                { libelle: "Papier transformé", reel: ind.tonnesConsommees * 1000, objectif: objectif.productionKg, format: (v) => formaterPoids(kg(v)) },
              ]
            : []
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Indicateur
          libelle="Papier consommé"
          valeur={formaterPoids(kg(ind.tonnesConsommees * 1000))}
          variation={{ ecart: ecartRelatif(ind.tonnesConsommees, indPrec.tonnesConsommees) }}
          tendance={jours.map((d) => ({ libelle: jourCourt(d), valeur: parJour.has(d) ? parJour.get(d)!.indicateurs.tonnesConsommees * 1000 : null }))}
          formatTendance="kg"
          lien="/production/fiches"
        />
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
          libelle="TRS (OEE)"
          valeur={pct(ind.trs)}
          variation={{ ecart: ecartPoints(ind.trs, indPrec.trs), unite: "points" }}
          detail={ind.trs === null ? "Renseignez les cadences nominales" : `Perf. ${pct(ind.performance, 0)} · Qualité ${pct(ind.qualite, 0)}`}
        />
      </div>
      <RaccourcisAppli espace="production" />

      <Carte titre="Rendement réel par produit" className="mb-4">
        <Tableau entetes={["Produit", "Rendement réel", "Théorique", "Réel / théorique"]}>
          {rendementsProduits.map((r) => (
            <tr key={r.produitId}>
              <Cellule className="font-semibold">{r.libelle}</Cellule>
              <Cellule>{r.rendementReel === null ? "—" : `${nombre(r.rendementReel)} paquets/t`}</Cellule>
              <Cellule>{nombre(r.theorique)} paquets/t</Cellule>
              <Cellule className={r.rendementReel !== null && r.rendementReel / r.theorique < seuils.ratioRendementMin ? "font-bold text-red-700" : ""}>
                {r.rendementReel === null ? "—" : pct(r.rendementReel / r.theorique)}
              </Cellule>
            </tr>
          ))}
        </Tableau>
        <p className="mt-2 text-sm text-gray-600">Calculé sur les fiches qui n&apos;ont fabriqué que ce produit.</p>
      </Carte>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Carte titre="Rendement réel / théorique par jour">
          <GraphiqueRendement donnees={donneesRendement} seuilPct={seuils.ratioRendementMin * 100} />
        </Carte>
        <Carte titre="Paquets produits par jour">
          <GraphiqueProduction donnees={donneesProduction} produits={produits} />
        </Carte>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Carte titre="Temps d'arrêt non planifié par cause">
          {donneesArrets.length ? <GraphiqueArrets donnees={donneesArrets} /> : <p className="text-gray-700">Aucun arrêt non planifié.</p>}
        </Carte>
        <Carte titre={`Fiches en alerte (${fiches.filter((f) => f.alertes.length).length})`}>
          {fichesEnAlerte.length ? (
            <ul className="divide-y divide-gray-100">
              {fichesEnAlerte.map((f) => (
                <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <Link href={`/production/fiches/${f.id}`} className="font-medium text-papel-700 hover:underline">
                    {formaterDate(f.date)} – {f.poste}
                  </Link>
                  <span className="flex flex-wrap gap-1">
                    {f.alertes.map((a, i) => (
                      <Badge key={i} ton="erreur">
                        {libelleAlerte(a)}
                      </Badge>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-700">Aucune alerte sur la période.</p>
          )}
        </Carte>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Carte titre="Par poste">{tableauGroupes(parPoste, (c) => c.split("|")[1])}</Carte>
        <Carte titre="Par équipe">{tableauGroupes(parEquipe, (c) => c)}</Carte>
      </div>
    </>
  );
}
