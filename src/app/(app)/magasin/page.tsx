import type { Metadata } from "next";
import { lireSeuils } from "@/lib/parametres";
import { ActionsAppli } from "@/components/coque/entree-appli";
import { CarteObjectifs } from "@/components/objectifs/carte-objectifs";
import { Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { ecartRelatif, Indicateur } from "@/components/ui/indicateur";
import { SelecteurPeriode } from "@/components/donnees/selecteur-periode";
import { chargerOptionsFiltres, decrireFiltres } from "@/lib/filtres/options";
import { aujourdhui } from "@/lib/formulaires/dates";
import { lireFiltresAnalyse, lirePeriode } from "@/lib/formulaires/filtres-analyse";
import { formaterPoids, kg } from "@/lib/metier/unites";
import { afficherStock, gnf, nombre } from "@/lib/stocks/libelles";
import { clientServeur } from "@/lib/supabase/serveur";

export const metadata: Metadata = { title: "Stocks" };

export default async function TableauDeBordMagasin({ searchParams }: PageProps<"/magasin">) {
  const sp = await searchParams;
  const periode = lirePeriode(sp, aujourdhui());
  const filtres = { ...lireFiltresAnalyse(sp), commercial: null };
  const supabase = await clientServeur();
  // Mouvements de produits finis de la période (entrées de production, livraisons, dotations, retours).
  const mouvementsPf = (du: string, au: string) =>
    supabase.from("mouvements_stock").select("type, quantite, articles!inner(famille, produit_id)").eq("articles.famille", "produit_fini").in("type", ["production", "vente", "dotation", "retour"]).gte("date_operation", du).lte("date_operation", au).limit(50000);
  const [{ data: etat }, { data: transit }, { data: mvts }, { data: mvtsPrec }, options] = await Promise.all([
    supabase.from("etat_stock").select("*").eq("actif", true),
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
      <TitrePage titre="Stocks" sousTitre="Ce qu'il y a dans l'usine, en temps réel" action={<ActionsAppli espace="magasin" />} />
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
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Indicateur lien="/magasin/mouvements" libelle={`Produits finis entrés${gamme ? ` · ${gamme}` : ""}`} valeur={`${nombre(pfPeriode.produits)} paquets`} variation={{ ecart: ecartRelatif(pfPeriode.produits, pfPrec.produits) }} detail="Entrées de production de la période" />
        <Indicateur lien="/magasin/mouvements" libelle={`Livrés aux clients${gamme ? ` · ${gamme}` : ""}`} valeur={`${nombre(pfPeriode.livres)} paquets`} variation={{ ecart: ecartRelatif(pfPeriode.livres, pfPrec.livres) }} detail="Livraisons moins retours" />
      </div>
      <CarteObjectifs
        espace="magasin"
        du={periode.du}
        au={periode.au}
        filtre={!!filtres.produit}
        reels={{ paquets_livres: pfPeriode.livres, couverture_mp: couvertureMp, valeur_stock: valeurTotale }}
      />

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
    </>
  );
}
