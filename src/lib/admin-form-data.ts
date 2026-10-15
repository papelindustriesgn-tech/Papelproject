import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCities } from "@/lib/cities";

export async function formLookups() {
  const supabase = await createClient();
  const [{ data: partners }, cities] = await Promise.all([
    supabase.from("partners").select("id, name").order("name"),
    getCities(),
  ]);
  return { partners: partners ?? [], cities };
}
