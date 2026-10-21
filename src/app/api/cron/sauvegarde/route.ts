import type { NextRequest } from "next/server";
import { isAuthorizedCron } from "@/lib/cron/auth";
import { createBackup } from "@/lib/backup";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Tâche quotidienne (Vercel Cron) : sauvegarde de la base dans le bucket privé « backups ». */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req.headers.get("authorization"))) return new Response("Non autorisé", { status: 401 });

  try {
    return Response.json({ ok: true, ...(await createBackup()) });
  } catch (e) {
    console.error("[sauvegarde]", e);
    return Response.json({ ok: false }, { status: 500 });
  }
}
