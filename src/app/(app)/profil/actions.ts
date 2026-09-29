"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/constants";
import { isValidPhone, normalizePhone } from "@/lib/format";
import { formValues, zodFieldErrors, type FormState } from "@/lib/actions/types";
import { createAdminClient } from "@/lib/supabase/admin";

const profileSchema = z.object({
  first_name: z.string().trim().min(1, "Prénom requis").max(60),
  last_name: z.string().trim().min(1, "Nom requis").max(60),
  birth_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide")
    .or(z.literal("")),
  gender: z.enum(["female", "male", "other", ""]),
  phone: z
    .string()
    .trim()
    .transform((v) => normalizePhone(v))
    .refine(isValidPhone, "Numéro invalide"),
  university_id: z.string(),
  university_other: z.string().trim().max(120).optional(),
  field_of_study: z.string().trim().min(2, "Filière requise").max(120),
  study_level: z.string().trim().min(1).max(40),
  city_id: z.string().regex(/^\d+$/),
});

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Vérifie les champs indiqués.", fieldErrors: zodFieldErrors(parsed.error.issues), values };
  const d = parsed.data;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Session expirée." };

  const { data: current } = await supabase.from("profiles").select("verification_status, phone").eq("id", auth.user.id).single();
  if (d.phone !== current?.phone) {
    const { data: taken } = await createAdminClient()
      .from("profiles")
      .select("id")
      .eq("phone", d.phone)
      .neq("id", auth.user.id)
      .maybeSingle();
    if (taken) return { error: "Ce numéro est déjà utilisé.", fieldErrors: { phone: "Numéro déjà utilisé" }, values };
  }

  const base = {
    gender: d.gender || null,
    phone: d.phone,
    field_of_study: d.field_of_study,
    study_level: d.study_level,
    city_id: Number(d.city_id),
  };
  // Une fois vérifié, l'identité (nom, date de naissance, établissement) est verrouillée
  const identity =
    current?.verification_status === "verified"
      ? {}
      : {
          first_name: d.first_name,
          last_name: d.last_name,
          birth_date: d.birth_date || null,
          university_id: d.university_id && d.university_id !== "other" ? Number(d.university_id) : null,
          university_other: d.university_id === "other" ? d.university_other || null : null,
        };

  const { error } = await supabase
    .from("profiles")
    .update({ ...base, ...identity })
    .eq("id", auth.user.id);
  if (error) return { error: error.message.includes("verrouillée") ? error.message : "Enregistrement impossible.", values };
  revalidatePath("/", "layout");
  return { ok: true, message: "Profil mis à jour ✅" };
}

export async function setAvatar(url: string | null) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false };
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${auth.user.id}/`;
  if (url !== null && !url.startsWith(base)) return { ok: false };
  const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", auth.user.id);
  revalidatePath("/", "layout");
  return { ok: !error };
}

const verificationSchema = z.object({
  document_type: z.enum(["student_card", "enrollment_certificate", "registration_certificate", "other"], {
    message: "Choisis le type de document",
  }),
  document_path: z.string().min(5, "Ajoute ton justificatif"),
  note: z.string().trim().max(500).optional(),
});

export async function submitVerification(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = verificationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message, fieldErrors: zodFieldErrors(parsed.error.issues) };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Session expirée." };
  if (!parsed.data.document_path.startsWith(`${auth.user.id}/`)) return { error: "Document invalide." };

  const { error } = await supabase.from("student_verifications").insert({
    user_id: auth.user.id,
    document_type: parsed.data.document_type,
    document_path: parsed.data.document_path,
    note: parsed.data.note || null,
  });
  if (error) {
    if (error.code === "23505") return { error: "Une demande est déjà en cours d'examen." };
    return { error: "Envoi impossible, réessaie." };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Justificatif envoyé ! Nous le vérifions au plus vite." };
}

export async function updateNotificationPrefs(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Session expirée." };
  const { error } = await supabase
    .from("profiles")
    .update({
      notify_email: formData.get("notify_email") === "on",
      notify_deals: formData.get("notify_deals") === "on",
      notify_jobs: formData.get("notify_jobs") === "on",
    })
    .eq("id", auth.user.id);
  if (error) return { error: "Enregistrement impossible." };
  return { ok: true, message: "Préférences enregistrées ✅" };
}

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const current = String(formData.get("current_password") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("password_confirm") ?? "");
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password))
    return { fieldErrors: { password: "8 caractères minimum, avec lettres et chiffres" } };
  if (password !== confirm) return { fieldErrors: { password_confirm: "Les mots de passe ne correspondent pas" } };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user?.email) return { error: "Session expirée." };
  const { error: signErr } = await supabase.auth.signInWithPassword({ email: auth.user.email, password: current });
  if (signErr) return { fieldErrors: { current_password: "Mot de passe actuel incorrect" } };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.code === "same_password" ? "Choisis un mot de passe différent." : "Modification impossible." };
  return { ok: true, message: "Mot de passe modifié ✅" };
}

export async function changeEmail(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = z.email().safeParse(
    String(formData.get("email") ?? "")
      .trim()
      .toLowerCase(),
  );
  if (!email.success) return { fieldErrors: { email: "Email invalide" } };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser(
    { email: email.data },
    { emailRedirectTo: `${SITE_URL}/auth/confirm?next=/profil/securite` },
  );
  if (error)
    return {
      error: error.status === 429 ? "Patiente un peu avant de réessayer." : "Changement impossible (email déjà utilisé ?).",
    };
  return { ok: true, message: "Un email de confirmation a été envoyé à ta nouvelle adresse (et à l'ancienne)." };
}

export async function signOutEverywhere() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/connexion?deconnecte=1");
}
