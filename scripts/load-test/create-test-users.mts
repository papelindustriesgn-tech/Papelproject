/**
 * Crée N comptes SYNTHÉTIQUES pour le test de charge.
 * Ils sont marqués is_test_account = true (app_metadata, non modifiable par l'utilisateur)
 * et exclus de toutes les statistiques « réelles » du dashboard admin.
 *
 * Usage : npx tsx --env-file=.env.local scripts/load-test/create-test-users.mts 1000
 */
import { createClient } from "@supabase/supabase-js";
import { SERVICE, SUPABASE_URL, TEST_PASSWORD, pool, testEmail } from "./common.mts";

const N = Number(process.argv[2] ?? 1000);
const admin = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } });
const { data: city } = await admin.from("cities").select("id").eq("slug", "conakry").single();
const { data: unis } = await admin.from("universities").select("id").eq("country_code", "GN");
const levels = ["Licence 1", "Licence 2", "Licence 3", "Master 1", "Master 2"];
const fields = ["Droit", "Économie", "Informatique", "Médecine", "Gestion", "Génie civil", "Lettres"];

const t0 = Date.now();
let created = 0,
  existing = 0,
  failed = 0;
await pool(
  Array.from({ length: N }, (_, i) => i + 1),
  20,
  async (i) => {
    const { error } = await admin.auth.admin.createUser({
      email: testEmail(i),
      password: TEST_PASSWORD,
      email_confirm: true,
      app_metadata: { is_test_account: true },
      user_metadata: {
        first_name: `Test${i}`,
        last_name: "Synthetique",
        birth_date: "2003-01-01",
        phone: `+22469${String(i).padStart(7, "0")}`,
        city_id: city?.id,
        university_id: unis?.[i % (unis?.length || 1)]?.id,
        field_of_study: fields[i % fields.length],
        study_level: levels[i % levels.length],
      },
    });
    if (!error) created++;
    else if (/already/i.test(error.message)) existing++;
    else {
      failed++;
      if (failed < 5) console.error(i, error.message);
    }
    if (i % 100 === 0) process.stdout.write(`  ${i}/${N}\n`);
  },
);
const { count } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("is_test_account", true);
console.log(`\n✅ ${created} créés, ${existing} existants, ${failed} échecs en ${((Date.now() - t0) / 1000).toFixed(1)} s`);
console.log(`   Comptes de test en base (is_test_account) : ${count}`);
