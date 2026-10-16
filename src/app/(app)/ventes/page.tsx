import type { Metadata } from "next";
import { RaccourcisAppli, UrgencesAppli } from "@/components/coque/entree-appli";
import { lireParam } from "@/components/donnees/filtres";
import { SelecteurPeriode } from "@/components/donnees/selecteur-periode";
import { Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { GraphiqueAnneau } from "@/components/graphiques/hero";
import { CarteHero } from "@/components/ui/carte-hero";
import { ecartRelatif, Indicateur, PastilleVariation } from "@/components/ui/indicateur";
import { aujourdhui } from "@/lib/formulaires/dates";
import { joursDeLaPeriode, resoudrePeriode } from "@/lib/formulaires/periode";
import { gnf, nombre } from "@/lib/stocks/libelles";
import { chargerIndicateursVentes } from "@/lib/ventes/indicateurs";

export const metadata: Metadata = { title: "Ventes" };

export default async function TableauDeBordVentes({ searchParams }: PageProps<"/ventes">) {
  const sp = await searchParams;
  const periode = resoudrePeriode(lireParam(sp, "periode"), aujourdhui(), lireParam(sp, "du"), lireParam(sp, "au"));
  const [v, prec] = await Promise.all([
    chargerIndicateursVentes(periode.du, periode.au, periode.nbJours),
    chargerIndicateursVentes(periode.precedente.du, periode.precedente.au, periode.nbJours),
  ]);
  const donnees = joursDeLaPeriode(periode).map((d) => ({ date: d, valeur: v.caParJour.get(d) ?? 0 }));

  return (
    <>
      <TitrePage titre="Ventes" sousTitre="Facturation, encaissements et clients" />
      <UrgencesAppli espace="ventes" />
      <SelecteurPeriode periode={periode} />
      <div className="mb-4 grid gap-4 xl:grid-cols-3">
        <CarteHero
          className="xl:col-span-2"
          titre="Chiffre d'affaires HT"
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
            { libelle: "Échu à relancer", valeur: gnf(v.echuGnf) },
          ]}
        />
        <Carte titre="Ventes par produit">
          <GraphiqueAnneau donnees={v.parProduit.map((p) => ({ libelle: p.libelle, valeur: p.caHtGnf }))} format="gnf" libelleTotal="CA HT" />
        </Carte>
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Indicateur libelle="Prix moyen HT" valeur={v.prixMoyenPaquetGnf === null ? "—" : `${gnf(v.prixMoyenPaquetGnf)} / paquet`} variation={{ ecart: ecartRelatif(v.prixMoyenPaquetGnf, prec.prixMoyenPaquetGnf) }} />
        <Indicateur libelle="Commandes" valeur={nombre(v.nbCommandes)} variation={{ ecart: ecartRelatif(v.nbCommandes, prec.nbCommandes) }} lien="/ventes/pieces?type=commande" />
        <Indicateur libelle="Clients actifs" valeur={nombre(v.clientsActifs)} variation={{ ecart: ecartRelatif(v.clientsActifs, prec.clientsActifs) }} detail={`${v.nouveauxClients} nouveau(x) client(s)`} lien="/ventes/clients" />
        <Indicateur libelle="Encaissements" valeur={gnf(v.encaisseGnf)} variation={{ ecart: ecartRelatif(v.encaisseGnf, prec.encaisseGnf) }} lien="/ventes/impayes" />
        <Indicateur libelle="Créances clients" valeur={gnf(v.creancesGnf)} detail={`Dont échu : ${gnf(v.echuGnf)}`} ton={v.echuGnf > 0 ? "alerte" : "normal"} lien="/ventes/impayes" />
        <Indicateur libelle="Délai moyen de paiement (DSO)" valeur={v.dso === null ? "—" : `${nombre(v.dso, 0)} jours`} variation={{ ecart: ecartRelatif(v.dso, prec.dso), hausseBonne: false }} detail="Créances ÷ CA TTC × jours de la période" lien="/ventes/impayes" />
      </div>
      <RaccourcisAppli espace="ventes" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Carte titre="Détail par produit">
          <Tableau entetes={["Produit", "Paquets", "Colis", "CA HT"]}>
            {v.parProduit.map((p) => (
              <tr key={p.libelle}>
                <Cellule className="font-semibold">{p.libelle}</Cellule>
                <Cellule>{nombre(p.paquets)}</Cellule>
                <Cellule>{nombre(p.colis)}</Cellule>
                <Cellule>{gnf(p.caHtGnf)}</Cellule>
              </tr>
            ))}
          </Tableau>
        </Carte>
        <Carte titre="Meilleurs clients de la période">
          <Tableau entetes={["Client", "CA HT", "Part"]}>
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
