import type { Metadata } from "next";
import Link from "next/link";
import { Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { BoutonAction } from "@/components/ui/bouton-action";
import { exigerDonnees } from "@/lib/donnees/resultat";
import { formaterDate } from "@/lib/formulaires/dates";
import { gnf, nombre } from "@/lib/stocks/libelles";
import { clientServeur } from "@/lib/supabase/serveur";
import { facturerLivre } from "../actions";

export const metadata: Metadata = { title: "À facturer" };

/**
 * Commandes livrées pas encore facturées : un bouton prépare la facture de ce qui a été livré (quantités et prix
 * repris de la commande et des bons de livraison), à vérifier puis valider. Montants hors taxes, TVA ajoutée à la facture.
 */
export default async function AFacturer() {
  const supabase = await clientServeur();
  const lignes = exigerDonnees(await supabase.from("commandes_a_facturer").select("*").order("derniere_livraison"), "les commandes à facturer") ?? [];
  const total = lignes.reduce((t, l) => t + Number(l.montant_ht_gnf ?? 0), 0);
  return (
    <>
      <TitrePage
        titre="À facturer"
        fil={[{ libelle: "Ventes", href: "/ventes" }]}
        sousTitre={lignes.length ? `${lignes.length} commande(s) livrée(s) à facturer · ${gnf(total)} hors taxes` : "Les commandes livrées et pas encore facturées apparaissent ici."}
      />
      <Carte>
        {lignes.length ? (
          <Tableau entetes={["Commande", "Client", "Livré, pas facturé", "Montant hors taxes", "Dernière livraison", ""]}>
            {lignes.map((l) => (
              <tr key={l.commande_id}>
                <Cellule>
                  <Link href={`/ventes/pieces/${l.commande_id}`} className="font-mono font-semibold text-papel-700 hover:underline">
                    {l.numero}
                  </Link>
                </Cellule>
                <Cellule>{l.client_nom}</Cellule>
                <Cellule>{nombre(l.paquets_a_facturer)} paquets</Cellule>
                <Cellule className="font-semibold">{gnf(l.montant_ht_gnf)}</Cellule>
                <Cellule>{l.derniere_livraison ? formaterDate(l.derniere_livraison) : "—"}</Cellule>
                <Cellule>
                  <BoutonAction action={facturerLivre.bind(null, l.commande_id!)} libelle={l.facture_en_cours ? "Reprendre la facture" : "Facturer"} enCoursLibelle="Préparation…" />
                </Cellule>
              </tr>
            ))}
          </Tableau>
        ) : (
          <p className="py-2 text-gray-700">Rien à facturer pour le moment : toutes les livraisons validées sont facturées.</p>
        )}
      </Carte>
    </>
  );
}
