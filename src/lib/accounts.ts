import "server-only";
import { randomInt } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/** Mot de passe provisoire lisible (lettres + chiffres, sans caractères ambigus). */
export function tempPassword() {
  const letters = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ";
  const digits = "23456789";
  const pick = (set: string, n: number) => Array.from({ length: n }, () => set[randomInt(set.length)]).join("");
  return `${pick(letters, 4)}-${pick(digits, 4)}-${pick(letters, 2)}`;
}

/**
 * Compte professionnel (partenaire ou université). Si l'email correspond déjà à un compte Uny, il est
 * réutilisé ; sinon il est créé avec un mot de passe provisoire, sans carte étudiante ni notifications.
 */
export async function ensureProAccount(
  m: { email: string; first_name: string; last_name: string },
  role: "partner" | "university",
  cityId: number | null,
): Promise<{ userId: string; password: string | null; firstName: string } | { error: string }> {
  const admin = createAdminClient();
  const email = m.email.toLowerCase();
  const { data: existing } = await admin.from("profiles").select("id, first_name").eq("email", email).maybeSingle();
  if (existing) return { userId: existing.id, password: null, firstName: existing.first_name };

  const password = tempPassword();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: m.first_name, last_name: m.last_name, city_id: cityId ? String(cityId) : "" },
  });
  if (error || !data.user) return { error: `Création du compte impossible : ${error?.message ?? "erreur inconnue"}` };
  const userId = data.user.id;
  await admin.from("profiles").update({ role }).eq("id", userId);
  await admin.from("student_cards").delete().eq("user_id", userId);
  await admin.from("notifications").delete().eq("user_id", userId);
  return { userId, password, firstName: m.first_name };
}
