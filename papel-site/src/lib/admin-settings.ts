import "server-only";
import { DEFAULT_COMPANY, DEFAULT_HOME } from "@/content/defaults";
import type { requireAdmin } from "@/lib/admin";
import type { CompanySettings, HomeSettings } from "@/lib/types";

type Db = Awaited<ReturnType<typeof requireAdmin>>["supabase"];

export async function readSettings(supabase: Db) {
  const { data } = await supabase.from("site_settings").select("key, value, updated_at");
  const map = new Map((data ?? []).map((r) => [r.key as string, r]));
  return {
    company: { ...DEFAULT_COMPANY, ...(map.get("company")?.value ?? {}) } as CompanySettings,
    home: { ...DEFAULT_HOME, ...(map.get("home")?.value ?? {}) } as HomeSettings,
    companyVersion: (map.get("company")?.updated_at as string | undefined) ?? "0",
    homeVersion: (map.get("home")?.updated_at as string | undefined) ?? "0",
  };
}
