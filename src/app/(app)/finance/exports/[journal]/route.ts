import { exigerEspace } from "@/lib/auth/session";
import { schemaDateIso } from "@/lib/formulaires/dates";
import { versCsv } from "@/lib/formulaires/csv";
import { chargerEcritures, JOURNAUX, type CodeJournal } from "@/lib/finance/exports";
import { ENTETES_EXPORT, lignesExport, piecesDesequilibrees } from "@/lib/metier/comptabilite";

/** Téléchargement d'un journal comptable au format CSV (« ; », BOM UTF-8) : /finance/exports/ventes?du=…&au=… */
export async function GET(requete: Request, ctx: RouteContext<"/finance/exports/[journal]">) {
  await exigerEspace("finance");
  const { journal } = await ctx.params;
  const url = new URL(requete.url);
  const du = url.searchParams.get("du") ?? "";
  const au = url.searchParams.get("au") ?? "";
  if (!(journal in JOURNAUX) || !schemaDateIso.test(du) || !schemaDateIso.test(au) || du > au) {
    return new Response("Journal ou période invalide.", { status: 400 });
  }
  const ecritures = await chargerEcritures(journal as CodeJournal, du, au);
  // Garde-fou : une pièce déséquilibrée signale une incohérence de données — on refuse d'exporter.
  const erreurs = piecesDesequilibrees(ecritures);
  if (erreurs.length) return new Response(`Pièces déséquilibrées : ${erreurs.join(", ")}`, { status: 500 });
  const nom = `${JOURNAUX[journal as CodeJournal].code}_${du}_${au}.csv`;
  return new Response(versCsv(ENTETES_EXPORT, lignesExport(ecritures)), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${nom}"`, "Cache-Control": "no-store" },
  });
}
