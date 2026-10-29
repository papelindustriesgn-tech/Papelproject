import type { Metadata } from "next";
import { ActionsAppli } from "@/components/coque/entree-appli";
import { CarteObjectifs } from "@/components/objectifs/carte-objectifs";
import { SelecteurPeriode } from "@/components/donnees/selecteur-periode";
import { Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { GraphiqueAnneau } from "@/components/graphiques/hero";
import { CarteHero } from "@/components/ui/carte-hero";
import { ecartRelatif, Indicateur, PastilleVariation } from "@/components/ui/indicateur";
import { aujourdhui } from "@/lib/formulaires/dates";
import { lireFiltresAnalyse, lirePeriode } from "@/lib/formulaires/filtres-analyse";
import { serieRegroupee } from "@/lib/formulaires/periode";
import { chargerOptionsFiltres, decrireFiltres } from "@/lib/filtres/options";
import { gnf, nombre } from "@/lib/stocks/libelles";
import { chargerIndicateursVentes } from "@/lib/ventes/indicateurs";

export const metadata: Metadata = { title: "Ventes" };

export default async function TableauDeBordVentes({ searchParams }: PageProps<"/ventes">) {
  const sp = await searchParams;
  const periode = lirePeriode(sp, aujourdhui());
  const filtres = lireFiltresAnalyse(sp);
  const [v, prec, options] = await Promise.all([
    chargerIndicateursVentes(periode.du, periode.au, periode.nbJours, filtres),
    chargerIndicateursVentes(periode.precedente.du, periode.precedente.au, periode.nbJours, filtres),
    chargerOptionsFiltres(),
  ]);
  const filtresTexte = decrireFiltres(filtres, options);
  // Créances, échu et nouveaux clients ne se découpent pas par gamme (ils sont par client).
  const toutesGammes = filtres.produit ? " · toutes gammes" : "";
  const donnees = serieRegroupee(periode, (d) => v.caParJour.get(d) ?? 0);

  return (
    <>
      <TitrePage titre="Ventes" sousTitre={filtresTexte ? `Filtré : ${filtresTexte}` : "Facturation, encaissements et clients"} action={<ActionsAppli espace="ventes" />} />
      <SelecteurPeriode periode={periode} params={sp} filtres={filtres} gammes={options.produits} commerciaux={options.commerciaux} />
      <div className="mb-4 grid gap-4 xl:grid-cols-3">
        <CarteHero
          className="xl:col-span-2"
          titre="Ventes (hors taxes)"
          valeur={gnf(v.caHtGnf)}
          sousTitre={
            <span className="flex flex-wrap items-center gap-2">
              {v.nbFactures} facture(s) <PastilleVariation v={{ ecart: ecartRelatif(v.caHtGnf, prec.caHtGnf) }} />
            </span>
          }
          points={donnees}
          format="gnf"
          lien="/ventes/pieces?type=facture"
          stats={[
            { libelle: "Encaissé", valeur: gnf(v.encaisseGnf) },
            { libelle: "Volumes", valeur: `${nombre(v.paquets)} paquets`, detail: v.parProduit.map((p) => `${p.libelle} : ${nombre(p.colis)} colis`).join(" · ") },
            { libelle: "Échu à relancer", valeur: gnf(v.echuGnf), detail: toutesGammes ? "Toutes gammes" : undefined },
          ]}
        />
        <Carte titre="Ventes par produit">
          <GraphiqueAnneau donnees={v.parProduit.map((p) => ({ libelle: p.libelle, valeur: p.caHtGnf }))} format="gnf" libelleTotal="Ventes HT" />
        </Carte>
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicateur libelle="Commandes" valeur={nombre(v.nbCommandes)} variation={{ ecart: ecartRelatif(v.nbCommandes, prec.nbCommandes) }} lien="/ventes/pieces?type=commande" />
        <Indicateur libelle="Clients actifs" valeur={nombre(v.clientsActifs)} variation={{ ecart: ecartRelatif(v.clientsActifs, prec.clientsActifs) }} detail={`${v.nouveauxClients} nouveau(x) client(s)${toutesGammes}`} lien="/ventes/clients" />
        <Indicateur libelle="Ce que les clients nous doivent" valeur={gnf(v.creancesGnf)} detail={`Dont échu : ${gnf(v.echuGnf)}${toutesGammes}`} ton={v.echuGnf > 0 ? "alerte" : "normal"} lien="/ventes/impayes" />
        <Indicateur libelle="Délai moyen de paiement des clients" valeur={v.dso === null ? "—" : `${nombre(v.dso, 0)} jours`} variation={{ ecart: ecartRelatif(v.dso, prec.dso), hausseBonne: false }} detail={filtres.produit ? "Non calculé par gamme (créances par client)" : undefined} lien="/ventes/impayes" />
      </div>
      <CarteObjectifs
        espace="ventes"
        du={periode.du}
        au={periode.au}
        filtre={!!(filtres.produit || filtres.commercial)}
        reels={{ ca_ttc: v.caTtcGnf, paquets_vendus: v.paquets, commandes: v.nbCommandes, nouveaux_clients: v.nouveauxClients, encaissements: v.encaisseGnf, dso: v.dso }}
      />
      <div className="grid gap-4">
        <Carte titre="Meilleurs clients de la période">
          <Tableau entetes={["Client", "Ventes HT", "Part"]}>
            {v.topClients.map((c) => (
              <tr key={c.nom}>
                <Cellule>{c.nom}</Cellule>
                <Cellule>{gnf(c.caHtGnf)}</Cellule>
                <Cellule>{v.caHtGnf ? `${nombre((c.caHtGnf / v.caHtGnf) * 100, 1)} %` : "—"}</Cellule>
              </tr>
            ))}
          </Tableau>
        </Carte>
      </div>
    </>
  );
}
