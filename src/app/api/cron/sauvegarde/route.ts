import type { NextRequest } from "next/server";
import { isAuthorizedCron } from "@/lib/cron/auth";
import { createBackup } from "@/lib/backup";
import { dailyKey, runJob } from "@/lib/ops/jobs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Tâche quotidienne (Vercel Cron) : sauvegarde de la base dans le bucket privé « backups ».
 * Une seule sauvegarde réussie par jour (clé d'idempotence), 3 tentatives au plus, puis échec définitif (alerte).
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req.headers.get("authorization"))) return new Response("Non autorisé", { status: 401 });

  const out = await runJob("sauvegarde", dailyKey("sauvegarde"), () => createBackup());
  if (out.status === "failed") return Response.json({ ok: false }, { status: 500 });
  return Response.json({ ok: true, ...out });
}
