import "server-only";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;
type OnlineAccess = { url: string | null; code: string | null };

/**
 * Retire le lien et le code en ligne de la ligne à enregistrer : ils ne sont jamais stockés dans `deals`
 * (lisible publiquement), mais dans `deal_online_access`, révélé aux seuls étudiants vérifiés.
 */
export function takeOnlineAccess(row: Record<string, unknown>): OnlineAccess {
  const str = (v: unknown) => (typeof v === "string" && v ? v : null);
  const access = { url: str(row.online_url), code: row.online_code_mode === "shared" ? str(row.online_code) : null };
  delete row.online_url;
  delete row.online_code;
  return access;
}

/** Enregistre le lien (et le code partagé) d'une offre en ligne, ou les supprime pour une offre en magasin. */
export async function syncOnlineAccess(supabase: Supabase, dealId: string, channel: unknown, access: OnlineAccess) {
  if (channel !== "in_store" && access.url) {
    return supabase
      .from("deal_online_access")
      .upsert({ deal_id: dealId, url: access.url, code: access.code, updated_at: new Date().toISOString() });
  }
  return supabase.from("deal_online_access").delete().eq("deal_id", dealId);
}

/** Lien et code actuels, pour préremplir le formulaire de la marque ou de l'administration. */
export async function readOnlineAccess(supabase: Supabase, dealId: string) {
  const { data } = await supabase.from("deal_online_access").select("url, code").eq("deal_id", dealId).maybeSingle();
  return { online_url: data?.url ?? null, online_code: data?.code ?? null };
}
