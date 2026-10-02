import type { Metadata } from "next";
import { lireParam } from "@/components/donnees/filtres";
import { SelecteurPeriode } from "@/components/donnees/selecteur-periode";
import { CarteDynamique } from "@/components/carte/carte-dynamique";
import { COULEURS_SERIES } from "@/lib/graphiques/couleurs";
import { Carte as CarteUi, Cellule, Tableau, TitrePage } from "@/components/ui";
import { Indicateur } from "@/components/ui/indicateur";
import { chargerIndicateursCommerciaux } from "@/lib/commercial/indicateurs";
import { aujourdhui, formaterDate } from "@/lib/formulaires/dates";
import { resoudrePeriode } from "@/lib/formulaires/periode";
import { pct } from "@/lib/production/affichage";
import { gnf, nombre } from "@/lib/stocks/libelles";
import { clientServeur } from "@/lib/supabase/serveur";

export const metadata: Metadata = { title: "Équipe commerciale" };

export default async function TableauDeBordCommercial({ searchParams }: PageProps<"/commercial">) {
  const sp = await searchParams;
  const periode = resoudrePeriode(lireParam(sp, "periode") ?? "7j", aujourdhui(), lireParam(sp, "du"), lireParam(sp, "au"));
  const supabase = await clientServeur();
  const [ind, { data: pva }] = await Promise.all([
    chargerIndicateursCommerciaux(periode.du, periode.au, periode.nbJours),
    supabase.from("pva_carte").select("id, nom, commercial_id, commercial_nom, type_libelle, latitude, longitude, derniere_visite, derniere_rupture").eq("actif", true),
  ]);
  // Couleur fixe par commercial (ordre alphabétique stable), légende sous la carte.
  const couleur = new Map(ind.parCommercial.map((c, i) => [c.id, COULEURS_SERIES[i % COULEURS_SERIES.length]]));
  const points = (pva ?? [])
    .filter((p) => p.latitude !== null && p.longitude !== null)
    .map((p) => ({
      id: p.id!,
      latitude: p.latitude!,
      longitude: p.longitude!,
      libelle: p.nom!,
      detail: `${p.type_libelle} · ${p.commercial_nom}${p.derniere_visite ? ` · vu le ${formaterDate(p.derniere_visite)}` : " · jamais visité"}${p.derniere_rupture ? " · RUPTURE" : ""}`,
      couleur: couleur.get(p.commercial_id!) ?? "#52514e",
      creux: !!p.derniere_rupture,
    }));

  return (
    <>
      <TitrePage titre="Équipe commerciale" sousTitre={`Du ${formaterDate(periode.du)} au ${formaterDate(periode.au)}`} />
      <SelecteurPeriode periode={periode} />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicateur libelle="Visites" valeur={nombre(ind.visites)} detail={`${nombre(ind.visitesParJour, 1)} par jour · ${ind.horsZone} hors zone`} ton={ind.visites && ind.horsZone / ind.visites > 0.15 ? "alerte" : "normal"} />
        <Indicateur libelle="Taux de rupture" valeur={pct(ind.tauxRupture)} detail={`${ind.ruptures} visite(s) avec rupture`} ton={(ind.tauxRupture ?? 0) > 0.15 ? "alerte" : "normal"} />
        <Indicateur libelle="Points de vente" valeur={nombre(ind.pvaActifs)} detail={`${ind.nouveauxPva} nouveau(x) sur la période`} />
        <Indicateur libelle="Couverture géographique" valeur={`${ind.quartiersCouverts} / ${ind.quartiersTotal} quartiers`} detail={`${ind.communesCouvertes} commune(s) couverte(s)`} />
      </div>
      <CarteUi titre="Carte des points de vente" className="mb-4">
        <CarteDynamique points={points} hauteur={420} />
        <ul className="mt-2 flex flex-wrap gap-3 text-sm" aria-label="Légende">
          {ind.parCommercial.map((c) => (
            <li key={c.id} className="flex items-center gap-1">
              <span className="inline-block size-3 rounded-full" style={{ backgroundColor: couleur.get(c.id) }} aria-hidden />
              {c.nom}
            </li>
          ))}
          <li className="flex items-center gap-1">
            <span className="inline-block size-3 rounded-full border-2 border-gray-600 bg-transparent" aria-hidden /> Point creux : rupture à la dernière visite
          </li>
        </ul>
      </CarteUi>
      <CarteUi titre="Par commercial">
        <Tableau entetes={["Commercial", "Visites", "Hors zone", "Ruptures", "Nouveaux PVA", "Pièces", "CA HT", "Objectif CA du mois"]}>
          {ind.parCommercial.map((c) => (
            <tr key={c.id}>
              <Cellule className="font-semibold">{c.nom}</Cellule>
              <Cellule>{nombre(c.visites)}{c.objectifs ? ` / ${nombre(c.objectifs.visites)}` : ""}</Cellule>
              <Cellule className={c.visites && c.horsZone / c.visites > 0.15 ? "font-bold text-red-700" : ""}>{c.horsZone}</Cellule>
              <Cellule>{c.ruptures}</Cellule>
              <Cellule>{c.nouveauxPva}{c.objectifs ? ` / ${c.objectifs.nouveaux_pva}` : ""}</Cellule>
              <Cellule>{c.pieces}</Cellule>
              <Cellule>{gnf(c.caHtGnf)}</Cellule>
              <Cellule>{c.objectifs ? `${gnf(c.objectifs.ca_ht_gnf)}${c.objectifs.ca_ht_gnf ? ` (${pct(c.caHtGnf / c.objectifs.ca_ht_gnf, 0)})` : ""}` : "—"}</Cellule>
            </tr>
          ))}
        </Tableau>
        <p className="mt-2 text-sm text-gray-600">Les objectifs du mois se comparent sur la période choisie ; choisissez « Ce mois » pour un suivi exact.</p>
      </CarteUi>
    </>
  );
}
