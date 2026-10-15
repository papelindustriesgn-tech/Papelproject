import type { NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { backupDownloadUrl } from "@/lib/backup";

export const dynamic = "force-dynamic";

/** Téléchargement d'une sauvegarde (admins uniquement), via un lien signé valable 5 minutes. */
export async function GET(req: NextRequest) {
  const profile = await getProfile();
  if (profile?.role !== "admin") return new Response("Non autorisé", { status: 403 });
  const url = await backupDownloadUrl(req.nextUrl.searchParams.get("f") ?? "");
  if (!url) return new Response("Sauvegarde introuvable", { status: 404 });
  redirect(url);
}
