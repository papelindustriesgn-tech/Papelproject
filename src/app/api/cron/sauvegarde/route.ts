import type { NextRequest } from "next/server";
import { createBackup } from "@/lib/backup";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Tâche quotidienne (Vercel Cron) : sauvegarde de la base dans le bucket privé « backups ». */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authorized = secret
    ? req.headers.get("authorization") === `Bearer ${secret}`
    : (req.headers.get("user-agent") ?? "").startsWith("vercel-cron/");
  if (!authorized) return new Response("Non autorisé", { status: 401 });

  try {
    return Response.json({ ok: true, ...(await createBackup()) });
  } catch (e) {
    console.error("[sauvegarde]", e);
    return Response.json({ ok: false }, { status: 500 });
  }
}
