import type { Metadata } from "next";
import { lireParam } from "@/components/donnees/filtres";
import { SelecteurPeriode } from "@/components/donnees/selecteur-periode";
import { GraphiqueBarresJour } from "@/components/graphiques/production";
import { Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { Indicateur } from "@/components/ui/indicateur";
import { aujourdhui, formaterDate } from "@/lib/formulaires/dates";
import { joursDeLaPeriode, resoudrePeriode } from "@/lib/formulaires/periode";
import { gnf, nombre } from "@/lib/stocks/libelles";
import { chargerIndicateursVentes } from "@/lib/ventes/indicateurs";

export const metadata: Metadata = { title: "Ventes" };

function variation(actuel: number | null, precedent: number | null): string | undefined {
  if (actuel === null || precedent === null || precedent === 0) return undefined;
  const d = ((actuel - precedent) / Math.abs(precedent)) * 100;
  return `${d >= 0 ? "+" : "−"}${nombre(Math.abs(d), 1)} % vs période précédente`;
}

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
      <TitrePage titre="Ventes" sousTitre={`Du ${formaterDate(periode.du)} au ${formaterDate(periode.au)}`} />
      <SelecteurPeriode periode={periode} />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicateur libelle="Chiffre d'affaires HT" valeur={gnf(v.caHtGnf)} detail={variation(v.caHtGnf, prec.caHtGnf) ?? `${v.nbFactures} facture(s)`} />
        <Indicateur libelle="Volumes vendus" valeur={`${nombre(v.paquets)} paquets`} detail={v.parProduit.map((p) => `${p.libelle} : ${nombre(p.colis)} colis`).join(" · ") || "—"} />
        <Indicateur libelle="Prix moyen HT" valeur={v.prixMoyenPaquetGnf === null ? "—" : `${gnf(v.prixMoyenPaquetGnf)} / paquet`} />
        <Indicateur libelle="Commandes" valeur={nombre(v.nbCommandes)} detail={variation(v.nbCommandes, prec.nbCommandes)} />
        <Indicateur libelle="Clients actifs" valeur={nombre(v.clientsActifs)} detail={`${v.nouveauxClients} nouveau(x) client(s)`} />
        <Indicateur libelle="Encaissements" valeur={gnf(v.encaisseGnf)} detail={variation(v.encaisseGnf, prec.encaisseGnf)} />
        <Indicateur libelle="Créances clients" valeur={gnf(v.creancesGnf)} detail={`Dont échu : ${gnf(v.echuGnf)}`} ton={v.echuGnf > 0 ? "alerte" : "normal"} />
        <Indicateur libelle="DSO (délai moyen de paiement)" valeur={v.dso === null ? "—" : `${nombre(v.dso, 0)} jours`} detail="Créances ÷ CA TTC × jours de la période" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Carte titre="Chiffre d'affaires HT par jour">
          <GraphiqueBarresJour donnees={donnees} unite="GNF" />
        </Carte>
        <Carte titre="Ventes par produit">
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
        <Carte titre="Meilleurs clients de la période" className="lg:col-span-2">
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
