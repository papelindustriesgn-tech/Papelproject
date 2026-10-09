/**
 * Supprime tous les comptes synthétiques du test de charge.
 * Usage : npx tsx --env-file=.env.local scripts/load-test/cleanup.mts
 */
import { createClient } from "@supabase/supabase-js";
import { SERVICE, SUPABASE_URL, pool } from "./common.mts";

const admin = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } });
const ids: string[] = [];
for (let from = 0; ; from += 1000) {
  const { data } = await admin.from("profiles").select("id").eq("is_test_account", true).range(from, from + 999);
  if (!data?.length) break;
  ids.push(...data.map((d) => d.id));
  if (data.length < 1000) break;
}
await pool(ids, 20, (id) => admin.auth.admin.deleteUser(id));
console.log(`🧹 ${ids.length} comptes de test supprimés.`);
