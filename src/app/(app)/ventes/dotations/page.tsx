import type { Metadata } from "next";
import Link from "next/link";
import { ExportCsv } from "@/components/donnees/export-csv";
import { Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { nombre } from "@/lib/stocks/libelles";
import { clientServeur } from "@/lib/supabase/serveur";

export const metadata: Metadata = { title: "Dotations" };

export default async function PageDotations() {
  const supabase = await clientServeur();
  const { data } = await supabase
    .from("dotations")
    .select("id, paquets_dus, paquets_remis, produits(libelle), pieces_vente(id, numero, date_piece, clients(nom))")
    .order("updated_at", { ascending: false })
    .limit(500);
  const lignes = (data ?? []).map((d) => ({ ...d, reste: d.paquets_dus - d.paquets_remis }));
  const aRemettre = lignes.filter((d) => d.reste > 0);

  return (
    <>
      <TitrePage titre="Dotations" sousTitre="Paquets offerts calculés sur les montants encaissés. La remise se fait depuis la facture (sortie de stock)." />
      <Carte titre={`À remettre : ${nombre(aRemettre.reduce((s, d) => s + d.reste, 0))} paquets`}>
        <div className="mb-3">
          <ExportCsv
            nomFichier="dotations"
            entetes={["Facture", "Client", "Produit", "Paquets dus", "Paquets remis", "Reste"]}
            lignes={lignes.map((d) => [d.pieces_vente?.numero, d.pieces_vente?.clients?.nom, d.produits?.libelle, d.paquets_dus, d.paquets_remis, d.reste])}
          />
        </div>
        <Tableau entetes={["Facture", "Client", "Produit", "Dus", "Remis", "Reste"]}>
          {lignes.map((d) => (
            <tr key={d.id}>
              <Cellule>
                <Link href={`/ventes/pieces/${d.pieces_vente?.id}`} className="font-mono font-semibold text-papel-800 underline">
                  {d.pieces_vente?.numero}
                </Link>
              </Cellule>
              <Cellule>{d.pieces_vente?.clients?.nom}</Cellule>
              <Cellule>{d.produits?.libelle}</Cellule>
              <Cellule>{nombre(d.paquets_dus)}</Cellule>
              <Cellule>{nombre(d.paquets_remis)}</Cellule>
              <Cellule className={d.reste > 0 ? "font-bold" : ""}>{nombre(d.reste)}</Cellule>
            </tr>
          ))}
        </Tableau>
        {!lignes.length && <p className="py-4 text-gray-700">Aucune dotation.</p>}
      </Carte>
    </>
  );
}
