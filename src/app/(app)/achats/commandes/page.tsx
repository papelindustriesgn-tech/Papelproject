import type { Metadata } from "next";
import Link from "next/link";
import { ExportCsv } from "@/components/donnees/export-csv";
import { Badge, Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { STATUTS_BC } from "@/lib/achats/libelles";
import { formaterDate } from "@/lib/formulaires/dates";
import { formaterMontant } from "@/lib/metier/devises";
import { clientServeur } from "@/lib/supabase/serveur";

export const metadata: Metadata = { title: "Bons de commande" };

export default async function PageCommandes() {
  const supabase = await clientServeur();
  const { data } = await supabase.from("bons_commande").select("*, fournisseurs(nom), lignes_bc(montant_devise), conteneurs(id)").order("date_commande", { ascending: false }).limit(200);
  const bcs = (data ?? []).map((b) => ({ ...b, total: b.lignes_bc.reduce((s, l) => s + l.montant_devise, 0) }));
  return (
    <>
      <TitrePage
        titre="Bons de commande"
        action={
          <Link href="/achats/commandes/nouveau" className="min-h-11 content-center rounded-lg bg-papel-700 px-4 font-semibold text-white">
            + Bon de commande
          </Link>
        }
      />
      <Carte>
        <div className="mb-3">
          <ExportCsv
            nomFichier="bons-commande"
            entetes={["Numéro", "Date", "Fournisseur", "Devise", "Montant", "Taux", "Statut"]}
            lignes={bcs.map((b) => [b.numero ?? "brouillon", b.date_commande, b.fournisseurs?.nom, b.devise, b.devise === "USD" ? b.total / 100 : b.total, Number(b.taux_change), STATUTS_BC[b.statut].libelle])}
          />
        </div>
        <Tableau entetes={["Numéro", "Date", "Fournisseur", "Montant", "Conteneurs", "Statut"]}>
          {bcs.map((b) => (
            <tr key={b.id}>
              <Cellule>
                <Link href={`/achats/commandes/${b.id}`} className="font-mono font-semibold text-papel-800 underline">
                  {b.numero ?? "Brouillon"}
                </Link>
              </Cellule>
              <Cellule>{formaterDate(b.date_commande)}</Cellule>
              <Cellule>{b.fournisseurs?.nom}</Cellule>
              <Cellule>{formaterMontant(b.total, b.devise as "GNF" | "USD")}</Cellule>
              <Cellule>{b.conteneurs.length}</Cellule>
              <Cellule>
                <Badge ton={STATUTS_BC[b.statut].ton}>{STATUTS_BC[b.statut].libelle}</Badge>
              </Cellule>
            </tr>
          ))}
        </Tableau>
      </Carte>
    </>
  );
}
