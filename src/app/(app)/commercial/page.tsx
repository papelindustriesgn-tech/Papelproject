import type { Metadata } from "next";
import { lireSeuils } from "@/lib/parametres";
import { RaccourcisAppli } from "@/components/coque/entree-appli";
import { CarteObjectifs } from "@/components/objectifs/carte-objectifs";
import { SelecteurPeriode } from "@/components/donnees/selecteur-periode";
import { CarteDynamique } from "@/components/carte/carte-dynamique";
import { COULEURS_SERIES } from "@/lib/graphiques/couleurs";
import { Carte as CarteUi, Cellule, Tableau, TitrePage } from "@/components/ui";
import { Indicateur } from "@/components/ui/indicateur";
import { chargerIndicateursCommerciaux } from "@/lib/commercial/indicateurs";
import { aujourdhui, formaterDate } from "@/lib/formulaires/dates";
import { lireFiltresAnalyse, lirePeriode } from "@/lib/formulaires/filtres-analyse";
import { chargerOptionsFiltres, decrireFiltres } from "@/lib/filtres/options";
import { pct } from "@/lib/production/affichage";
import { gnf, nombre } from "@/lib/stocks/libelles";
import { clientServeur } from "@/lib/supabase/serveur";

export const metadata: Metadata = { title: "Équipe commerciale" };

export default async function TableauDeBordCommercial({ searchParams }: PageProps<"/commercial">) {
  const sp = await searchParams;
  const periode = lirePeriode(sp, aujourdhui(), "semaine");
  const filtres = lireFiltresAnalyse(sp);
  const supabase = await clientServeur();
  let requetePva = supabase.from("pva_carte").select("id, nom, commercial_id, commercial_nom, type_libelle, latitude, longitude, derniere_visite, derniere_rupture").eq("actif", true);
  if (filtres.commercial) requetePva = requetePva.eq("commercial_id", filtres.commercial);
  const [ind, { data: pva }, seuils, options] = await Promise.all([
    chargerIndicateursCommerciaux(periode.du, periode.au, periode.nbJours, filtres),
    requetePva,
    lireSeuils({ alerte_taux_rupture: 0.15, alerte_taux_hors_zone: 0.15 }),
    chargerOptionsFiltres(),
  ]);
  const filtresTexte = decrireFiltres(filtres, options);
  // Couleur fixe par commercial (ordre alphabétique de toute l'équipe : un filtre ne repeint pas les autres).
  const couleur = new Map(options.commerciaux.map((c, i) => [c.valeur, COULEURS_SERIES[i % COULEURS_SERIES.length]]));
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
      <TitrePage titre="Équipe commerciale" sousTitre={`Du ${formaterDate(periode.du)} au ${formaterDate(periode.au)}${filtresTexte ? ` · ${filtresTexte}` : ""}`} />
      <SelecteurPeriode periode={periode} params={sp} filtres={filtres} gammes={options.produits} commerciaux={options.commerciaux} />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicateur lien="/commercial/visites" libelle="Visites" valeur={nombre(ind.visites)} detail={`${nombre(ind.visitesParJour, 1)} par jour · ${ind.horsZone} hors zone`} ton={ind.visites && ind.horsZone / ind.visites > seuils.alerte_taux_hors_zone ? "alerte" : "normal"} />
        <Indicateur lien="/commercial/visites" libelle="Taux de rupture" valeur={pct(ind.tauxRupture)} detail={`${ind.ruptures} visite(s) avec rupture`} ton={(ind.tauxRupture ?? 0) > seuils.alerte_taux_rupture ? "alerte" : "normal"} />
        <Indicateur lien="/commercial/portefeuilles" libelle="Points de vente" valeur={nombre(ind.pvaActifs)} detail={`${ind.nouveauxPva} nouveau(x) sur la période`} />
        <Indicateur lien="/commercial/portefeuilles" libelle="Couverture géographique" valeur={`${ind.quartiersCouverts} / ${ind.quartiersTotal} quartiers`} detail={`${ind.communesCouvertes} commune(s) couverte(s)`} />
      </div>
      <CarteObjectifs
        espace="commercial"
        du={periode.du}
        au={periode.au}
        filtre={!!(filtres.produit || filtres.commercial)}
        reels={{ visites: ind.visites, nouveaux_pva: ind.nouveauxPva, taux_rupture: ind.tauxRupture, quartiers_couverts: ind.quartiersCouverts }}
      />
      <RaccourcisAppli espace="commercial" />
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
              <Cellule className={c.visites && c.horsZone / c.visites > seuils.alerte_taux_hors_zone ? "font-bold text-red-700" : ""}>{c.horsZone}</Cellule>
              <Cellule>{c.ruptures}</Cellule>
              <Cellule>{c.nouveauxPva}{c.objectifs ? ` / ${c.objectifs.nouveaux_pva}` : ""}</Cellule>
              <Cellule>{c.pieces}</Cellule>
              <Cellule>{gnf(c.caHtGnf)}</Cellule>
              <Cellule>{c.objectifs ? `${gnf(c.objectifs.ca_ht_gnf)}${c.objectifs.ca_ht_gnf ? ` (${pct(c.caHtGnf / c.objectifs.ca_ht_gnf, 0)})` : ""}` : "—"}</Cellule>
            </tr>
          ))}
        </Tableau>
        {filtres.produit && <p className="mt-2 text-sm text-gray-600">Pièces et CA : lignes de la gamme choisie seulement ; les objectifs restent toutes gammes.</p>}
        <p className="mt-2 text-sm text-gray-600">Les objectifs du mois se comparent sur la période choisie ; choisissez « Ce mois » pour un suivi exact.</p>
      </CarteUi>
    </>
  );
}
