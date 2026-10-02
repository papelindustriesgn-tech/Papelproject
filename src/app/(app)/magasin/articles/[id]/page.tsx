import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Bouton, Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { Indicateur } from "@/components/ui/indicateur";
import { formaterDate } from "@/lib/formulaires/dates";
import { afficherStock, gnf, LIBELLES_FAMILLES, nombre, TYPES_MOUVEMENT } from "@/lib/stocks/libelles";
import { clientServeur } from "@/lib/supabase/serveur";
import { basculerArticle } from "../../actions";
import { FormulaireArticle } from "../formulaires";

export default async function FicheArticle({ params }: PageProps<"/magasin/articles/[id]">) {
  const { id } = await params;
  const supabase = await clientServeur();
  const [{ data: a }, { data: etat }, { data: mouvements }, { data: lots }, { data: categories }] = await Promise.all([
    supabase.from("articles").select("*").eq("id", id).maybeSingle(),
    supabase.from("etat_stock").select("*").eq("article_id", id).maybeSingle(),
    supabase.from("mouvements_stock").select("id, date_operation, type, quantite, cout_unitaire_gnf, stock_apres, motif, lots(numero_lot)").eq("article_id", id).order("date_operation", { ascending: false }).order("created_at", { ascending: false }).limit(30),
    supabase.from("etat_lots").select("id, numero_lot, date_reception, poids_net_kg, poids_restant_kg, statut").eq("article_id", id).gt("poids_restant_kg", 0).order("date_reception"),
    supabase.from("categories_articles").select("id, libelle, famille").eq("actif", true).order("libelle"),
  ]);
  if (!a || !etat) notFound();
  const stock = (q: number) => afficherStock(q, a.unite, etat.paquets_par_colis);

  return (
    <>
      <Link href="/magasin/articles" className="text-papel-700 underline">
        ← Articles
      </Link>
      <TitrePage
        titre={a.libelle}
        sousTitre={`${a.code} · ${LIBELLES_FAMILLES[a.famille]} · unité : ${a.unite}${a.suivi_par_lot ? " · suivi par lot" : ""}`}
        action={
          <div className="flex items-center gap-2">
            {!a.actif && <Badge ton="neutre">Archivé</Badge>}
            <Link href={`/magasin/mouvements/nouveau?article=${a.id}`} className="min-h-11 content-center rounded-lg bg-papel-700 px-4 font-semibold text-white">
              + Mouvement
            </Link>
          </div>
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicateur libelle="Stock actuel" valeur={stock(Number(etat.quantite))} ton={Number(a.seuil_alerte) > 0 && Number(etat.quantite) <= Number(a.seuil_alerte) ? "danger" : "normal"} detail={`Seuil d'alerte : ${stock(Number(a.seuil_alerte))}`} />
        <Indicateur libelle="Jours de couverture" valeur={etat.jours_couverture === null ? "—" : `${nombre(etat.jours_couverture, 1)} j`} detail={`Consommation : ${stock(Number(etat.conso_jour))} / jour`} />
        <Indicateur libelle="Coût moyen pondéré" valeur={gnf(etat.cmp_gnf)} detail={`par ${a.unite}`} />
        <Indicateur libelle="Valeur du stock" valeur={gnf(etat.valeur_gnf)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Carte titre="Fiche">
          <FormulaireArticle id={a.id} article={{ libelle: a.libelle, categorie_id: a.categorie_id, seuil_alerte: Number(a.seuil_alerte), notes: a.notes }} categories={(categories ?? []).filter((c) => c.famille === a.famille)} />
          <form action={basculerArticle.bind(null, a.id, !a.actif)} className="mt-3">
            <Bouton type="submit" variante="discret">
              {a.actif ? "Archiver l'article" : "Réactiver l'article"}
            </Bouton>
          </form>
        </Carte>
        {a.suivi_par_lot && (
          <Carte titre={`Bobines en stock (${lots?.length ?? 0})`}>
            <Tableau entetes={["N° de lot", "Reçue le", "Poids initial", "Reste", "Statut"]}>
              {(lots ?? []).map((l) => (
                <tr key={l.id}>
                  <Cellule className="font-mono">{l.numero_lot}</Cellule>
                  <Cellule>{formaterDate(l.date_reception)}</Cellule>
                  <Cellule>{nombre(l.poids_net_kg, 1)} kg</Cellule>
                  <Cellule className="font-semibold">{nombre(l.poids_restant_kg, 1)} kg</Cellule>
                  <Cellule>{l.statut === "bloque" ? <Badge ton="erreur">Bloquée</Badge> : <Badge ton="succes">Disponible</Badge>}</Cellule>
                </tr>
              ))}
            </Tableau>
          </Carte>
        )}
      </div>

      <Carte titre="Derniers mouvements" className="mt-4" action={<Link href={`/magasin/mouvements?article=${a.id}`} className="text-papel-700 underline">Tout l&apos;historique</Link>}>
        <Tableau entetes={["Date", "Type", "Quantité", "Stock après", "Lot", "Motif"]}>
          {(mouvements ?? []).map((m) => (
            <tr key={m.id}>
              <Cellule className="whitespace-nowrap">{formaterDate(m.date_operation)}</Cellule>
              <Cellule>{TYPES_MOUVEMENT[m.type]?.libelle ?? m.type}</Cellule>
              <Cellule className={Number(m.quantite) > 0 ? "font-semibold text-green-800" : "font-semibold text-red-800"}>
                {Number(m.quantite) > 0 ? "+" : "−"}
                {stock(Math.abs(Number(m.quantite)))}
              </Cellule>
              <Cellule>{m.stock_apres === null ? "—" : stock(Number(m.stock_apres))}</Cellule>
              <Cellule className="font-mono text-sm">{m.lots?.numero_lot ?? ""}</Cellule>
              <Cellule className="text-sm">{m.motif}</Cellule>
            </tr>
          ))}
        </Tableau>
      </Carte>
    </>
  );
}
