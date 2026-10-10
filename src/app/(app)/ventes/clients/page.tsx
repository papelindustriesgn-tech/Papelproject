import type { Metadata } from "next";
import Link from "next/link";
import { ExportCsv } from "@/components/donnees/export-csv";
import { BarreFiltres, lireParam, motifRecherche } from "@/components/donnees/filtres";
import { Badge, Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { gnf } from "@/lib/stocks/libelles";
import { clientServeur } from "@/lib/supabase/serveur";

export const metadata: Metadata = { title: "Clients" };

export default async function PageClients({ searchParams }: PageProps<"/ventes/clients">) {
  const sp = await searchParams;
  const q = lireParam(sp, "q");
  const type = lireParam(sp, "type");
  const archives = lireParam(sp, "archives") === "1";
  const supabase = await clientServeur();
  let requete = supabase.from("clients").select("id, code, nom, telephone, condition_paiement, plafond_credit_gnf, actif, types_clients(libelle), quartiers(nom), profils!clients_commercial_id_fkey(prenom, nom)").order("nom").limit(500);
  if (q) requete = requete.or(`nom.ilike.${motifRecherche(q)},code.ilike.${motifRecherche(q)},telephone.ilike.${motifRecherche(q)}`);
  if (type) requete = requete.eq("type_client_id", type);
  if (!archives) requete = requete.eq("actif", true);
  const [{ data }, { data: types }, { data: soldes }] = await Promise.all([
    requete,
    supabase.from("types_clients").select("id, libelle").order("ordre"),
    supabase.from("soldes_clients").select("client_id, encours_gnf, echu_gnf"),
  ]);
  const solde = new Map((soldes ?? []).map((s) => [s.client_id, s]));
  const clients = data ?? [];

  return (
    <>
      <TitrePage
        titre="Clients"
        action={
          <Link href="/ventes/clients/nouveau" className="min-h-11 inline-flex items-center rounded bg-papel-700 px-4 font-medium text-white hover:bg-papel-800 md:min-h-9">
            + Nouveau client
          </Link>
        }
      />
      <Carte>
        <BarreFiltres
          recherche={q}
          placeholder="Nom, code ou téléphone"
          valeurs={{ type, archives: archives ? "1" : undefined }}
          filtres={[
            { nom: "type", libelle: "Type", options: (types ?? []).map((t) => ({ valeur: t.id, libelle: t.libelle })) },
            { nom: "archives", libelle: "Archivés", options: [{ valeur: "1", libelle: "Afficher aussi" }] },
          ]}
          action={
            <ExportCsv
              nomFichier="clients"
              entetes={["Code", "Nom", "Type", "Téléphone", "Quartier", "Commercial", "Condition", "Plafond (GNF)", "Encours (GNF)", "Échu (GNF)"]}
              lignes={clients.map((c) => [c.code, c.nom, c.types_clients?.libelle, c.telephone, c.quartiers?.nom ?? "", c.profils ? `${c.profils.prenom} ${c.profils.nom}` : "", c.condition_paiement, c.plafond_credit_gnf, solde.get(c.id)?.encours_gnf ?? 0, solde.get(c.id)?.echu_gnf ?? 0])}
            />
          }
        />
        <Tableau entetes={["Client", "Type", "Téléphone", "Commercial", "Encours", "Échu"]}>
          {clients.map((c) => {
            const s = solde.get(c.id);
            return (
              <tr key={c.id} className={c.actif ? "" : "opacity-60"}>
                <Cellule>
                  <Link href={`/ventes/clients/${c.id}`} className="font-medium text-papel-700 hover:underline">
                    {c.nom}
                  </Link>
                  <span className="block font-mono text-sm text-gray-600">{c.code}</span>
                </Cellule>
                <Cellule>
                  {c.types_clients?.libelle} {c.condition_paiement === "credit" && <Badge ton="info">Crédit</Badge>}
                </Cellule>
                <Cellule>{c.telephone}</Cellule>
                <Cellule>{c.profils ? `${c.profils.prenom} ${c.profils.nom}` : "—"}</Cellule>
                <Cellule>{gnf(s?.encours_gnf ?? 0)}</Cellule>
                <Cellule className={(s?.echu_gnf ?? 0) > 0 ? "font-bold text-red-700" : ""}>{gnf(s?.echu_gnf ?? 0)}</Cellule>
              </tr>
            );
          })}
        </Tableau>
        {!clients.length && <p className="py-4 text-gray-700">Aucun client.</p>}
      </Carte>
    </>
  );
}
