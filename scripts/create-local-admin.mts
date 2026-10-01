/**
 * DÉVELOPPEMENT LOCAL UNIQUEMENT : crée un compte admin confirmé.
 * Usage : npx tsx --env-file=.env.local scripts/create-local-admin.mts [email] [motdepasse]
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
if (!/127\.0\.0\.1|localhost/.test(url)) {
  console.error("Ce script est réservé à l'environnement local. En production, utilise scripts/make-admin.mts.");
  process.exit(1);
}
const email = process.argv[2] ?? "admin@uny.local";
const password = process.argv[3] ?? "AdminUny2026";
const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const { data: city } = await supabase.from("cities").select("id").eq("slug", "conakry").single();
const { data: uni } = await supabase.from("universities").select("id").eq("short_name", "UGANC").single();
const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { first_name: "Admin", last_name: "Uny", phone: "+224600000001", city_id: city?.id, university_id: uni?.id, field_of_study: "Administration", study_level: "Autre" },
});
if (error && !error.message.includes("already")) throw error;
await supabase.from("profiles").update({ role: "admin" }).eq("email", email);
console.log(`✅ Admin local : ${email} / ${password}`, data?.user?.id ?? "(existant)");
