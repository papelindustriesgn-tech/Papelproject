import type { Metadata } from "next";
import Link from "next/link";
import { ExportCsv } from "@/components/donnees/export-csv";
import { BarreFiltres, lireParam } from "@/components/donnees/filtres";
import { Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { Indicateur } from "@/components/ui/indicateur";
import { exigerDonnees } from "@/lib/donnees/resultat";
import { aujourdhui, formaterDate } from "@/lib/formulaires/dates";
import { gnf, nombre } from "@/lib/stocks/libelles";
import { clientServeur } from "@/lib/supabase/serveur";

export const metadata: Metadata = { title: "Encaissements" };

const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Paiements reçus des clients (saisis au bureau) et remboursements, sur une période. */
export default async function PageEncaissements({ searchParams }: PageProps<"/ventes/encaissements">) {
  const sp = await searchParams;
  const jour = aujourdhui();
  const du = DATE_ISO.test(lireParam(sp, "du") ?? "") ? lireParam(sp, "du")! : `${jour.slice(0, 7)}-01`;
  const au = DATE_ISO.test(lireParam(sp, "au") ?? "") ? lireParam(sp, "au")! : jour;
  const mode = lireParam(sp, "mode");
  const q = (lireParam(sp, "q") ?? "").trim().toLowerCase();

  const supabase = await clientServeur();
  let requete = supabase
    .from("paiements")
    .select("id, date_paiement, montant_gnf, reference, mode_id, modes_paiement(libelle), pieces_vente(id, numero, clients(nom, code))")
    .gte("date_paiement", du)
    .lte("date_paiement", au)
    .order("date_paiement", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(2000);
  if (mode) requete = requete.eq("mode_id", mode);
  const [resPaiements, resRemboursements, resModes] = await Promise.all([
    requete,
    supabase.from("remboursements_clients").select("montant_gnf").gte("date_remboursement", du).lte("date_remboursement", au),
    supabase.from("modes_paiement").select("id, libelle").order("ordre"),
  ]);
  const tous = exigerDonnees(resPaiements, "les encaissements") ?? [];
  const remboursements = exigerDonnees(resRemboursements, "les remboursements") ?? [];
  const modes = exigerDonnees(resModes, "les modes de paiement") ?? [];

  // Recherche libre sur le numéro de facture, le client ou la référence.
  const paiements = q
    ? tous.filter((p) =>
        [p.pieces_vente?.numero, p.pieces_vente?.clients?.nom, p.pieces_vente?.clients?.code, p.reference].some((t) => (t ?? "").toLowerCase().includes(q)),
      )
    : tous;
  const total = paiements.reduce((s, p) => s + Number(p.montant_gnf), 0);
  const totalRembourse = remboursements.reduce((s, r) => s + Number(r.montant_gnf), 0);
  const parMode = new Map<string, number>();
  for (const p of paiements) parMode.set(p.modes_paiement?.libelle ?? "—", (parMode.get(p.modes_paiement?.libelle ?? "—") ?? 0) + Number(p.montant_gnf));
  const modePrincipal = [...parMode.entries()].sort((a, b) => b[1] - a[1])[0];

  return (
    <>
      <TitrePage fil={[{ libelle: "Ventes", href: "/ventes" }]} titre="Encaissements" sousTitre={`Paiements reçus du ${formaterDate(du)} au ${formaterDate(au)}`} />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Indicateur libelle="Encaissé sur la période" valeur={gnf(total)} detail={`${nombre(paiements.length)} paiement(s)`} />
        <Indicateur libelle="Mode le plus utilisé" valeur={modePrincipal ? modePrincipal[0] : "—"} detail={modePrincipal ? gnf(modePrincipal[1]) : undefined} />
        <Indicateur libelle="Remboursements clients" valeur={gnf(totalRembourse)} detail="Crédits rendus aux clients sur la période" />
      </div>
      <Carte>
        <BarreFiltres
          recherche={lireParam(sp, "q")}
          placeholder="Facture, client ou référence"
          valeurs={{ du, au, mode }}
          filtres={[
            { nom: "du", libelle: "Du", type: "date" },
            { nom: "au", libelle: "Au", type: "date" },
            { nom: "mode", libelle: "Mode", options: modes.map((m) => ({ valeur: m.id, libelle: m.libelle })) },
          ]}
          action={
            <ExportCsv
              nomFichier={`encaissements-${du}-${au}`}
              entetes={["Date", "Facture", "Client", "Code client", "Mode", "Référence", "Montant (GNF)"]}
              lignes={paiements.map((p) => [
                p.date_paiement,
                p.pieces_vente?.numero ?? "",
                p.pieces_vente?.clients?.nom ?? "",
                p.pieces_vente?.clients?.code ?? "",
                p.modes_paiement?.libelle ?? "",
                p.reference,
                Number(p.montant_gnf),
              ])}
            />
          }
        />
        <Tableau entetes={["Date", "Facture", "Client", "Mode", "Référence", "Montant"]}>
          {paiements.map((p) => (
            <tr key={p.id}>
              <Cellule>{formaterDate(p.date_paiement)}</Cellule>
              <Cellule>
                <Link href={`/ventes/pieces/${p.pieces_vente?.id}`} className="font-mono font-semibold text-papel-700 hover:underline">
                  {p.pieces_vente?.numero}
                </Link>
              </Cellule>
              <Cellule>{p.pieces_vente?.clients?.nom}</Cellule>
              <Cellule>{p.modes_paiement?.libelle}</Cellule>
              <Cellule>{p.reference || "—"}</Cellule>
              <Cellule className="font-semibold">{gnf(p.montant_gnf)}</Cellule>
            </tr>
          ))}
        </Tableau>
        {!paiements.length && <p className="py-4 text-gray-700">Aucun paiement reçu sur cette période.</p>}
        <p className="mt-3 text-sm text-gray-700">Un paiement s&apos;enregistre depuis la facture (Ventes → Factures → la facture → « Enregistrer le paiement »).</p>
      </Carte>
    </>
  );
}
