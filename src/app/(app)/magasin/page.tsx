import type { Metadata } from "next";
import { lireSeuils } from "@/lib/parametres";
import { RaccourcisAppli, UrgencesAppli } from "@/components/coque/entree-appli";
import Link from "next/link";
import { Badge, Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { ecartRelatif, Indicateur } from "@/components/ui/indicateur";
import { lireParam } from "@/components/donnees/filtres";
import { SelecteurPeriode } from "@/components/donnees/selecteur-periode";
import { chargerOptionsFiltres, decrireFiltres } from "@/lib/filtres/options";
import { aujourdhui } from "@/lib/formulaires/dates";
import { lireFiltresAnalyse } from "@/lib/formulaires/filtres-analyse";
import { resoudrePeriode } from "@/lib/formulaires/periode";
import { formaterPoids, kg } from "@/lib/metier/unites";
import { afficherStock, gnf, LIBELLES_FAMILLES, nombre } from "@/lib/stocks/libelles";
import { clientServeur } from "@/lib/supabase/serveur";

export const metadata: Metadata = { title: "Stocks" };

const NIVEAUX_ALERTE: Record<string, { libelle: string; ton: "erreur" | "alerte" }> = {
  rupture: { libelle: "Rupture", ton: "erreur" },
  sous_seuil: { libelle: "Sous le seuil", ton: "erreur" },
  couverture_faible: { libelle: "Couverture faible", ton: "alerte" },
};

export default async function TableauDeBordMagasin({ searchParams }: PageProps<"/magasin">) {
  const sp = await searchParams;
  const periode = resoudrePeriode(lireParam(sp, "periode"), aujourdhui(), lireParam(sp, "du"), lireParam(sp, "au"));
  const filtres = { ...lireFiltresAnalyse(sp), commercial: null };
  const supabase = await clientServeur();
  // Mouvements de produits finis de la période (entrées de production, livraisons, dotations, retours).
  const mouvementsPf = (du: string, au: string) =>
    supabase.from("mouvements_stock").select("type, quantite, articles!inner(famille, produit_id)").eq("articles.famille", "produit_fini").in("type", ["production", "vente", "dotation", "retour"]).gte("date_operation", du).lte("date_operation", au).limit(50000);
  const [{ data: etat }, { data: alertes }, { data: transit }, { data: mvts }, { data: mvtsPrec }, options] = await Promise.all([
    supabase.from("etat_stock").select("*").eq("actif", true),
    supabase.from("alertes_stock").select("article_id, code, libelle, unite, quantite, seuil_alerte, jours_couverture, paquets_par_colis, niveau_alerte"),
    supabase.from("transit").select("kg_en_transit, nb_conteneurs").maybeSingle(),
    mouvementsPf(periode.du, periode.au),
    mouvementsPf(periode.precedente.du, periode.precedente.au),
    chargerOptionsFiltres(),
  ]);
  const deLaGamme = (produitId: string | null | undefined) => !filtres.produit || produitId === filtres.produit;
  const paquetsPar = (liste: typeof mvts, type: string) => Math.abs((liste ?? []).filter((m) => m.type === type && deLaGamme(m.articles?.produit_id)).reduce((t, m) => t + Number(m.quantite), 0));
  const flux = (liste: typeof mvts) => ({ produits: paquetsPar(liste, "production"), livres: paquetsPar(liste, "vente") - paquetsPar(liste, "retour"), offerts: paquetsPar(liste, "dotation") });
  const pfPeriode = flux(mvts);
  const pfPrec = flux(mvtsPrec);
  const gamme = decrireFiltres(filtres, options);
  const { stock_jours_couverture_alerte: seuilCouverture } = await lireSeuils({ stock_jours_couverture_alerte: 15 });
  const lignes = etat ?? [];
  const mp = lignes.filter((l) => l.famille === "matiere_premiere");
  const kgMp = mp.filter((l) => l.unite === "kg").reduce((s, l) => s + Number(l.quantite), 0);
  const consoMpJour = mp.filter((l) => l.unite === "kg").reduce((s, l) => s + Number(l.conso_jour), 0);
  const couvertureMp = consoMpJour > 0 ? kgMp / consoMpJour : null;
  const valeurTotale = lignes.reduce((s, l) => s + Number(l.valeur_gnf), 0);
  const pf = lignes.filter((l) => l.famille === "produit_fini" && Number(l.quantite) > 0 && deLaGamme(l.produit_id));
  const nbBobines = mp.reduce((s, l) => s + Number(l.nb_lots_en_stock ?? 0), 0);

  return (
    <>
      <TitrePage titre="Stocks" sousTitre="Situation en temps réel — usine de Coyah" />
      <UrgencesAppli espace="magasin" />
      <SelecteurPeriode periode={periode} params={sp} filtres={filtres} gammes={options.produits} />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicateur lien="/magasin/bobines" libelle="Matière première disponible" valeur={formaterPoids(kg(kgMp))} detail={`${nbBobines} bobine(s) en stock`} />
        <Indicateur
          lien="/magasin/articles"
          libelle="Jours de couverture MP"
          valeur={couvertureMp === null ? "—" : `${nombre(couvertureMp, 1)} j`}
          detail={consoMpJour > 0 ? `Consommation moyenne : ${formaterPoids(kg(consoMpJour))}/jour` : "Pas de consommation récente"}
          ton={couvertureMp !== null && couvertureMp < seuilCouverture ? "alerte" : "normal"}
        />
        <Indicateur lien="/achats/conteneurs" libelle="Tonnes en transit" valeur={formaterPoids(kg(Number(transit?.kg_en_transit ?? 0)))} detail={`${transit?.nb_conteneurs ?? 0} conteneur(s) commandé(s), en mer ou au port`} />
        <Indicateur lien="/magasin/articles" libelle="Valeur du stock" valeur={gnf(valeurTotale)} detail="Au coût moyen pondéré" />
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Indicateur lien="/magasin/mouvements" libelle={`Produits finis entrés${gamme ? ` · ${gamme}` : ""}`} valeur={`${nombre(pfPeriode.produits)} paquets`} variation={{ ecart: ecartRelatif(pfPeriode.produits, pfPrec.produits) }} detail="Entrées de production de la période" />
        <Indicateur lien="/magasin/mouvements" libelle={`Livrés aux clients${gamme ? ` · ${gamme}` : ""}`} valeur={`${nombre(pfPeriode.livres)} paquets`} variation={{ ecart: ecartRelatif(pfPeriode.livres, pfPrec.livres) }} detail="Livraisons moins retours" />
        <Indicateur lien="/magasin/mouvements" libelle={`Dotations remises${gamme ? ` · ${gamme}` : ""}`} valeur={`${nombre(pfPeriode.offerts)} paquets`} variation={{ ecart: ecartRelatif(pfPeriode.offerts, pfPrec.offerts) }} detail="Paquets offerts aux grossistes" />
      </div>
      <RaccourcisAppli espace="magasin" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Carte titre={`Alertes (${alertes?.length ?? 0})`}>
          {alertes?.length ? (
            <ul className="divide-y divide-gray-100">
              {alertes.map((a) => (
                <li key={a.article_id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <Link href={`/magasin/articles/${a.article_id}`} className="font-medium text-papel-700 hover:underline">
                    {a.libelle}
                  </Link>
                  <span className="flex items-center gap-2">
                    {afficherStock(Number(a.quantite), a.unite!, a.paquets_par_colis)}
                    {a.jours_couverture !== null && <span className="text-sm text-gray-600">({nombre(a.jours_couverture, 1)} j)</span>}
                    <Badge ton={NIVEAUX_ALERTE[a.niveau_alerte!].ton}>{NIVEAUX_ALERTE[a.niveau_alerte!].libelle}</Badge>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-700">Aucune alerte de stock.</p>
          )}
        </Carte>
        <Carte titre={`Produits finis en stock${gamme ? ` · ${gamme}` : ""}`}>
          {pf.length ? (
            <Tableau entetes={["Article", "Stock", "Couverture"]}>
              {pf.map((l) => (
                <tr key={l.article_id}>
                  <Cellule>{l.libelle}</Cellule>
                  <Cellule className="font-semibold">{afficherStock(Number(l.quantite), l.unite!, l.paquets_par_colis)}</Cellule>
                  <Cellule>{l.jours_couverture === null ? "—" : `${nombre(l.jours_couverture, 1)} j`}</Cellule>
                </tr>
              ))}
            </Tableau>
          ) : (
            <p className="text-gray-700">Aucun produit fini en stock.</p>
          )}
        </Carte>
      </div>

      <Carte titre="Valeur par famille" className="mt-4">
        <Tableau entetes={["Famille", "Articles", "Valeur"]}>
          {Object.entries(LIBELLES_FAMILLES).map(([famille, libelle]) => {
            const f = lignes.filter((l) => l.famille === famille);
            if (!f.length) return null;
            return (
              <tr key={famille}>
                <Cellule>{libelle}</Cellule>
                <Cellule>{f.length}</Cellule>
                <Cellule>{gnf(f.reduce((s, l) => s + Number(l.valeur_gnf), 0))}</Cellule>
              </tr>
            );
          })}
        </Tableau>
        <p className="mt-2 text-sm text-gray-600">Les produits finis seront valorisés à leur coût de revient avec le module Production (étape 3).</p>
      </Carte>
    </>
  );
}
