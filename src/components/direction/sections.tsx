import { AlertTriangle, CheckCircle2, ChevronRight, CircleAlert } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ecartPoints, ecartRelatif, Indicateur, jourCourt } from "@/components/ui/indicateur";
import type { Alerte, SyntheseDirection } from "@/lib/direction/synthese";
import { formaterPoids, formaterStockProduitFini, kg, type Paquets } from "@/lib/metier/unites";
import { bfrGnf } from "@/lib/metier/finance";
import { minutes, pct } from "@/lib/production/affichage";
import { gnf, nombre } from "@/lib/stocks/libelles";

function Section({ titre, lien, children }: { titre: string; lien?: string; children: ReactNode }) {
  return (
    <section className="mb-5 break-inside-avoid">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-papel-900">{titre}</h2>
        {lien && (
          <Link href={lien} className="flex items-center gap-0.5 text-sm font-semibold text-papel-700 hover:underline print:hidden">
            Ouvrir l&apos;application <ChevronRight size={14} aria-hidden />
          </Link>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </section>
  );
}

/** Alertes prioritaires : en tête de page, critiques d'abord, chaque ligne ouvre l'écran où agir. */
export function ListeAlertes({ alertes }: { alertes: Alerte[] }) {
  const critiques = alertes.filter((a) => a.gravite === "critique").length;
  return (
    <section aria-label="À traiter maintenant" className="mb-5 break-inside-avoid">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">À traiter maintenant</h2>
        {critiques > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
            <CircleAlert size={13} aria-hidden /> {critiques} critique(s)
          </span>
        )}
        {alertes.length - critiques > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">
            <AlertTriangle size={13} aria-hidden /> {alertes.length - critiques} importante(s)
          </span>
        )}
      </div>
      {alertes.length ? (
        <ul className="grid gap-2 md:grid-cols-2">
          {alertes.slice(0, 12).map((a, i) => (
            <li key={i}>
              <Link
                href={a.lien}
                className={`ombre-carte flex h-full items-start gap-3 rounded-2xl px-4 py-3 transition hover:-translate-y-0.5 hover:shadow-lg ${a.gravite === "critique" ? "bg-red-50 ring-1 ring-red-200" : "bg-amber-50 ring-1 ring-amber-200"}`}
              >
                <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${a.gravite === "critique" ? "bg-red-600 text-white" : "bg-amber-400 text-amber-950"}`}>
                  {a.gravite === "critique" ? <CircleAlert size={18} aria-hidden /> : <AlertTriangle size={18} aria-hidden />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-xs font-bold uppercase tracking-wide ${a.gravite === "critique" ? "text-red-700" : "text-amber-800"}`}>
                    {a.gravite === "critique" ? "Critique" : "Important"} · {a.domaine}
                  </span>
                  <span className="block font-medium leading-snug text-gray-900">{a.message}</span>
                </span>
                <ChevronRight size={18} className="mt-1 shrink-0 text-gray-400" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ombre-carte flex items-center gap-2 rounded-2xl bg-green-50 px-4 py-3 font-semibold text-green-800">
          <CheckCircle2 size={20} aria-hidden /> Aucune alerte : tout est sous contrôle.
        </p>
      )}
      {alertes.length > 12 && <p className="mt-2 text-sm text-gray-600">… et {alertes.length - 12} autre(s) alerte(s).</p>}
    </section>
  );
}

/** Les cinq blocs d'indicateurs du tableau de bord (réutilisés par le rapport hebdomadaire). */
export function BlocsIndicateurs({ s, jours = [] }: { s: SyntheseDirection; jours?: string[] }) {
  const v = s.ventes;
  const vp = s.ventesPrec;
  const p = s.production;
  const pp = s.productionPrec;
  const tendanceCa = jours.length > 1 ? jours.map((d) => ({ libelle: jourCourt(d), valeur: v.caParJour.get(d) ?? 0 })) : undefined;
  const tendanceRendement = jours.length > 1 ? jours.map((d) => ({ libelle: jourCourt(d), valeur: s.rendementParJour.get(d) ?? null })) : undefined;
  return (
    <>
      <Section titre="Commercial" lien="/ventes">
        <Indicateur libelle="Chiffre d'affaires HT" valeur={gnf(v.caHtGnf)} variation={{ ecart: ecartRelatif(v.caHtGnf, vp.caHtGnf) }} tendance={tendanceCa} formatTendance="gnf" lien="/ventes" />
        <Indicateur libelle="Commandes" valeur={nombre(v.nbCommandes)} variation={{ ecart: ecartRelatif(v.nbCommandes, vp.nbCommandes) }} lien="/ventes/pieces?type=commande" />
        <Indicateur libelle="Ventes" valeur={`${nombre(v.paquets)} paquets`} variation={{ ecart: ecartRelatif(v.paquets, vp.paquets) }} detail={v.parProduit.map((x) => `${x.libelle} : ${nombre(x.colis)} colis`).join(" · ") || "—"} lien="/ventes" />
        <Indicateur libelle="Prix moyen HT" valeur={v.prixMoyenPaquetGnf === null ? "—" : `${gnf(v.prixMoyenPaquetGnf)} / paquet`} variation={{ ecart: ecartRelatif(v.prixMoyenPaquetGnf, vp.prixMoyenPaquetGnf) }} />
        <Indicateur libelle="Clients actifs" valeur={nombre(v.clientsActifs)} variation={{ ecart: ecartRelatif(v.clientsActifs, vp.clientsActifs) }} detail={`${v.nouveauxClients} nouveau(x)`} lien="/ventes/clients" />
        <Indicateur libelle="Encaissements" valeur={gnf(v.encaisseGnf)} variation={{ ecart: ecartRelatif(v.encaisseGnf, vp.encaisseGnf) }} lien="/ventes/impayes" />
        <Indicateur libelle="Impayés (échus)" valeur={gnf(v.echuGnf)} detail={`Créances totales : ${gnf(v.creancesGnf)}`} ton={v.echuGnf > 0 ? "alerte" : "normal"} lien="/ventes/impayes" />
        <Indicateur libelle="Délai moyen de paiement (DSO)" valeur={v.dso === null ? "—" : `${nombre(v.dso, 0)} jours`} variation={{ ecart: ecartRelatif(v.dso, vp.dso), hausseBonne: false }} lien="/ventes/impayes" />
      </Section>

      <Section titre="Production" lien="/production">
        <Indicateur libelle="Papier transformé" valeur={formaterPoids(kg(p.tonnesConsommees * 1000))} variation={{ ecart: ecartRelatif(p.tonnesConsommees, pp.tonnesConsommees) }} lien="/production" />
        <Indicateur libelle="Production" valeur={`${nombre(p.paquetsBons)} paquets`} variation={{ ecart: ecartRelatif(p.paquetsBons, pp.paquetsBons) }} detail={s.colisProduits.map((c) => `${c.libelle} : ${nombre(c.colis)} colis`).join(" · ") || "—"} lien="/production" />
        <Indicateur
          libelle="Rendement réel / théorique"
          valeur={pct(p.ratioRendement)}
          variation={{ ecart: ecartPoints(p.ratioRendement, pp.ratioRendement), unite: "points" }}
          tendance={tendanceRendement}
          formatTendance="pct"
          ton={p.ratioRendement !== null && p.ratioRendement < s.seuils.rendementMin ? "danger" : "normal"}
          lien="/production"
        />
        <Indicateur libelle="Pertes" valeur={pct(p.tauxPerte)} variation={{ ecart: ecartPoints(p.tauxPerte, pp.tauxPerte), unite: "points", hausseBonne: false }} ton={(p.tauxPerte ?? 0) > s.seuils.tauxPerteMax ? "danger" : "normal"} lien="/production" />
        <Indicateur libelle="Arrêts non planifiés" valeur={minutes(p.minutesArretNonPlanifie)} variation={{ ecart: ecartRelatif(p.minutesArretNonPlanifie, pp.minutesArretNonPlanifie), hausseBonne: false }} detail={`Disponibilité : ${pct(p.disponibilite)}`} lien="/production" />
        <Indicateur libelle="TRS (utilisation)" valeur={pct(p.trs)} variation={{ ecart: ecartPoints(p.trs, pp.trs), unite: "points" }} detail={p.trs === null ? "Cadences nominales à renseigner" : undefined} lien="/production" />
      </Section>

      <Section titre="Stock" lien="/magasin">
        <Indicateur libelle="Matière première" valeur={formaterPoids(kg(s.stock.kgMp))} lien="/magasin/bobines" />
        <Indicateur libelle="Jours de couverture MP" valeur={s.stock.couvertureMpJours === null ? "—" : `${nombre(s.stock.couvertureMpJours, 1)} j`} detail={`Alerte sous ${nombre(s.seuils.couvertureJours)} j`} ton={s.stock.couvertureMpJours !== null && s.stock.couvertureMpJours < s.seuils.couvertureJours ? "alerte" : "normal"} lien="/magasin" />
        <Indicateur libelle="En transit" valeur={formaterPoids(kg(s.stock.kgTransit))} detail={`${s.stock.conteneursTransit} conteneur(s)`} lien="/achats/conteneurs" />
        <Indicateur
          libelle="Produits finis"
          valeur={`${nombre(s.stock.produitsFinis.reduce((t, x) => t + x.paquets, 0))} paquets`}
          detail={s.stock.produitsFinis.map((x) => `${x.libelle} : ${formaterStockProduitFini(x.paquets as Paquets, { paquetsParColis: x.paquetsParColis ?? 1 })}`).join(" · ") || "—"}
          lien="/magasin/articles"
        />
      </Section>

      <Section titre="Finance" lien="/finance">
        <Indicateur libelle="Marge brute" valeur={gnf(s.marge.margeGnf)} variation={{ ecart: ecartRelatif(s.marge.margeGnf, s.margePrec.margeGnf) }} lien="/finance/resultat" />
        <Indicateur libelle="Taux de marge brute" valeur={pct(s.marge.taux)} variation={{ ecart: ecartPoints(s.marge.taux, s.margePrec.taux), unite: "points" }} detail={`Coût matière des produits vendus : ${gnf(s.marge.coutVentesGnf)}`} lien="/finance/resultat" />
        <Indicateur libelle="Trésorerie" valeur={gnf(s.finance.tresorerieGnf)} ton={s.finance.tresorerieGnf < 0 ? "danger" : "normal"} lien="/finance/tresorerie" />
        <Indicateur libelle="Créances clients" valeur={gnf(v.creancesGnf)} detail={`dont échu : ${gnf(s.finance.creancesEchuesGnf)}`} ton={s.finance.creancesEchuesGnf > 0 ? "alerte" : "normal"} lien="/ventes/impayes" />
        <Indicateur libelle="Dettes fournisseurs" valeur={gnf(s.finance.dettesGnf)} detail={`dont échu : ${gnf(s.finance.dettesEchuesGnf)}`} ton={s.finance.dettesEchuesGnf > 0 ? "alerte" : "normal"} lien="/finance/fournisseurs" />
        <Indicateur libelle="BFR" valeur={gnf(bfrGnf(s.stock.valeurGnf, s.finance.creancesGnf, s.finance.dettesGnf))} detail={`Stock ${gnf(s.stock.valeurGnf)} + créances − dettes`} lien="/finance" />
      </Section>

      <Section titre="Distribution" lien="/commercial">
        <Indicateur libelle="Grossistes / semi-grossistes" valeur={`${s.distribution.grossistes} / ${s.distribution.semiGrossistes}`} lien="/commercial/portefeuilles" />
        <Indicateur libelle="Points de vente actifs" valeur={nombre(s.distribution.pvaActifs)} detail={`${s.distribution.nouveauxPva} nouveau(x) sur la période`} lien="/commercial/portefeuilles" />
        <Indicateur libelle="Taux de rupture" valeur={pct(s.distribution.tauxRupture)} variation={{ ecart: ecartPoints(s.distribution.tauxRupture, s.distributionPrec.tauxRupture), unite: "points", hausseBonne: false }} ton={(s.distribution.tauxRupture ?? 0) > s.seuils.tauxRupture ? "alerte" : "normal"} lien="/commercial/visites" />
        <Indicateur libelle="Couverture" valeur={`${s.distribution.quartiersCouverts} / ${s.distribution.quartiersTotal} quartiers`} detail={`${s.distribution.visites} visites · ${s.distribution.communesCouvertes} commune(s)`} lien="/commercial" />
      </Section>
    </>
  );
}
