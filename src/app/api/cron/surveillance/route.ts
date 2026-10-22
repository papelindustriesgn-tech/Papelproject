import type { NextRequest } from "next/server";
import { isAuthorizedCron } from "@/lib/cron/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Tâche quotidienne (Vercel Cron) : évalue les règles de surveillance déterministes (ops_run_checks).
 * Les alertes sont dédupliquées en base ; aucune notification n'est envoyée aux utilisateurs.
 * Pas d'idempotence quotidienne ici : une évaluation supplémentaire ne crée pas de doublon.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req.headers.get("authorization"))) return new Response("Non autorisé", { status: 401 });
  const { data, error } = await createAdminClient().rpc("ops_run_checks");
  if (error) {
    console.error("[surveillance] évaluation impossible");
    return Response.json({ ok: false }, { status: 500 });
  }
  return Response.json({ ok: true, ...(data as Record<string, unknown>) });
}
