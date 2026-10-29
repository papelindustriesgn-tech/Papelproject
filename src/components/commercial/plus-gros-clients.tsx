import Link from "next/link";
import { ExportCsv } from "@/components/donnees/export-csv";
import { Carte, Cellule, Tableau } from "@/components/ui";
import { PastilleVariation } from "@/components/ui/indicateur";
import { formaterDate } from "@/lib/formulaires/dates";
import type { Classement } from "@/lib/metier/clients";
import { pct } from "@/lib/production/affichage";
import { gnf, gnfCourt, nombre } from "@/lib/stocks/libelles";
import type { VentesClient } from "@/lib/ventes/indicateurs";

/**
 * « Nos plus gros clients » : classement de la période par CA HT (net des avoirs), part du CA en barre,
 * évolution par rapport à la période précédente, encours et impayés échus. Le reste est regroupé en une ligne.
 */
export function PlusGrosClients({
  classement,
  commerciaux,
  soldes,
  du,
  au,
}: {
  classement: Classement<VentesClient>;
  commerciaux: Map<string, string>;
  soldes: Map<string, { encoursGnf: number; echuGnf: number }>;
  du: string;
  au: string;
}) {
  const { premiers, autres, partCinqPremiers } = classement;
  const partMax = Math.max(0.0001, ...premiers.map((p) => p.part));
  return (
    <Carte
      className="mb-4"
      titre={
        <span className="flex flex-col">
          <span>Nos plus gros clients</span>
          {partCinqPremiers !== null && (
            <span className="text-sm font-normal text-gray-600">
              Les 5 premiers font {pct(partCinqPremiers, 0)} du chiffre d&apos;affaires de la période
              {partCinqPremiers > 0.6 ? " : forte dépendance à quelques clients" : ""}
            </span>
          )}
        </span>
      }
      action={
        premiers.length > 0 && (
          <ExportCsv
            nomFichier={`plus-gros-clients-${du}-${au}`}
            entetes={["Rang", "Code", "Client", "Type", "Commercial", "CA HT (GNF)", "Part du CA (%)", "CA période précédente (GNF)", "Paquets", "Factures", "Dernier achat", "Encours (GNF)", "Échu (GNF)"]}
            lignes={premiers.map((p) => [
              p.rang,
              p.client.code,
              p.client.nom,
              p.client.type,
              commerciaux.get(p.client.commercialId ?? "") ?? "",
              p.client.caHtGnf,
              Math.round(p.part * 1000) / 10,
              p.caPrecedentGnf,
              p.client.paquets,
              p.client.nbFactures,
              p.client.dernierAchat ?? "",
              soldes.get(p.client.id)?.encoursGnf ?? 0,
              soldes.get(p.client.id)?.echuGnf ?? 0,
            ])}
          />
        )
      }
    >
      {premiers.length === 0 ? (
        <p className="text-gray-700">Aucune facture sur la période.</p>
      ) : (
        <Tableau entetes={["#", "Client", "Commercial", "Chiffre d'affaires HT", "Évolution", "Paquets", "Dernier achat", "Encours"]}>
          {premiers.map((p) => {
            const solde = soldes.get(p.client.id);
            return (
              <tr key={p.client.id}>
                <Cellule className="font-bold text-gray-500">{p.rang}</Cellule>
                <Cellule>
                  <Link href={`/ventes/clients/${p.client.id}`} className="font-semibold text-papel-700 hover:underline">
                    {p.client.nom}
                  </Link>
                  <span className="block text-xs text-gray-500">
                    {p.client.code}
                    {p.client.type ? ` · ${p.client.type}` : ""}
                  </span>
                </Cellule>
                <Cellule>{commerciaux.get(p.client.commercialId ?? "") ?? "—"}</Cellule>
                <Cellule className="min-w-44">
                  <span className="font-semibold" title={gnf(p.client.caHtGnf)}>
                    {gnfCourt(p.client.caHtGnf)}
                  </span>
                  <span className="ml-1 text-xs text-gray-500">{pct(p.part, 1)}</span>
                  <span className="mt-1 block h-1.5 rounded-full bg-gray-100" aria-hidden>
                    <span className="barre-animee block h-full rounded-full bg-papel-600" style={{ width: `${(p.part / partMax) * 100}%` }} />
                  </span>
                </Cellule>
                <Cellule>{p.evolution === null ? <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800">Nouveau</span> : <PastilleVariation v={{ ecart: p.evolution }} />}</Cellule>
                <Cellule>
                  {nombre(p.client.paquets)}
                  <span className="block text-xs text-gray-500">{nombre(p.client.nbFactures)} facture(s)</span>
                </Cellule>
                <Cellule>{p.client.dernierAchat ? formaterDate(p.client.dernierAchat) : "—"}</Cellule>
                <Cellule>
                  {solde && solde.encoursGnf > 0 ? (
                    <>
                      <span title={gnf(solde.encoursGnf)}>{gnfCourt(solde.encoursGnf)}</span>
                      {solde.echuGnf > 0 && <span className="block text-xs font-semibold text-red-700">dont échu {gnfCourt(solde.echuGnf)}</span>}
                    </>
                  ) : (
                    <span className="text-gray-500">Rien à payer</span>
                  )}
                </Cellule>
              </tr>
            );
          })}
        </Tableau>
      )}
      {autres.nombre > 0 && (
        <p className="mt-3 text-sm text-gray-600">
          + {nombre(autres.nombre)} autre(s) client(s) : {gnfCourt(autres.caHtGnf)} ({pct(autres.part, 0)} du CA).
        </p>
      )}
    </Carte>
  );
}
