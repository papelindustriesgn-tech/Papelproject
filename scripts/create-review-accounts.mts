/**
 * Comptes de démonstration pour les équipes de revue Apple et Google (données fictives).
 *   - un étudiant vérifié, avec une carte active ;
 *   - un caissier du partenaire de démonstration « Burger Corner », avec une offre de démonstration.
 * Les comptes sont marqués is_test_account (exclus des statistiques) et les mots de passe ne sont
 * jamais écrits dans le dépôt : ils sont passés en variables d'environnement.
 *
 *   REVIEW_STUDENT_PASSWORD=… REVIEW_PARTNER_PASSWORD=… \
 *     npx tsx --env-file=.env.production.local scripts/create-review-accounts.mts
 *
 * À lancer seulement avec l'accord du responsable du projet (crée deux comptes dans la base visée).
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const studentPassword = process.env.REVIEW_STUDENT_PASSWORD ?? "";
const partnerPassword = process.env.REVIEW_PARTNER_PASSWORD ?? "";
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.");
if (studentPassword.length < 12 || partnerPassword.length < 12)
  throw new Error("REVIEW_STUDENT_PASSWORD et REVIEW_PARTNER_PASSWORD (12 caractères minimum) sont requis.");

const db = createClient(url, key, { auth: { persistSession: false } });
const DEMO_PARTNER = "d0000000-0000-4000-8000-000000000003"; // Burger Corner (démo)

async function account(email: string, password: string, first: string, last: string) {
  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { is_test_account: true },
    user_metadata: { first_name: first, last_name: last, field_of_study: "Informatique", study_level: "Licence 3" },
  });
  if (error && !/already/i.test(error.message)) throw error;
  const { data: p } = await db.from("profiles").select("id").eq("email", email).single();
  if (!data?.user) await db.auth.admin.updateUserById(p!.id, { password });
  return p!.id as string;
}

const student = await account("revue.etudiant@unyafrica.com", studentPassword, "Revue", "Étudiant");
await db
  .from("profiles")
  .update({
    account_status: "approved",
    verification_status: "verified",
    verified_at: new Date().toISOString(),
    phone: "+224600000099",
    birth_date: "2004-01-15",
    is_test_account: true,
  })
  .eq("id", student);
await db.from("student_cards").update({ status: "active" }).eq("user_id", student);

const cashier = await account("revue.partenaire@unyafrica.com", partnerPassword, "Revue", "Caissier");
await db.from("profiles").update({ role: "partner", account_status: "approved", is_test_account: true }).eq("id", cashier);
await db.from("partner_members").upsert({ partner_id: DEMO_PARTNER, user_id: cashier, role: "cashier" });

const { data: card } = await db.from("student_cards").select("uny_id").eq("user_id", student).single();
console.log("✅ Comptes de revue prêts");
console.log(`   Étudiant  : revue.etudiant@unyafrica.com (carte ${card?.uny_id})`);
console.log("   Caissier  : revue.partenaire@unyafrica.com (Burger Corner, démonstration)");
console.log("   Mots de passe : ceux passés en variables d'environnement (à saisir dans App Store Connect / Play Console).");
