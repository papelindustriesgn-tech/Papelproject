import type { Metadata } from "next";
import { lireSeuils } from "@/lib/parametres";
import { AccueilTravail, SuiviTravail } from "@/components/accueil/accueil-travail";
import { CarteObjectifs } from "@/components/objectifs/carte-objectifs";
import { Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { ecartRelatif, Indicateur } from "@/components/ui/indicateur";
import { SelecteurPeriode } from "@/components/donnees/selecteur-periode";
import { chargerOptionsFiltres, decrireFiltres } from "@/lib/filtres/options";
import { aujourdhui, formaterDate } from "@/lib/formulaires/dates";
import { lireFiltresAnalyse, lirePeriode } from "@/lib/formulaires/filtres-analyse";
import { formaterPoids, kg } from "@/lib/metier/unites";
import { afficherStock, gnf, nombre } from "@/lib/stocks/libelles";
import { exigerDonnees, lireTout } from "@/lib/donnees/resultat";
import { clientServeur } from "@/lib/supabase/serveur";

export const metadata: Metadata = { title: "Stocks" };

/** Étape d'un conteneur, en mots simples (statut déduit des dates réelles). */
const ETAPES_CONTENEUR: Record<string, string> = { commande: "Commandé, pas encore parti", en_mer: "En mer", au_port: "Arrivé au port", dedouane: "Dédouané, en route vers l'usine" };

export default async function TableauDeBordMagasin({ searchParams }: PageProps<"/magasin">) {
  const sp = await searchParams;
  const periode = lirePeriode(sp, aujourdhui());
  const filtres = { ...lireFiltresAnalyse(sp), commercial: null };
  const supabase = await clientServeur();
  // Mouvements de produits finis de la période (entrées de production, livraisons, dotations, retours).
  const mouvementsPf = (du: string, au: string) =>
    lireTout(() => supabase.from("mouvements_stock").select("type, quantite, articles!inner(famille, produit_id)").eq("articles.famille", "produit_fini").in("type", ["production", "vente", "dotation", "retour"]).gte("date_operation", du).lte("date_operation", au).order("id"));
  const [resEtat, resTransit, resAttendus, resMvts, resMvtsPrec, options] = await Promise.all([
    supabase.from("etat_stock").select("*").eq("actif", true),
    supabase.from("transit").select("kg_en_transit, nb_conteneurs").maybeSingle(),
    supabase.from("conteneurs").select("id, reference, navire, statut, poids_net_prevu_kg, date_livraison_prevue, date_arrivee_port_prevue").neq("statut", "livre").order("date_livraison_prevue", { nullsFirst: false }).limit(20),
    mouvementsPf(periode.du, periode.au),
    mouvementsPf(periode.precedente.du, periode.precedente.au),
    chargerOptionsFiltres(),
  ]);
  // Une requête en échec affiche « données non chargées + Réessayer », jamais un stock à zéro.
  const etat = exigerDonnees(resEtat, "l'état du stock");
  const transit = exigerDonnees(resTransit, "la marchandise en transit");
  const attendus = exigerDonnees(resAttendus, "les réceptions attendues") ?? [];
  const mvts = exigerDonnees(resMvts, "les mouvements de la période");
  const mvtsPrec = exigerDonnees(resMvtsPrec, "les mouvements de la période précédente");
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
      <TitrePage titre="Stocks" sousTitre="Ce qu'il y a dans l'usine, en temps réel" />
      <AccueilTravail espace="magasin" />
      <SelecteurPeriode periode={periode} params={sp} filtres={filtres} gammes={options.produits} />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicateur lien="/magasin/bobines" libelle="Matière première disponible" valeur={formaterPoids(kg(kgMp))} detail={`${nbBobines} bobine(s) en stock`} />
        <Indicateur
          lien="/magasin/articles"
          libelle="Jours de stock de matière"
          valeur={couvertureMp === null ? "—" : `${nombre(couvertureMp, 1)} j`}
          detail={consoMpJour > 0 ? `Consommation moyenne : ${formaterPoids(kg(consoMpJour))}/jour` : "Pas de consommation récente"}
          ton={couvertureMp !== null && couvertureMp < seuilCouverture ? "alerte" : "normal"}
        />
        <Indicateur lien="#receptions-attendues" libelle="Tonnes en transit" valeur={formaterPoids(kg(Number(transit?.kg_en_transit ?? 0)))} detail={`${transit?.nb_conteneurs ?? 0} conteneur(s) commandé(s), en mer ou au port`} />
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

        <Carte titre="Réceptions attendues" className="mb-4" id="receptions-attendues">
          {attendus.length ? (
            <Tableau entetes={["Conteneur", "Où en est-il ?", "Arrivée à l'usine prévue", "Poids prévu"]}>
              {attendus.map((c) => (
                <tr key={c.id}>
                  <Cellule className="font-semibold">{c.reference}{c.navire ? ` · ${c.navire}` : ""}</Cellule>
                  <Cellule>{ETAPES_CONTENEUR[c.statut] ?? c.statut}</Cellule>
                  <Cellule>{c.date_livraison_prevue ? formaterDate(c.date_livraison_prevue) : "À préciser par les achats"}</Cellule>
                  <Cellule>{formaterPoids(kg(Number(c.poids_net_prevu_kg ?? 0)))}</Cellule>
                </tr>
              ))}
            </Tableau>
          ) : (
            <p className="text-gray-700">Aucune marchandise attendue. Quand les achats commandent un conteneur, il apparaît ici avec sa date d&apos;arrivée.</p>
          )}
          <p className="mt-2 text-sm text-gray-600">À l&apos;arrivée : Réceptions (bobines) → choisir le conteneur, puis peser chaque bobine.</p>
        </Carte>
        <Carte titre={`Produits finis en stock${gamme ? ` · ${gamme}` : ""}`}>
          {pf.length ? (
            <Tableau entetes={["Article", "Stock", "Jours de stock"]}>
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
      <SuiviTravail espace="magasin" />
    </>
  );
}
