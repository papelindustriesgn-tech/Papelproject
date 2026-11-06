import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Empreinte non réversible de l'adresse IP (aucune IP stockée en clair). */
export async function ipHash() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "inconnue";
  return createHash("sha256")
    .update(`${process.env.FORM_IP_SALT ?? "papel"}:${ip}`)
    .digest("hex")
    .slice(0, 32);
}

/** Vrai si cette empreinte a déjà envoyé `max` demandes dans la fenêtre donnée. */
export async function isRateLimited(
  db: SupabaseClient,
  table: "leads" | "contact_messages",
  hash: string,
  max = Number(process.env.FORM_RATE_LIMIT_MAX) || 5,
  minutes = 30,
) {
  const since = new Date(Date.now() - minutes * 60_000).toISOString();
  const { count, error } = await db
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", hash)
    .gte("created_at", since);
  if (error) return false;
  return (count ?? 0) >= max;
}
