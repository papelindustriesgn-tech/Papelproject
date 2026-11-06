import type { SupabaseClient } from "@supabase/supabase-js";
import { ACTIVITY_VALUES } from "@/lib/validation";
import { LEAD_STATUSES } from "@/lib/labels";

export type LeadFilters = { q?: string; statut?: string; activite?: string; type?: string };

export function readLeadFilters(sp: Record<string, string | string[] | undefined>): LeadFilters {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  return { q: one("q")?.slice(0, 80), statut: one("statut"), activite: one("activite"), type: one("type") };
}

/** Requête prospects avec recherche et filtres (listes blanches, texte nettoyé pour la syntaxe PostgREST). */
export function leadsQuery(supabase: SupabaseClient, f: LeadFilters, columns = "*") {
  let q = supabase.from("leads").select(columns, { count: "exact" });
  if (f.statut && (LEAD_STATUSES as string[]).includes(f.statut)) q = q.eq("status", f.statut);
  if (f.activite && (ACTIVITY_VALUES as readonly string[]).includes(f.activite)) q = q.eq("activity_type", f.activite);
  if (f.type && ["partenariat", "devis", "information"].includes(f.type)) q = q.eq("request_type", f.type);
  const term = f.q?.replace(/[,()*%\\:."']/g, " ").trim();
  if (term) {
    const like = `%${term}%`;
    q = q.or(["full_name", "company", "city", "whatsapp", "email"].map((c) => `${c}.ilike.${like}`).join(","));
  }
  return q;
}
