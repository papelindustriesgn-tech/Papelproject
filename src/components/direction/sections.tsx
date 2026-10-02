import Link from "next/link";
import type { ReactNode } from "react";
import { Badge, Carte } from "@/components/ui";
import { Indicateur } from "@/components/ui/indicateur";
import type { Alerte, SyntheseDirection } from "@/lib/direction/synthese";
import { formaterPoids, formaterStockProduitFini, kg, type Paquets } from "@/lib/metier/unites";
import { variationRelative } from "@/lib/metier/ventes";
import { minutes, pct } from "@/lib/production/affichage";
import { gnf, nombre } from "@/lib/stocks/libelles";

/** Texte de comparaison avec la période précédente (en % ou en points). */
export function comparaison(actuel: number | null, precedent: number | null, mode: "relatif" | "points" = "relatif"): string | undefined {
  if (mode === "points") {
    if (actuel === null || precedent === null) return undefined;
    const d = (actuel - precedent) * 100;
    return `${d >= 0 ? "▲ +" : "▼ −"}${nombre(Math.abs(d), 1)} pt vs période précédente`;
  }
  const v = variationRelative(actuel, precedent);
  return v === null ? undefined : `${v >= 0 ? "▲ +" : "▼ −"}${nombre(Math.abs(v) * 100, 1)} % vs période précédente`;
}

