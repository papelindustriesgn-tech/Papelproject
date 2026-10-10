import type { Metadata } from "next";
import Link from "next/link";
import { ExportCsv } from "@/components/donnees/export-csv";
import { Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { Indicateur } from "@/components/ui/indicateur";
import { formaterDate } from "@/lib/formulaires/dates";
import { gnf } from "@/lib/stocks/libelles";
import { clientServeur } from "@/lib/supabase/serveur";

export const metadata: Metadata = { title: "Impayés" };

const TRANCHES = [
  { libelle: "Non échu", min: -Infinity, max: 0 },
  { libelle: "1 à 30 jours", min: 1, max: 30 },
  { libelle: "31 à 60 jours", min: 31, max: 60 },
  { libelle: "Plus de 60 jours", min: 61, max: Infinity },
];

export default async function PageImpayes() {
  const supabase = await clientServeur();
  const [{ data }, { data: relances }] = await Promise.all([
    supabase.from("factures_etat").select("*").gt("solde_gnf", 0).order("jours_retard", { ascending: false }),
    supabase.from("relances").select("facture_id, date_relance, promesse_date").order("date_relance", { ascending: false }),
  ]);
  const factures = (data ?? []).map((f) => ({ ...f, solde: Number(f.solde_gnf ?? 0), retard: Number(f.jours_retard ?? 0) }));
  const derniereRelance = new Map<string, { date_relance: string; promesse_date: string | null }>();
  for (const r of relances ?? []) if (!derniereRelance.has(r.facture_id)) derniereRelance.set(r.facture_id, r);
  const total = factures.reduce((s, f) => s + f.solde, 0);

  return (
    <>
      <TitrePage titre="Impayés et relances" sousTitre="Factures non soldées, de la plus en retard à la moins en retard." />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {TRANCHES.map((t) => {
          const montant = factures.filter((f) => f.retard >= t.min && f.retard <= t.max).reduce((s, f) => s + f.solde, 0);
          return <Indicateur key={t.libelle} libelle={t.libelle} valeur={gnf(montant)} ton={t.min > 30 && montant > 0 ? "danger" : t.min > 0 && montant > 0 ? "alerte" : "normal"} detail={total ? `${Math.round((montant / total) * 100)} % des créances` : undefined} />;
        })}
      </div>
      <Carte titre={`Créances : ${gnf(total)}`}>
        <div className="mb-3">
          <ExportCsv
            nomFichier="impayes"
            entetes={["Facture", "Client", "Code client", "Date", "Échéance", "Total TTC", "Payé", "Reste dû", "Jours de retard", "Dernière relance", "Promesse"]}
            lignes={factures.map((f) => [f.numero, f.client_nom, f.client_code, f.date_piece, f.date_echeance, f.total_ttc_gnf, f.paye_gnf, f.solde, f.retard, derniereRelance.get(f.id!)?.date_relance ?? "", derniereRelance.get(f.id!)?.promesse_date ?? ""])}
          />
        </div>
        <Tableau entetes={["Facture", "Client", "Échéance", "Reste dû", "Retard", "Dernière relance"]}>
          {factures.map((f) => {
            const r = derniereRelance.get(f.id!);
            return (
              <tr key={f.id}>
                <Cellule>
                  <Link href={`/ventes/pieces/${f.id}`} className="font-mono font-semibold text-papel-700 hover:underline">
                    {f.numero}
                  </Link>
                </Cellule>
                <Cellule>{f.client_nom}</Cellule>
                <Cellule>{formaterDate(f.date_echeance)}</Cellule>
                <Cellule className="font-semibold">{gnf(f.solde)}</Cellule>
                <Cellule className={f.retard > 30 ? "font-bold text-red-700" : f.retard > 0 ? "font-semibold text-amber-800" : ""}>{f.retard > 0 ? `${f.retard} j` : "—"}</Cellule>
                <Cellule className="text-sm">{r ? `${formaterDate(r.date_relance)}${r.promesse_date ? ` · promesse ${formaterDate(r.promesse_date)}` : ""}` : "Jamais relancé"}</Cellule>
              </tr>
            );
          })}
        </Tableau>
        {!factures.length && <p className="py-4 text-gray-700">Aucun impayé. </p>}
      </Carte>
    </>
  );
}
