import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { BoutonImprimer } from "@/components/ui/bouton-imprimer";
import { formaterDate } from "@/lib/formulaires/dates";
import { formaterStockProduitFini, type Paquets } from "@/lib/metier/unites";
import { afficherStock } from "@/lib/stocks/libelles";
import { clientServeur } from "@/lib/supabase/serveur";
import { BoutonValiderLivraison, FormulaireLigneLivraison } from "./formulaires";

/** Bon de livraison : ajustement des quantités (livraison partielle), validation, impression pour signature du client. */
export default async function PageLivraison({ params }: PageProps<"/ventes/livraisons/[id]">) {
  const { id } = await params;
  const supabase = await clientServeur();
  const { data: l } = await supabase
    .from("livraisons")
    .select("*, pieces_vente(id, numero, clients(nom, adresse, telephone)), lignes_livraison(id, conditionnement_id, paquets, conditionnements(libelle, paquets_par_colis, produits(libelle)))")
    .eq("id", id)
    .maybeSingle();
  if (!l) notFound();
  const { data: stocks } = await supabase.from("etat_stock").select("conditionnement_id, quantite, unite, paquets_par_colis").eq("famille", "produit_fini");
  const stock = new Map((stocks ?? []).map((s) => [s.conditionnement_id, s]));
  const brouillon = l.statut === "brouillon";

  return (
    <>
      <div className="flex justify-between print:hidden">
        <Link href={`/ventes/pieces/${l.pieces_vente?.id}`} className="text-papel-700 underline">
          ← Commande {l.pieces_vente?.numero}
        </Link>
        {!brouillon && <BoutonImprimer />}
      </div>
      <div className="imprimer-couleurs mt-2 hidden items-center justify-between rounded-lg bg-papel-700 p-3 text-white print:flex">
        <Image src="/logo-papel.png" alt="Papel" width={110} height={62} />
        <div className="text-right text-xl font-bold">BON DE LIVRAISON {l.numero}</div>
      </div>
      <TitrePage
        titre={`Bon de livraison ${l.numero ?? "(brouillon)"}`}
        sousTitre={`${l.pieces_vente?.clients?.nom} · ${l.pieces_vente?.clients?.adresse ?? ""} · ${l.pieces_vente?.clients?.telephone ?? ""} · ${formaterDate(l.date_livraison)}`}
        action={brouillon ? <Badge ton="alerte">À valider</Badge> : <Badge ton="succes">Livrée</Badge>}
      />
      <Carte titre="Produits à livrer">
        <Tableau entetes={["Produit", "Quantité", ...(brouillon ? ["Stock disponible"] : [])]}>
          {l.lignes_livraison.map((ll) => {
            const s = stock.get(ll.conditionnement_id);
            return (
              <tr key={ll.id}>
                <Cellule>
                  {ll.conditionnements?.produits?.libelle} – {ll.conditionnements?.libelle}
                </Cellule>
                <Cellule>
                  {brouillon ? (
                    <FormulaireLigneLivraison ligneId={ll.id} livraisonId={l.id} paquets={ll.paquets} />
                  ) : (
                    formaterStockProduitFini(ll.paquets as Paquets, { paquetsParColis: ll.conditionnements?.paquets_par_colis ?? 1 })
                  )}
                </Cellule>
                {brouillon && <Cellule className={s && Number(s.quantite) < ll.paquets ? "font-bold text-red-700" : ""}>{s ? afficherStock(Number(s.quantite), s.unite!, s.paquets_par_colis) : "—"}</Cellule>}
              </tr>
            );
          })}
        </Tableau>
        {brouillon ? (
          <div className="mt-4">
            <p className="mb-2 text-gray-700">Pour une livraison partielle, réduisez les quantités (0 retire la ligne). Le reste pourra être livré plus tard.</p>
            <BoutonValiderLivraison livraisonId={l.id} />
          </div>
        ) : (
          <div className="mt-12 hidden grid-cols-2 gap-8 text-sm print:grid">
            <div>
              Reçu par (nom, signature, date)
              <div className="mt-12 border-t border-gray-400" />
            </div>
            <div>
              Livré par
              <div className="mt-12 border-t border-gray-400" />
            </div>
          </div>
        )}
      </Carte>
    </>
  );
}
