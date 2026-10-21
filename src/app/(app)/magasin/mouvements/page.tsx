import type { Metadata } from "next";
import Link from "next/link";
import { ExportCsv } from "@/components/donnees/export-csv";
import { lireParam } from "@/components/donnees/filtres";
import { Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { aujourdhui, formaterDate } from "@/lib/formulaires/dates";
import { afficherStock, gnf, TYPES_MOUVEMENT } from "@/lib/stocks/libelles";
import { clientServeur } from "@/lib/supabase/serveur";
import type { Database } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Mouvements de stock" };

const PAR_PAGE = 100;

export default async function PageMouvements({ searchParams }: PageProps<"/magasin/mouvements">) {
  const sp = await searchParams;
  const article = lireParam(sp, "article");
  const type = lireParam(sp, "type");
  const du = lireParam(sp, "du");
  const au = lireParam(sp, "au");
  const page = Math.max(1, Number(lireParam(sp, "page")) || 1);

  const supabase = await clientServeur();
  let requete = supabase
    .from("mouvements_stock")
    .select("id, date_operation, type, quantite, unite, cout_unitaire_gnf, valeur_gnf, stock_apres, motif, created_at, articles(code, libelle, conditionnements(paquets_par_colis)), lots(numero_lot), profils(identifiant)")
    .order("date_operation", { ascending: false })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAR_PAGE, page * PAR_PAGE - 1);
  if (article) requete = requete.eq("article_id", article);
  if (type) requete = requete.eq("type", type as Database["public"]["Enums"]["type_mouvement"]);
  if (du) requete = requete.gte("date_operation", du);
  if (au) requete = requete.lte("date_operation", au);
  const [{ data }, { data: articles }] = await Promise.all([requete, supabase.from("articles").select("id, code, libelle").order("code")]);
  const lignes = data ?? [];
  const parametres = { article, type, du, au };

  return (
    <>
      <TitrePage
        titre="Mouvements de stock"
        sousTitre="Journal des entrées et sorties. Une erreur se corrige par un mouvement inverse (jamais d'effacement)."
        action={
          <Link href={`/magasin/mouvements/nouveau${article ? `?article=${article}` : ""}`} className="min-h-11 inline-flex items-center rounded bg-papel-700 px-4 font-medium text-white hover:bg-papel-800 md:min-h-9">
            + Nouveau mouvement
          </Link>
        }
      />
      <Carte>
        <form className="mb-3 flex flex-wrap items-end gap-2">
          <label className="flex min-w-0 flex-col">
            <span className="text-sm font-medium text-gray-700">Article</span>
            <select name="article" defaultValue={article ?? ""} className="min-h-11 w-full max-w-64 rounded border border-gray-300 bg-white px-3 md:min-h-9">
              <option value="">Tous</option>
              {(articles ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} – {a.libelle}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col">
            <span className="text-sm font-medium text-gray-700">Type</span>
            <select name="type" defaultValue={type ?? ""} className="min-h-11 rounded border border-gray-300 bg-white px-3 md:min-h-9">
              <option value="">Tous</option>
              {Object.entries(TYPES_MOUVEMENT).map(([k, d]) => (
                <option key={k} value={k}>
                  {d.libelle}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col">
            <span className="text-sm font-medium text-gray-700">Du</span>
            <input type="date" name="du" defaultValue={du} max={aujourdhui()} className="min-h-11 rounded border border-gray-300 bg-white px-3 md:min-h-9" />
          </label>
          <label className="flex flex-col">
            <span className="text-sm font-medium text-gray-700">Au</span>
            <input type="date" name="au" defaultValue={au} className="min-h-11 rounded border border-gray-300 bg-white px-3 md:min-h-9" />
          </label>
          <button className="min-h-11 rounded bg-papel-700 px-4 font-medium text-white hover:bg-papel-800 md:min-h-9">Filtrer</button>
          <Link href="/magasin/mouvements" className="min-h-11 content-center px-2 text-papel-700 underline">
            Effacer
          </Link>
          <ExportCsv
            nomFichier="mouvements-stock"
            entetes={["Date", "Type", "Code article", "Article", "Lot", "Quantité", "Unité", "Coût unitaire (GNF)", "Valeur (GNF)", "Stock après", "Motif", "Saisi par"]}
            lignes={lignes.map((m) => [
              m.date_operation, TYPES_MOUVEMENT[m.type]?.libelle ?? m.type, m.articles?.code, m.articles?.libelle, m.lots?.numero_lot ?? "",
              Number(m.quantite), m.unite, m.cout_unitaire_gnf === null ? "" : Number(m.cout_unitaire_gnf),
              m.valeur_gnf === null ? "" : Math.round(Number(m.valeur_gnf)), m.stock_apres === null ? "" : Number(m.stock_apres), m.motif, m.profils?.identifiant ?? "",
            ])}
          />
        </form>
        <Tableau entetes={["Date", "Article", "Type", "Quantité", "Valeur", "Motif", "Par"]}>
          {lignes.map((m) => {
            const ppc = m.articles?.conditionnements?.paquets_par_colis;
            return (
              <tr key={m.id}>
                <Cellule className="whitespace-nowrap">{formaterDate(m.date_operation)}</Cellule>
                <Cellule>
                  {m.articles?.libelle}
                  {m.lots?.numero_lot && <span className="block font-mono text-sm text-gray-600">Lot {m.lots.numero_lot}</span>}
                </Cellule>
                <Cellule>{TYPES_MOUVEMENT[m.type]?.libelle ?? m.type}</Cellule>
                <Cellule className={Number(m.quantite) > 0 ? "font-semibold text-green-800" : "font-semibold text-red-800"}>
                  {Number(m.quantite) > 0 ? "+" : "−"}
                  {afficherStock(Math.abs(Number(m.quantite)), m.unite, ppc)}
                </Cellule>
                <Cellule>{m.valeur_gnf === null ? "—" : gnf(m.valeur_gnf)}</Cellule>
                <Cellule className="text-sm">{m.motif}</Cellule>
                <Cellule className="text-sm">{m.profils?.identifiant ?? "—"}</Cellule>
              </tr>
            );
          })}
        </Tableau>
        {!lignes.length && <p className="py-4 text-gray-700">Aucun mouvement.</p>}
        <div className="mt-3 flex gap-3">
          {page > 1 && <Link href={{ query: { ...parametres, page: page - 1 } }} className="text-papel-700 underline">← Plus récents</Link>}
          {lignes.length === PAR_PAGE && <Link href={{ query: { ...parametres, page: page + 1 } }} className="text-papel-700 underline">Plus anciens →</Link>}
        </div>
      </Carte>
    </>
  );
}
