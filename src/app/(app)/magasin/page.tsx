import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { Indicateur } from "@/components/ui/indicateur";
import { formaterPoids, kg } from "@/lib/metier/unites";
import { afficherStock, gnf, LIBELLES_FAMILLES, nombre } from "@/lib/stocks/libelles";
import { clientServeur } from "@/lib/supabase/serveur";

export const metadata: Metadata = { title: "Stocks" };

const NIVEAUX_ALERTE: Record<string, { libelle: string; ton: "erreur" | "alerte" }> = {
  rupture: { libelle: "Rupture", ton: "erreur" },
  sous_seuil: { libelle: "Sous le seuil", ton: "erreur" },
  couverture_faible: { libelle: "Couverture faible", ton: "alerte" },
};

export default async function TableauDeBordMagasin() {
  const supabase = await clientServeur();
  const [{ data: etat }, { data: alertes }, { data: transit }] = await Promise.all([
    supabase.from("etat_stock").select("*").eq("actif", true),
    supabase.from("alertes_stock").select("article_id, code, libelle, unite, quantite, seuil_alerte, jours_couverture, paquets_par_colis, niveau_alerte"),
    supabase.from("transit").select("kg_en_transit, nb_conteneurs").maybeSingle(),
  ]);
  const lignes = etat ?? [];
  const mp = lignes.filter((l) => l.famille === "matiere_premiere");
  const kgMp = mp.filter((l) => l.unite === "kg").reduce((s, l) => s + Number(l.quantite), 0);
  const consoMpJour = mp.filter((l) => l.unite === "kg").reduce((s, l) => s + Number(l.conso_jour), 0);
  const couvertureMp = consoMpJour > 0 ? kgMp / consoMpJour : null;
  const valeurTotale = lignes.reduce((s, l) => s + Number(l.valeur_gnf), 0);
  const pf = lignes.filter((l) => l.famille === "produit_fini" && Number(l.quantite) > 0);
  const nbBobines = mp.reduce((s, l) => s + Number(l.nb_lots_en_stock ?? 0), 0);

  return (
    <>
      <TitrePage titre="Stocks" sousTitre="Situation en temps réel — usine de Coyah" />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicateur libelle="Matière première disponible" valeur={formaterPoids(kg(kgMp))} detail={`${nbBobines} bobine(s) en stock`} />
        <Indicateur
          libelle="Jours de couverture MP"
          valeur={couvertureMp === null ? "—" : `${nombre(couvertureMp, 1)} j`}
          detail={consoMpJour > 0 ? `Consommation moyenne : ${formaterPoids(kg(consoMpJour))}/jour` : "Pas de consommation récente"}
          ton={couvertureMp !== null && couvertureMp < 15 ? "alerte" : "normal"}
        />
        <Indicateur libelle="Tonnes en transit" valeur={formaterPoids(kg(Number(transit?.kg_en_transit ?? 0)))} detail={`${transit?.nb_conteneurs ?? 0} conteneur(s) commandé(s), en mer ou au port`} />
        <Indicateur libelle="Valeur du stock" valeur={gnf(valeurTotale)} detail="Au coût moyen pondéré" />
      </div>

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
        <Carte titre="Produits finis en stock">
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