function Section({ titre, lien, children }: { titre: string; lien?: string; children: ReactNode }) {
  return (
    <section className="mb-5 break-inside-avoid">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-xl font-bold text-papel-900">{titre}</h2>
        {lien && (
          <Link href={lien} className="text-papel-700 underline print:hidden">
            Détail
          </Link>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </section>
  );
}

export function ListeAlertes({ alertes }: { alertes: Alerte[] }) {
  return (
    <Carte titre={`Alertes prioritaires du jour (${alertes.length})`} className="mb-5 break-inside-avoid">
      {alertes.length ? (
        <ul className="divide-y divide-gray-100">
          {alertes.slice(0, 15).map((a, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2 py-2">
              <Badge ton={a.gravite === "critique" ? "erreur" : "alerte"}>{a.gravite === "critique" ? "Critique" : "Important"}</Badge>
              <span className="text-sm font-semibold text-gray-700">{a.domaine}</span>
              <Link href={a.lien} className="flex-1 text-papel-900 underline">
                {a.message}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-700">Aucune alerte : tout est sous contrôle.</p>
      )}
    </Carte>
  );
}

/** Les cinq blocs d'indicateurs du tableau de bord (réutilisés par le rapport hebdomadaire). */
export function BlocsIndicateurs({ s }: { s: SyntheseDirection }) {
  const v = s.ventes;
  const vp = s.ventesPrec;
  const p = s.production;
  const pp = s.productionPrec;
  return (
    <>
      <Section titre="Commercial" lien="/ventes">
        <Indicateur libelle="Chiffre d'affaires HT" valeur={gnf(v.caHtGnf)} detail={comparaison(v.caHtGnf, vp.caHtGnf)} />
        <Indicateur libelle="Commandes" valeur={nombre(v.nbCommandes)} detail={comparaison(v.nbCommandes, vp.nbCommandes)} />
        <Indicateur libelle="Ventes" valeur={`${nombre(v.paquets)} paquets`} detail={v.parProduit.map((x) => `${x.libelle} : ${nombre(x.colis)} colis`).join(" · ") || "—"} />
        <Indicateur libelle="Prix moyen HT" valeur={v.prixMoyenPaquetGnf === null ? "—" : `${gnf(v.prixMoyenPaquetGnf)} / paquet`} detail={comparaison(v.prixMoyenPaquetGnf, vp.prixMoyenPaquetGnf)} />
        <Indicateur libelle="Clients actifs" valeur={nombre(v.clientsActifs)} detail={`${v.nouveauxClients} nouveau(x) · ${comparaison(v.clientsActifs, vp.clientsActifs) ?? ""}`} />
        <Indicateur libelle="Encaissements" valeur={gnf(v.encaisseGnf)} detail={comparaison(v.encaisseGnf, vp.encaisseGnf)} />
        <Indicateur libelle="Impayés (échus)" valeur={gnf(v.echuGnf)} detail={`Créances totales : ${gnf(v.creancesGnf)}`} ton={v.echuGnf > 0 ? "alerte" : "normal"} />
        <Indicateur libelle="DSO" valeur={v.dso === null ? "—" : `${nombre(v.dso, 0)} jours`} detail="Délai moyen de paiement des clients" />
      </Section>

      <Section titre="Production" lien="/production">
        <Indicateur libelle="Papier transformé" valeur={formaterPoids(kg(p.tonnesConsommees * 1000))} detail={comparaison(p.tonnesConsommees, pp.tonnesConsommees)} />
        <Indicateur libelle="Production" valeur={`${nombre(p.paquetsBons)} paquets`} detail={s.colisProduits.map((c) => `${c.libelle} : ${nombre(c.colis)} colis`).join(" · ") || "—"} />
        <Indicateur libelle="Rendement réel / théorique" valeur={pct(p.ratioRendement)} detail={comparaison(p.ratioRendement, pp.ratioRendement, "points")} ton={p.ratioRendement !== null && p.ratioRendement < 0.95 ? "danger" : "normal"} />
        <Indicateur libelle="Pertes" valeur={pct(p.tauxPerte)} detail={comparaison(p.tauxPerte, pp.tauxPerte, "points")} ton={(p.tauxPerte ?? 0) > 0.05 ? "danger" : "normal"} />
        <Indicateur libelle="Arrêts non planifiés" valeur={minutes(p.minutesArretNonPlanifie)} detail={`Disponibilité : ${pct(p.disponibilite)}`} />
        <Indicateur libelle="TRS (utilisation)" valeur={pct(p.trs)} detail={p.trs === null ? "Cadences nominales à renseigner" : comparaison(p.trs, pp.trs, "points")} />
      </Section>

      <Section titre="Stock" lien="/magasin">
        <Indicateur libelle="Matière première" valeur={formaterPoids(kg(s.stock.kgMp))} />
        <Indicateur libelle="Jours de couverture MP" valeur={s.stock.couvertureMpJours === null ? "—" : `${nombre(s.stock.couvertureMpJours, 1)} j`} ton={s.stock.couvertureMpJours !== null && s.stock.couvertureMpJours < 15 ? "alerte" : "normal"} />
        <Indicateur libelle="En transit" valeur={formaterPoids(kg(s.stock.kgTransit))} detail={`${s.stock.conteneursTransit} conteneur(s)`} />
        <Indicateur
          libelle="Produits finis"
          valeur={`${nombre(s.stock.produitsFinis.reduce((t, x) => t + x.paquets, 0))} paquets`}
          detail={s.stock.produitsFinis.map((x) => `${x.libelle} : ${formaterStockProduitFini(x.paquets as Paquets, { paquetsParColis: x.paquetsParColis ?? 1 })}`).join(" · ") || "—"}
        />
      </Section>

      <Section titre="Finance">
        <Indicateur libelle="Marge brute" valeur={gnf(s.marge.margeGnf)} detail={comparaison(s.marge.margeGnf, s.margePrec.margeGnf)} />
        <Indicateur libelle="Taux de marge brute" valeur={pct(s.marge.taux)} detail={`Coût matière des produits vendus : ${gnf(s.marge.coutVentesGnf)}`} />
        <Indicateur libelle="Créances clients" valeur={gnf(v.creancesGnf)} />
        <Indicateur libelle="Valeur du stock" valeur={gnf(s.stock.valeurGnf)} detail="Charges, résultat, trésorerie, BFR et dettes : phase 3" />
      </Section>

      <Section titre="Distribution" lien="/commercial">
        <Indicateur libelle="Grossistes / semi-grossistes" valeur={`${s.distribution.grossistes} / ${s.distribution.semiGrossistes}`} />
        <Indicateur libelle="Points de vente actifs" valeur={nombre(s.distribution.pvaActifs)} detail={`${s.distribution.nouveauxPva} nouveau(x) sur la période`} />
        <Indicateur libelle="Taux de rupture" valeur={pct(s.distribution.tauxRupture)} detail={comparaison(s.distribution.tauxRupture, s.distributionPrec.tauxRupture, "points")} ton={(s.distribution.tauxRupture ?? 0) > 0.15 ? "alerte" : "normal"} />
        <Indicateur libelle="Couverture" valeur={`${s.distribution.quartiersCouverts} / ${s.distribution.quartiersTotal} quartiers`} detail={`${s.distribution.visites} visites · ${s.distribution.communesCouvertes} commune(s)`} />
      </Section>
    </>
  );
}
