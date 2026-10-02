import type { Metadata } from "next";
import Link from "next/link";
import { ExportCsv } from "@/components/donnees/export-csv";
import { BarreFiltres, lireParam, motifRecherche } from "@/components/donnees/filtres";
import { FormulaireNc } from "@/components/qualite/formulaire-nc";
import { optionsNc } from "@/components/qualite/signaler-nc";
import { Badge, Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { formaterDate } from "@/lib/formulaires/dates";
import { GRAVITES_NC, ORIGINES_NC, STATUTS_NC } from "@/lib/qualite/libelles";
import { clientServeur } from "@/lib/supabase/serveur";

export const metadata: Metadata = { title: "Non-conformités" };

const options = (r: Record<string, string | { libelle: string }>) => Object.entries(r).map(([valeur, v]) => ({ valeur, libelle: typeof v === "string" ? v : v.libelle }));

export default async function PageNonConformites({ searchParams }: PageProps<"/qualite/non-conformites">) {
  const sp = await searchParams;
  const q = lireParam(sp, "q");
  const statut = lireParam(sp, "statut");
  const origine = lireParam(sp, "origine");
  const gravite = lireParam(sp, "gravite");
  const supabase = await clientServeur();
  let requete = supabase
    .from("non_conformites")
    .select("*, types_non_conformite(libelle), lots(numero_lot), fiches_production(code_lot), clients(nom), actions_correctives(id, realisee_le)")
    .order("date_constat", { ascending: false })
    .order("numero", { ascending: false })
    .limit(300);
  if (q) requete = requete.or(`numero.ilike.${motifRecherche(q)},description.ilike.${motifRecherche(q)}`);
  if (statut) requete = requete.eq("statut", statut);
  if (origine) requete = requete.eq("origine", origine);
  if (gravite) requete = requete.eq("gravite", gravite);
  const [{ data }, opts] = await Promise.all([requete, optionsNc()]);
  const lignes = data ?? [];
  return (
    <>
      <TitrePage titre="Non-conformités" />
      <Carte titre="Déclarer une non-conformité" className="mb-4">
        <FormulaireNc espace="qualite" origine="interne" {...opts} />
      </Carte>
      <Carte>
        <BarreFiltres
          recherche={q}
          placeholder="Numéro ou description"
          valeurs={{ statut, origine, gravite }}
          filtres={[
            { nom: "statut", libelle: "Statut", options: options(STATUTS_NC) },
            { nom: "origine", libelle: "Origine", options: options(ORIGINES_NC) },
            { nom: "gravite", libelle: "Gravité", options: options(GRAVITES_NC) },
          ]}
          action={
            <ExportCsv
              nomFichier="non-conformites"
              entetes={["Numéro", "Date", "Origine", "Type", "Gravité", "Description", "Bobine", "Lot PF", "Client", "Cause racine", "Actions", "Statut", "Clôturée le"]}
              lignes={lignes.map((n) => [n.numero, n.date_constat, ORIGINES_NC[n.origine], n.types_non_conformite?.libelle ?? "", GRAVITES_NC[n.gravite].libelle, n.description, n.lots?.numero_lot ?? "", n.fiches_production?.code_lot ?? "", n.clients?.nom ?? "", n.cause_racine, n.actions_correctives.length, STATUTS_NC[n.statut].libelle, n.cloturee_le ? n.cloturee_le.slice(0, 10) : ""])}
            />
          }
        />
        <Tableau entetes={["Numéro", "Date", "Origine", "Gravité", "Description", "Actions", "Statut"]}>
          {lignes.map((n) => (
            <tr key={n.id}>
              <Cellule>
                <Link href={`/qualite/non-conformites/${n.id}`} className="font-mono font-semibold text-papel-800 underline">{n.numero}</Link>
              </Cellule>
              <Cellule className="whitespace-nowrap">{formaterDate(n.date_constat)}</Cellule>
              <Cellule>{ORIGINES_NC[n.origine]}</Cellule>
              <Cellule><Badge ton={GRAVITES_NC[n.gravite].ton}>{GRAVITES_NC[n.gravite].libelle}</Badge></Cellule>
              <Cellule className="text-sm">{n.description}</Cellule>
              <Cellule>{n.actions_correctives.filter((a) => a.realisee_le).length} / {n.actions_correctives.length}</Cellule>
              <Cellule><Badge ton={STATUTS_NC[n.statut].ton}>{STATUTS_NC[n.statut].libelle}</Badge></Cellule>
            </tr>
          ))}
        </Tableau>
      </Carte>
    </>
  );
}
