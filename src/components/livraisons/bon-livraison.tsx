import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Bouton, Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { BoutonImprimer } from "@/components/ui/bouton-imprimer";
import { formaterDate, formaterDateHeure } from "@/lib/formulaires/dates";
import { abandonnerBon } from "@/lib/livraisons/actions";
import { STATUTS_REMISE } from "@/lib/logistique/libelles";
import { formaterStockProduitFini, type Paquets } from "@/lib/metier/unites";
import { clientServeur } from "@/lib/supabase/serveur";
import { QuantitePreparee, ValiderBon } from "./formulaires";

/**
 * Bon de livraison, partagé par le Magasin et les Ventes : préparation des colis (quantités en colis + paquets,
 * livraison partielle possible), stock disponible à côté, récapitulatif puis sortie de stock ; ensuite impression
 * pour la signature du client et suivi de la remise par la logistique.
 */
export async function BonLivraison({ id, espace }: { id: string; espace: "magasin" | "ventes" }) {
  const supabase = await clientServeur();
  const { data: l } = await supabase
    .from("livraisons")
    .select(
      "*, tournees_livraison(numero), pieces_vente(id, numero, clients(nom, adresse, telephone)), lignes_livraison(id, conditionnement_id, paquets, paquets_retournes, conditionnements(libelle, paquets_par_colis, produits(libelle)))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!l) notFound();
  const brouillon = l.statut === "brouillon";
  const [{ data: stocks }, { data: suivi }] = await Promise.all([
    supabase.from("etat_stock").select("conditionnement_id, quantite").eq("famille", "produit_fini"),
    l.commande_id ? supabase.from("suivi_commandes").select("date_confirmee").eq("commande_id", l.commande_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const stock = new Map((stocks ?? []).map((s) => [s.conditionnement_id, Number(s.quantite)]));
  const lignes = l.lignes_livraison.map((ll) => ({ ...ll, ppc: ll.conditionnements?.paquets_par_colis ?? 1, libelle: `${ll.conditionnements?.produits?.libelle} – ${ll.conditionnements?.libelle}`, enStock: stock.get(ll.conditionnement_id) ?? 0 }));
  const manque = lignes.filter((x) => x.enStock < x.paquets);
  const retour = espace === "ventes" ? `/ventes/pieces/${l.pieces_vente?.id}` : "/magasin/commandes";

  return (
    <>
      <div className="flex flex-wrap justify-between gap-2 print:hidden">
        <Link href={retour} className="text-papel-700 underline">
          ← {espace === "ventes" ? `Commande ${l.pieces_vente?.numero}` : "Commandes à préparer"}
        </Link>
        {!brouillon && <BoutonImprimer />}
      </div>
      <div className="imprimer-couleurs mt-2 hidden items-center justify-between rounded bg-papel-700 p-3 text-white print:flex">
        <Image src="/logo-papel.png" alt="Papel" width={110} height={62} />
        <div className="text-right text-xl font-bold">BON DE LIVRAISON {l.numero}</div>
      </div>
      <TitrePage
        titre={brouillon ? `Préparer la commande ${l.pieces_vente?.numero}` : `Bon de livraison ${l.numero}`}
        sousTitre={`${l.pieces_vente?.clients?.nom} · ${l.pieces_vente?.clients?.adresse ?? ""} · ${l.pieces_vente?.clients?.telephone ?? ""}${suivi?.date_confirmee ? ` · livraison promise le ${formaterDate(suivi.date_confirmee)}` : ""}`}
        action={brouillon ? <Badge ton="alerte">Préparation en cours</Badge> : <Badge ton={STATUTS_REMISE[l.statut_remise].ton}>{STATUTS_REMISE[l.statut_remise].libelle}</Badge>}
      />
      {!brouillon && (
        <p className="mb-3 text-gray-700 print:hidden">
          {l.tournees_livraison ? `Tournée ${l.tournees_livraison.numero}` : "Prochaine étape : la logistique l'ajoute à une tournée."}
          {l.remise_le && ` · remis le ${formaterDateHeure(l.remise_le)}${l.receptionnaire ? ` à ${l.receptionnaire}` : ""}`}
          {l.commentaire_remise && ` · ${l.commentaire_remise}`}
          {l.lignes_livraison.some((x) => x.paquets_retournes > 0) &&
            ` · rapporté : ${l.lignes_livraison.reduce((t, x) => t + x.paquets_retournes, 0)} paquets (revenus en stock, restent à livrer ; un avoir est à faire si la facture est émise)`}
        </p>
      )}
      <Carte titre={brouillon ? "1. Préparez les colis" : "Produits livrés"}>
        {brouillon && <p className="mb-2 text-gray-700">Tout le reste à livrer est proposé. S&apos;il en manque, réduisez la quantité : le reste sera livré plus tard (0 colis = rien sur ce bon).</p>}
        <Tableau entetes={["Produit", brouillon ? "À préparer" : "Quantité", ...(brouillon ? ["En stock à l'usine"] : [])]}>
          {lignes.map((ll) => (
            <tr key={ll.id}>
              <Cellule className="font-semibold">{ll.libelle}</Cellule>
              <Cellule>
                {brouillon ? (
                  <QuantitePreparee ligneId={ll.id} livraisonId={l.id} paquets={ll.paquets} paquetsParColis={ll.ppc} />
                ) : (
                  formaterStockProduitFini(ll.paquets as Paquets, { paquetsParColis: ll.ppc })
                )}
              </Cellule>
              {brouillon && (
                <Cellule className={ll.enStock < ll.paquets ? "font-bold text-red-700" : ""}>
                  {formaterStockProduitFini(ll.enStock as Paquets, { paquetsParColis: ll.ppc })}
                  {ll.enStock < ll.paquets && <span className="block text-sm">Il en manque : réduisez la quantité</span>}
                </Cellule>
              )}
            </tr>
          ))}
        </Tableau>
        {brouillon && !lignes.length && <p className="text-gray-700">Plus rien sur ce bon : abandonnez-le ci-dessous.</p>}
        {!brouillon && (
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
      {brouillon && (
        <Carte titre="2. Validez la sortie du stock" className="mt-4">
          <ValiderBon
            livraisonId={l.id}
            espace={espace}
            recapitulatif={lignes.map((x) => `${x.libelle} : ${formaterStockProduitFini(x.paquets as Paquets, { paquetsParColis: x.ppc })}`)}
            bloque={!lignes.length ? "Aucun produit sur ce bon." : manque.length ? `Stock insuffisant pour : ${manque.map((x) => x.libelle).join(", ")}. Réduisez la quantité préparée.` : null}
          />
          <form action={abandonnerBon.bind(null, l.id, retour)} className="mt-3">
            <Bouton type="submit" variante="discret">
              Abandonner cette préparation (rien ne sort du stock)
            </Bouton>
          </form>
        </Carte>
      )}
    </>
  );
}
