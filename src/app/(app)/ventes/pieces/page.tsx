import type { Metadata } from "next";
import Link from "next/link";
import { ExportCsv } from "@/components/donnees/export-csv";
import { BarreFiltres, lireParam, motifRecherche } from "@/components/donnees/filtres";
import { Badge, Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { formaterDate } from "@/lib/formulaires/dates";
import { gnf } from "@/lib/stocks/libelles";
import { STATUTS_PIECE, TYPES_PIECE } from "@/lib/ventes/libelles";
import { clientServeur } from "@/lib/supabase/serveur";
import type { Database } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Pièces de vente" };

export default async function PagePieces({ searchParams }: PageProps<"/ventes/pieces">) {
  const sp = await searchParams;
  const type = (lireParam(sp, "type") ?? "facture") as Database["public"]["Enums"]["type_piece"];
  const q = lireParam(sp, "q");
  const statut = lireParam(sp, "statut");
  const def = TYPES_PIECE[type] ?? TYPES_PIECE.facture;
  const supabase = await clientServeur();
  let requete = supabase
    .from("pieces_vente")
    .select("id, numero, date_piece, date_echeance, statut, total_ht_gnf, total_tva_gnf, total_ttc_gnf, clients!inner(nom, code)")
    .eq("type_piece", type)
    .order("date_piece", { ascending: false })
    .order("numero", { ascending: false })
    .limit(300);
  if (q) requete = requete.or(`numero.ilike.${motifRecherche(q)}`);
  if (statut) requete = requete.eq("statut", statut as Database["public"]["Enums"]["statut_piece"]);
  const [{ data }, { data: etats }] = await Promise.all([requete, type === "facture" ? supabase.from("factures_etat").select("id, solde_gnf, jours_retard") : Promise.resolve({ data: [] })]);
  const etat = new Map((etats ?? []).map((e) => [e.id, { solde_gnf: Number(e.solde_gnf ?? 0), jours_retard: Number(e.jours_retard ?? 0) }]));
  const pieces = data ?? [];

  return (
    <>
      <TitrePage
        titre={def.pluriel}
        action={
          type !== "avoir" && (
            <Link href={`/ventes/pieces/nouvelle?type=${type}`} className="min-h-11 inline-flex items-center rounded bg-papel-700 px-4 font-medium text-white hover:bg-papel-800 md:min-h-9">
              + {def.singulier}
            </Link>
          )
        }
      />
      <Carte>
        <BarreFiltres
          recherche={q}
          placeholder="Numéro"
          valeurs={{ statut, type }}
          filtres={[{ nom: "statut", libelle: "Statut", options: Object.entries(STATUTS_PIECE).map(([v, s]) => ({ valeur: v, libelle: s.libelle })) }]}
          action={
            <>
              <input type="hidden" name="type" value={type} />
              <ExportCsv
                nomFichier={`${type}s`}
                entetes={["Numéro", "Date", "Client", "Code client", "Total HT (GNF)", "TVA (GNF)", "Total TTC (GNF)", "Statut", ...(type === "facture" ? ["Échéance", "Reste à payer (GNF)"] : [])]}
                lignes={pieces.map((p) => [p.numero ?? "", p.date_piece, p.clients.nom, p.clients.code, p.total_ht_gnf, p.total_tva_gnf, p.total_ttc_gnf, STATUTS_PIECE[p.statut].libelle, ...(type === "facture" ? [p.date_echeance ?? "", etat.get(p.id)?.solde_gnf ?? ""] : [])])}
              />
            </>
          }
        />
        <Tableau entetes={["Numéro", "Date", "Client", "Total TTC", ...(type === "facture" ? ["Reste dû"] : []), "Statut"]}>
          {pieces.map((p) => {
            const e = etat.get(p.id);
            return (
              <tr key={p.id}>
                <Cellule>
                  <Link href={`/ventes/pieces/${p.id}`} className="font-mono font-semibold text-papel-700 hover:underline">
                    {p.numero ?? "Brouillon"}
                  </Link>
                </Cellule>
                <Cellule className="whitespace-nowrap">{formaterDate(p.date_piece)}</Cellule>
                <Cellule>{p.clients.nom}</Cellule>
                <Cellule>{gnf(p.total_ttc_gnf)}</Cellule>
                {type === "facture" && (
                  <Cellule className={e && e.solde_gnf > 0 && e.jours_retard > 0 ? "font-bold text-red-700" : ""}>
                    {e ? gnf(e.solde_gnf) : "—"}
                    {e && e.solde_gnf > 0 && e.jours_retard > 0 && <span className="block text-sm">{e.jours_retard} j de retard</span>}
                  </Cellule>
                )}
                <Cellule>
                  <Badge ton={STATUTS_PIECE[p.statut].ton}>{STATUTS_PIECE[p.statut].libelle}</Badge>
                </Cellule>
              </tr>
            );
          })}
        </Tableau>
        {!pieces.length && <p className="py-4 text-gray-700">Aucune pièce.</p>}
      </Carte>
    </>
  );
}
