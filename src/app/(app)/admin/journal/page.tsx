import type { Metadata } from "next";
import Link from "next/link";
import { Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { formaterDateHeure } from "@/lib/formulaires/dates";
import { clientServeur } from "@/lib/supabase/serveur";

export const metadata: Metadata = { title: "Journal d'audit" };

const OPERATIONS: Record<string, string> = { INSERT: "Création", UPDATE: "Modification", DELETE: "Suppression" };
const PAR_PAGE = 50;

/** Champs modifiés entre l'état avant et après (pour une lecture rapide). */
function differences(avantJson: unknown, apresJson: unknown): string {
  const estObjet = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
  if (!estObjet(avantJson) || !estObjet(apresJson)) return "";
  const avant = avantJson;
  const apres = apresJson;
  const ignores = new Set(["updated_at", "created_at"]);
  return Object.keys(apres)
    .filter((k) => !ignores.has(k) && JSON.stringify(avant[k]) !== JSON.stringify(apres[k]))
    .map((k) => `${k} : ${JSON.stringify(avant[k])} → ${JSON.stringify(apres[k])}`)
    .join(" ; ");
}

export default async function PageJournal({ searchParams }: PageProps<"/admin/journal">) {
  const sp = await searchParams;
  const table = typeof sp.table === "string" ? sp.table : "";
  const page = Math.max(1, Number(sp.page) || 1);

  const supabase = await clientServeur();
  let requete = supabase
    .from("journal_audit")
    .select("id, horodatage, utilisateur_id, table_nom, enregistrement_id, operation, avant, apres")
    .order("id", { ascending: false })
    .range((page - 1) * PAR_PAGE, page * PAR_PAGE - 1);
  if (table) requete = requete.eq("table_nom", table);
  const [{ data: lignes }, { data: profils }] = await Promise.all([requete, supabase.from("profils").select("id, identifiant")]);
  const nomUtilisateur = new Map((profils ?? []).map((p) => [p.id, p.identifiant]));

  return (
    <>
      <TitrePage titre="Journal d'audit" sousTitre="Toutes les modifications : qui, quoi, quand. Ce journal ne peut pas être modifié." />
      <Carte>
        <form className="mb-3 flex flex-wrap items-end gap-2">
          <label className="flex flex-col">
            <span className="font-medium">Filtrer par table</span>
            <input name="table" defaultValue={table} placeholder="ex. parametres" className="min-h-11 rounded border border-gray-300 px-3 md:min-h-9" />
          </label>
          <button className="min-h-11 rounded bg-papel-700 px-4 font-medium text-white hover:bg-papel-800 md:min-h-9">Filtrer</button>
        </form>
        <Tableau entetes={["Date", "Utilisateur", "Opération", "Table", "Élément", "Détail"]}>
          {(lignes ?? []).map((l) => (
            <tr key={l.id}>
              <Cellule className="whitespace-nowrap">{formaterDateHeure(l.horodatage)}</Cellule>
              <Cellule>{l.utilisateur_id ? (nomUtilisateur.get(l.utilisateur_id) ?? "—") : "Système"}</Cellule>
              <Cellule>{OPERATIONS[l.operation] ?? l.operation}</Cellule>
              <Cellule className="font-mono text-sm">{l.table_nom}</Cellule>
              <Cellule className="max-w-32 truncate font-mono text-sm">{l.enregistrement_id}</Cellule>
              <Cellule className="max-w-md text-sm break-words">{differences(l.avant, l.apres)}</Cellule>
            </tr>
          ))}
        </Tableau>
        <div className="mt-3 flex gap-3">
          {page > 1 && <Link href={{ query: { table, page: page - 1 } }} className="text-papel-700 underline">← Plus récents</Link>}
          {(lignes?.length ?? 0) === PAR_PAGE && <Link href={{ query: { table, page: page + 1 } }} className="text-papel-700 underline">Plus anciens →</Link>}
        </div>
      </Carte>
    </>
  );
}
