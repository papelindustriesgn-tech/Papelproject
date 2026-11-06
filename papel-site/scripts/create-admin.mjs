// Crée (ou promeut) un compte administrateur.
// Usage : npm run admin:create -- prenom.nom@papel-industries.com "Mot de passe solide" "Prénom Nom"
// Nécessite NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env.local.
import { createClient } from "@supabase/supabase-js";

const [email, password, displayName] = process.argv.slice(2);
if (!email || !password) {
  console.error('Usage : npm run admin:create -- email "mot de passe" ["Nom affiché"]');
  process.exit(1);
}
if (password.length < 12) {
  console.error("Mot de passe trop court : 12 caractères minimum.");
  process.exit(1);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

let userId;
const created = await db.auth.admin.createUser({ email, password, email_confirm: true });
if (created.error) {
  // Compte existant : on le retrouve et on met à jour le mot de passe
  const { data, error } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  const existing = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!existing) throw created.error;
  userId = existing.id;
  const upd = await db.auth.admin.updateUserById(userId, { password });
  if (upd.error) throw upd.error;
  console.log("Compte existant : mot de passe mis à jour.");
} else {
  userId = created.data.user.id;
}
const { error } = await db.from("admin_users").upsert({ user_id: userId, role: "admin", display_name: displayName ?? null });
if (error) throw error;
console.log(`Administrateur prêt : ${email}`);
