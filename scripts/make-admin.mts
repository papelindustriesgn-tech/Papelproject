/**
 * Donne le rôle administrateur à un compte existant.
 * Usage : npx tsx --env-file=.env.local scripts/make-admin.mts email@exemple.com
 */
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2]?.toLowerCase();
if (!email) {
  console.error("Usage : npx tsx --env-file=.env.local scripts/make-admin.mts <email>");
  process.exit(1);
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const { data, error } = await supabase.from("profiles").update({ role: "admin" }).eq("email", email).select("id, first_name, last_name, uny_id");
if (error) throw error;
if (!data?.length) {
  console.error(`Aucun compte trouvé pour ${email}. L'utilisateur doit d'abord s'inscrire.`);
  process.exit(1);
}
console.log(`✅ ${data[0].first_name} ${data[0].last_name} (${data[0].uny_id}) est maintenant administrateur.`);
