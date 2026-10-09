import type { Metadata } from "next";
import Link from "next/link";
import { lireParam } from "@/components/donnees/filtres";
import { SelecteurPeriode } from "@/components/donnees/selecteur-periode";
import { Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { Indicateur } from "@/components/ui/indicateur";
import { aujourdhui, formaterDate } from "@/lib/formulaires/dates";
import { resoudrePeriode } from "@/lib/formulaires/periode";
import { chargerPrevisionnel, chargerResultat, chargerSituation } from "@/lib/finance/indicateurs";
import { bfrGnf, pointMortJours, premiereTensionTresorerie, seuilRentabiliteGnf } from "@/lib/metier/finance";
import { formaterMontant } from "@/lib/metier/devises";
import { pct } from "@/lib/production/affichage";
import { gnf } from "@/lib/stocks/libelles";

export const metadata: Metadata = { title: "Finance" };

export default async function TableauDeBordFinance({ searchParams }: PageProps<"/finance">) {
  const sp = await searchParams;
  const periode = resoudrePeriode(lireParam(sp, "periode") ?? "mois", aujourdhui(), lireParam(sp, "du"), lireParam(sp, "au"));
  const [s, r, prev] = await Promise.all([chargerSituation(), chargerResultat(periode.du, periode.au, periode.nbJours), chargerPrevisionnel(13)]);
  const seuil = seuilRentabiliteGnf(r.chargesFixesGnf, r.tauxMcv);
  const pm = pointMortJours(seuil, r.caHtGnf, periode.nbJours);
  const tension = premiereTensionTresorerie(prev.semaines);
  const fin13 = prev.semaines.at(-1)?.soldeFinGnf ?? s.tresorerieGnf;

  return (
    <>
      <TitrePage titre="Finance" sousTitre="Trésorerie, créances, dettes et résultat de gestion" />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicateur libelle="Trésorerie disponible" valeur={gnf(s.tresorerieGnf)} detail="Tous comptes (USD au taux du jour)" ton={s.tresorerieGnf < 0 ? "danger" : "normal"} />
        <Indicateur libelle="Créances clients" valeur={gnf(s.creancesGnf)} detail={`dont échu : ${gnf(s.creancesEchuesGnf)}`} ton={s.creancesEchuesGnf > 0 ? "alerte" : "normal"} />
        <Indicateur libelle="Dettes fournisseurs" valeur={gnf(s.dettesGnf)} detail={`dont échu : ${gnf(s.dettesEchuesGnf)}`} ton={s.dettesEchuesGnf > 0 ? "alerte" : "normal"} />
        <Indicateur libelle="BFR" valeur={gnf(bfrGnf(s.stocksGnf, s.creancesGnf, s.dettesGnf))} detail={`Stocks ${gnf(s.stocksGnf)} + créances − dettes`} />
        <Indicateur
          libelle="Trésorerie dans 13 semaines"
          valeur={gnf(fin13)}
          detail={tension ? `Tension la semaine du ${formaterDate(tension.debut)}` : "Pas de tension prévue"}
          ton={tension ? "danger" : "normal"}
        />
      </div>
      <SelecteurPeriode periode={periode} />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicateur libelle="Chiffre d'affaires HT" valeur={gnf(r.caHtGnf)} />
        <Indicateur libelle="Marge brute" valeur={gnf(r.margeBruteGnf)} detail={r.caHtGnf ? `${pct(r.margeBruteGnf / r.caHtGnf)} du CA` : undefined} />
        <Indicateur libelle="Résultat d'exploitation" valeur={gnf(r.resultatGnf)} detail={`${pct(r.tauxResultat)} du CA`} ton={r.resultatGnf < 0 ? "danger" : "normal"} />
        <Indicateur libelle="Seuil de rentabilité" valeur={seuil === null ? "—" : gnf(seuil)} detail={pm ? `Atteint au jour ${pm} de la période` : seuil === null ? "Marge sur coûts variables négative" : "Non atteint sur la période"} ton={pm ? "normal" : "alerte"} />
      </div>
      <Carte titre="Comptes de trésorerie" action={<Link href="/finance/tresorerie" className="font-semibold text-papel-700 underline">Journal</Link>}>
        <Tableau entetes={["Compte", "Solde", "En GNF"]}>
          {s.comptes.map((c) => (
            <tr key={c.id}>
              <Cellule>{c.libelle}</Cellule>
              <Cellule className={c.solde < 0 ? "font-semibold text-red-700" : ""}>{formaterMontant(c.solde, c.devise as "GNF" | "USD")}</Cellule>
              <Cellule>{gnf(c.soldeGnf)}</Cellule>
            </tr>
          ))}
        </Tableau>
      </Carte>
    </>
  );
}
