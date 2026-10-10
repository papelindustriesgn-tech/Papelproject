import type { Metadata } from "next";
import Link from "next/link";
import { ExportCsv } from "@/components/donnees/export-csv";
import { BarreFiltres, lireParam, motifRecherche } from "@/components/donnees/filtres";
import { Badge, Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { FAMILLES_ARTICLES } from "@/lib/referentiels/definitions";
import { afficherStock, gnf, LIBELLES_FAMILLES, nombre } from "@/lib/stocks/libelles";
import { clientServeur } from "@/lib/supabase/serveur";
import type { Database } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Articles" };

export default async function PageArticles({ searchParams }: PageProps<"/magasin/articles">) {
  const sp = await searchParams;
  const q = lireParam(sp, "q");
  const famille = lireParam(sp, "famille");
  const categorie = lireParam(sp, "categorie");
  const archives = lireParam(sp, "archives") === "1";

  const supabase = await clientServeur();
  let requete = supabase.from("etat_stock").select("*").order("famille").order("code").limit(500);
  if (q) requete = requete.or(`libelle.ilike.${motifRecherche(q)},code.ilike.${motifRecherche(q)}`);
  if (famille) requete = requete.eq("famille", famille as Database["public"]["Enums"]["famille_article"]);
  if (categorie) requete = requete.eq("categorie_id", categorie);
  if (!archives) requete = requete.eq("actif", true);
  const [{ data }, { data: categories }] = await Promise.all([requete, supabase.from("categories_articles").select("id, libelle").eq("actif", true).order("libelle")]);
  const lignes = data ?? [];
  const nomCategorie = new Map((categories ?? []).map((c) => [c.id, c.libelle]));

  return (
    <>
      <TitrePage
        titre="Articles"
        sousTitre="Matières premières, emballages, produits finis et pièces"
        action={
          <Link href="/magasin/articles/nouveau" className="min-h-11 inline-flex items-center rounded bg-papel-700 px-4 font-medium text-white hover:bg-papel-800 md:min-h-9">
            + Nouvel article
          </Link>
        }
      />
      <Carte>
        <BarreFiltres
          recherche={q}
          placeholder="Code ou libellé"
          valeurs={{ famille, categorie, archives: archives ? "1" : undefined }}
          filtres={[
            { nom: "famille", libelle: "Famille", options: FAMILLES_ARTICLES },
            { nom: "categorie", libelle: "Catégorie", options: (categories ?? []).map((c) => ({ valeur: c.id, libelle: c.libelle })) },
            { nom: "archives", libelle: "Archivés", options: [{ valeur: "1", libelle: "Afficher aussi" }] },
          ]}
          action={
            <ExportCsv
              nomFichier="articles-stock"
              entetes={["Code", "Libellé", "Famille", "Catégorie", "Unité", "Stock", "Seuil d'alerte", "Consommation/jour", "Jours de couverture", "CMP (GNF)", "Valeur (GNF)"]}
              lignes={lignes.map((l) => [
                l.code, l.libelle, LIBELLES_FAMILLES[l.famille!], nomCategorie.get(l.categorie_id ?? "") ?? "", l.unite,
                Number(l.quantite), Number(l.seuil_alerte), Number(l.conso_jour), l.jours_couverture === null ? "" : Number(l.jours_couverture),
                Number(l.cmp_gnf), Math.round(Number(l.valeur_gnf)),
              ])}
            />
          }
        />
        <Tableau entetes={["Code", "Article", "Famille", "Stock", "Couverture", "Valeur"]}>
          {lignes.map((l) => {
            const bas = Number(l.seuil_alerte) > 0 && Number(l.quantite) <= Number(l.seuil_alerte);
            return (
              <tr key={l.article_id} className={l.actif ? "" : "opacity-60"}>
                <Cellule className="font-mono text-sm">{l.code}</Cellule>
                <Cellule>
                  <Link href={`/magasin/articles/${l.article_id}`} className="font-medium text-papel-700 hover:underline">
                    {l.libelle}
                  </Link>
                  {!l.actif && <Badge ton="neutre">Archivé</Badge>}
                </Cellule>
                <Cellule>{LIBELLES_FAMILLES[l.famille!]}</Cellule>
                <Cellule className={bas ? "font-bold text-red-700" : "font-semibold"}>{afficherStock(Number(l.quantite), l.unite!, l.paquets_par_colis)}</Cellule>
                <Cellule>{l.jours_couverture === null ? "—" : `${nombre(l.jours_couverture, 1)} j`}</Cellule>
                <Cellule>{gnf(l.valeur_gnf)}</Cellule>
              </tr>
            );
          })}
        </Tableau>
        {!lignes.length && <p className="py-4 text-gray-700">Aucun article ne correspond.</p>}
      </Carte>
    </>
  );
}
