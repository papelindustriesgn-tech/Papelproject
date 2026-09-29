import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function formLookups() {
  const supabase = await createClient();
  const [{ data: partners }, { data: city }] = await Promise.all([
    supabase.from("partners").select("id, name").order("name"),
    supabase.from("cities").select("districts").eq("slug", "conakry").single(),
  ]);
  return { partners: partners ?? [], districts: city?.districts ?? [] };
}
