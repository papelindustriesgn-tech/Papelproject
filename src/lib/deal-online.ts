import "server-only";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;
type OnlineAccess = { kind: string | null; contact: string | null; code: string | null };

/**
 * Retire le contact et le code de l'offre à distance de la ligne à enregistrer : ils ne sont jamais stockés dans
 * `deals` (lisible publiquement), mais dans `deal_online_access`, révélé aux seuls étudiants vérifiés.
 */
export function takeOnlineAccess(row: Record<string, unknown>): OnlineAccess {
  const str = (v: unknown) => (typeof v === "string" && v ? v : null);
  const access = {
    kind: str(row.online_contact_kind),
    contact: str(row.online_contact),
    code: row.online_code_mode === "shared" ? str(row.online_code) : null,
  };
  delete row.online_contact_kind;
  delete row.online_contact;
  delete row.online_code;
  return access;
}

/** Enregistre le contact (et le code fixe) d'une offre à distance, ou les supprime pour une offre en magasin. */
export async function syncOnlineAccess(supabase: Supabase, dealId: string, channel: unknown, access: OnlineAccess) {
  if (channel !== "in_store" && access.kind && access.contact) {
    return supabase.from("deal_online_access").upsert({
      deal_id: dealId,
      contact_kind: access.kind,
      contact: access.contact,
      code: access.code,
      updated_at: new Date().toISOString(),
    });
  }
  return supabase.from("deal_online_access").delete().eq("deal_id", dealId);
}

/** Contact et code actuels, pour préremplir le formulaire de la marque ou de l'administration. */
export async function readOnlineAccess(supabase: Supabase, dealId: string) {
  const { data } = await supabase
    .from("deal_online_access")
    .select("contact_kind, contact, code")
    .eq("deal_id", dealId)
    .maybeSingle();
  return {
    online_contact_kind: data?.contact_kind ?? null,
    online_contact: data?.contact ?? null,
    online_code: data?.code ?? null,
  };
}
