import { createClient } from "@supabase/supabase-js";
import { versCsv } from "@/lib/formulaires/csv";
import { aujourdhui } from "@/lib/formulaires/dates";
import { jeuExcel, lignesOrdonnees } from "@/lib/excel/jeux";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/env";

/**
 * Connexion Excel (Données › À partir du Web) : /api/excel/<jeu>?cle=…&du=AAAA-MM-JJ&au=AAAA-MM-JJ.
 * Sans session : la clé personnelle est vérifiée par la base (fonction exporter_donnees, lecture seule).
 * Réponse CSV « ; » avec BOM, comme les autres exports.
 */
export async function GET(requete: Request, { params }: RouteContext<"/api/excel/[jeu]">) {
  const { jeu: code } = await params;
  const jeu = jeuExcel(code);
  if (!jeu) return new Response("Jeu de données inconnu.", { status: 404 });
  const url = new URL(requete.url);
  const cle = url.searchParams.get("cle") ?? "";
  const dateValide = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
  const au = dateValide(url.searchParams.get("au")) ?? aujourdhui();
  const du = dateValide(url.searchParams.get("du")) ?? `${au.slice(0, 4)}-01-01`;

  const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.rpc("exporter_donnees", { p_cle: cle, p_jeu: jeu.code, p_du: du, p_au: au });
  if (error) {
    const refus = error.code === "28000";
    return new Response(refus ? "Clé Excel inconnue ou révoquée." : "Export impossible pour le moment.", { status: refus ? 401 : 500 });
  }
  const csv = versCsv(jeu.colonnes, lignesOrdonnees(jeu, (data ?? []) as Record<string, unknown>[]));
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `inline; filename="papel-${jeu.code}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
