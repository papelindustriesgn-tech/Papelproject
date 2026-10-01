"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { partnerAccessEmail, sendEmail } from "@/lib/email";
import { zodFieldErrors, type FormState } from "@/lib/actions/types";

/** Mot de passe provisoire lisible (lettres + chiffres, sans caractères ambigus). */
function tempPassword() {
  const letters = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const pick = (set: string, n: number) => Array.from({ length: n }, () => set[randomInt(set.length)]).join("");
  return `${pick(letters, 4)}-${pick(digits, 4)}-${pick(letters, 2)}`;
}

const memberSchema = z.object({
  email: z.email("Email invalide").max(200),
  first_name: z.string().trim().min(1, "Prénom requis").max(60),
  last_name: z.string().trim().min(1, "Nom requis").max(60),
});

/**
 * Donne accès à l'espace d'un partenaire. Si l'email correspond déjà à un compte Uny, il est simplement relié ;
 * sinon un compte « partenaire » est créé avec un mot de passe provisoire (affiché une seule fois et envoyé par email).
 */
async function grantAccess(partnerId: string, m: z.infer<typeof memberSchema>, cityId: number | null) {
  const admin = createAdminClient();
  const email = m.email.toLowerCase();
  const { data: partner } = await admin.from("partners").select("name").eq("id", partnerId).single();
  if (!partner) return { error: "Partenaire introuvable." };

  const { data: existing } = await admin.from("profiles").select("id, first_name").eq("email", email).maybeSingle();
  let userId = existing?.id;
  let password: string | null = null;

  if (!userId) {
    password = tempPassword();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: m.first_name, last_name: m.last_name, city_id: cityId ? String(cityId) : "" },
    });
    if (error || !data.user) return { error: `Création du compte impossible : ${error?.message ?? "erreur inconnue"}` };
    userId = data.user.id;
    // Compte professionnel : pas de carte étudiante, pas de notifications « étudiant »
    await admin.from("profiles").update({ role: "partner" }).eq("id", userId);
    await admin.from("student_cards").delete().eq("user_id", userId);
    await admin.from("notifications").delete().eq("user_id", userId);
  }

  const { error } = await admin.from("partner_members").upsert({ partner_id: partnerId, user_id: userId });
  if (error) return { error: "Impossible de relier le compte au partenaire." };

  await sendEmail({
    to: email,
    ...partnerAccessEmail({ firstName: existing?.first_name ?? m.first_name, business: partner.name, email, password }),
  });

  return {
    message: password
      ? `Compte partenaire créé ✅ Identifiant : ${email} · Mot de passe provisoire : ${password} (à transmettre par WhatsApp si l'email n'arrive pas ; il ne sera plus affiché).`
      : `Compte existant relié ✅ ${email} accède maintenant à l'espace partenaire avec son mot de passe habituel.`,
  };
}

export async function grantPartnerAccess(partnerId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  if (!z.uuid().safeParse(partnerId).success) return { error: "Partenaire invalide" };
  const parsed = memberSchema.safeParse({
    email: String(formData.get("email") ?? "").trim(),
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
  });
  if (!parsed.success) return { error: "Vérifie les champs.", fieldErrors: zodFieldErrors(parsed.error.issues) };
  const admin = createAdminClient();
  const { data: partner } = await admin.from("partners").select("city_id").eq("id", partnerId).single();
  const r = await grantAccess(partnerId, parsed.data, partner?.city_id ?? null);
  revalidatePath(`/admin/partenaires/${partnerId}`);
  return "error" in r ? { error: r.error } : { ok: true, message: r.message };
}

export async function removePartnerMember(partnerId: string, userId: string) {
  await requireAdmin();
  if (!z.uuid().safeParse(partnerId).success || !z.uuid().safeParse(userId).success) return;
  await createAdminClient().from("partner_members").delete().eq("partner_id", partnerId).eq("user_id", userId);
  revalidatePath(`/admin/partenaires/${partnerId}`);
}

/** Accepte une demande : crée la fiche partenaire (publiée) et le compte d'accès. */
export async function approvePartnerApplication(applicationId: string): Promise<FormState> {
  await requireAdmin();
  if (!z.uuid().safeParse(applicationId).success) return { error: "Demande invalide" };
  const admin = createAdminClient();
  const { data: app } = await admin.from("partner_applications").select("*").eq("id", applicationId).single();
  if (!app || app.status !== "pending") return { error: "Demande déjà traitée." };

  const { data: partner, error } = await admin
    .from("partners")
    .insert({
      name: app.business_name,
      category: app.category,
      city_id: app.city_id,
      phone: app.phone,
      description: app.offer,
      is_active: true,
      is_demo: false,
    })
    .select("id")
    .single();
  if (error || !partner) return { error: "Création de la fiche impossible." };

  const [first, ...rest] = app.contact_name.trim().split(/\s+/);
  const r = await grantAccess(
    partner.id,
    { email: app.email, first_name: first, last_name: rest.join(" ") || first },
    app.city_id,
  );
  if ("error" in r) return { error: r.error };

  await admin
    .from("partner_applications")
    .update({ status: "approved", partner_id: partner.id, reviewed_at: new Date().toISOString() })
    .eq("id", applicationId);
  // Pas de revalidation ici (même du cache des contenus) : Next.js réafficherait la page et la carte de la demande
  // disparaîtrait avec le mot de passe provisoire. Les contenus sont invalidés quand le partenaire publie.
  return { ok: true, message: r.message };
}

export async function rejectPartnerApplication(applicationId: string) {
  await requireAdmin();
  if (!z.uuid().safeParse(applicationId).success) return;
  await createAdminClient()
    .from("partner_applications")
    .update({ status: "rejected", reviewed_at: new Date().toISOString() })
    .eq("id", applicationId)
    .eq("status", "pending");
  revalidatePath("/admin/demandes-partenaires");
}
