"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/constants";
import { isValidPhone, normalizePhone } from "@/lib/format";
import { safeNext } from "@/lib/url";
import { formValues, zodFieldErrors, type FormState } from "@/lib/actions/types";

const passwordSchema = z
  .string()
  .min(8, "8 caractères minimum")
  .max(72, "72 caractères maximum")
  .regex(/[A-Za-z]/, "Ajoute au moins une lettre")
  .regex(/\d/, "Ajoute au moins un chiffre");

const signUpSchema = z
  .object({
    first_name: z.string().trim().min(1, "Indique ton prénom").max(60),
    last_name: z.string().trim().min(1, "Indique ton nom").max(60),
    birth_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide")
      .refine((v) => {
        const age = (Date.now() - new Date(v).getTime()) / (365.25 * 86_400_000);
        return age >= 14 && age <= 80;
      }, "Date de naissance invalide"),
    gender: z.enum(["female", "male", "other", ""]).optional(),
    phone: z
      .string()
      .trim()
      .min(6, "Indique ton numéro")
      .transform((v) => normalizePhone(v))
      .refine(isValidPhone, "Numéro invalide"),
    email: z.string().trim().toLowerCase().email("Email invalide"),
    university_id: z.string().min(1, "Choisis ton établissement"),
    university_other: z.string().trim().max(120).optional(),
    field_of_study: z.string().trim().min(2, "Indique ta filière").max(120),
    study_level: z.string().trim().min(1, "Choisis ton niveau").max(40),
    city_id: z.string().regex(/^\d+$/, "Choisis ta ville"),
    password: passwordSchema,
    terms: z.literal("on", { message: "Accepte les conditions pour continuer" }),
  })
  .refine((d) => d.university_id !== "other" || (d.university_other ?? "").length >= 2, {
    path: ["university_other"],
    message: "Indique le nom de ton établissement",
  });

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Vérifie les champs indiqués.", fieldErrors: zodFieldErrors(parsed.error.issues), values };
  }
  const d = parsed.data;

  // Numéro déjà utilisé ? (message clair plutôt qu'une erreur base de données)
  const admin = createAdminClient();
  const { data: existing } = await admin.from("profiles").select("id").eq("phone", d.phone).maybeSingle();
  if (existing) {
    return { error: "Ce numéro est déjà associé à un compte.", fieldErrors: { phone: "Numéro déjà utilisé" }, values };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: d.email,
    password: d.password,
    options: {
      emailRedirectTo: `${SITE_URL}/auth/confirm?next=/accueil`,
      data: {
        first_name: d.first_name,
        last_name: d.last_name,
        birth_date: d.birth_date,
        gender: d.gender || null,
        phone: d.phone,
        university_id: d.university_id === "other" ? null : d.university_id,
        university_other: d.university_id === "other" ? d.university_other : null,
        field_of_study: d.field_of_study,
        study_level: d.study_level,
        city_id: d.city_id,
      },
    },
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("already") || msg.includes("registered")) {
      return { error: "Un compte existe déjà avec cet email.", fieldErrors: { email: "Email déjà utilisé" }, values };
    }
    if (msg.includes("password")) {
      return { error: "Mot de passe trop faible.", fieldErrors: { password: "Choisis un mot de passe plus solide" }, values };
    }
    console.error("[signUp]", error);
    return { error: "Inscription impossible pour le moment. Réessaie dans un instant.", values };
  }

  // Supabase renvoie un utilisateur sans identité si l'email existe déjà (anti-énumération)
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return { error: "Un compte existe déjà avec cet email.", fieldErrors: { email: "Email déjà utilisé" }, values };
  }

  if (data.session) redirect("/accueil?bienvenue=1");
  redirect(`/inscription/confirmation?email=${encodeURIComponent(d.email)}`);
}

async function resolveEmail(identifier: string) {
  const id = identifier.trim();
  if (id.includes("@")) return id.toLowerCase();
  const phone = normalizePhone(id);
  if (!isValidPhone(phone)) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("email").eq("phone", phone).maybeSingle();
  return data?.email ?? null;
}

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const identifier = String(formData.get("identifier") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? ""));
  const values = { identifier };

  if (!identifier || !password) return { error: "Renseigne ton identifiant et ton mot de passe.", values };

  const email = await resolveEmail(identifier);
  if (!email) return { error: "Identifiants incorrects.", values };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "email_not_confirmed") {
      return {
        error: "Ton email n'est pas encore confirmé. Clique sur le lien reçu par email.",
        values: { ...values, unconfirmed: email },
      };
    }
    if (error.status === 429) return { error: "Trop de tentatives. Patiente quelques minutes.", values };
    return { error: "Identifiants incorrects.", values };
  }
  redirect(next);
}

export async function resendConfirmation(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email.includes("@")) return { error: "Email invalide." };
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${SITE_URL}/auth/confirm?next=/accueil` },
  });
  if (error?.status === 429) return { error: "Patiente une minute avant de redemander un email." };
  return { ok: true, message: "Si un compte en attente existe, un nouvel email vient d'être envoyé." };
}

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const identifier = String(formData.get("identifier") ?? "");
  const email = await resolveEmail(identifier);
  if (email) {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${SITE_URL}/auth/confirm?next=/reinitialiser-mot-de-passe`,
    });
    if (error?.status === 429) return { error: "Patiente une minute avant de redemander un lien.", values: { identifier } };
  }
  // Même réponse que le compte existe ou non (pas d'énumération)
  return {
    ok: true,
    message: "Si un compte correspond, tu vas recevoir un email avec un lien pour choisir un nouveau mot de passe.",
  };
}

export async function updatePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("password_confirm") ?? "");
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) return { fieldErrors: { password: parsed.error.issues[0].message } };
  if (password !== confirm) return { fieldErrors: { password_confirm: "Les mots de passe ne correspondent pas" } };

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "Lien expiré. Refais une demande de réinitialisation." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === "same_password") return { fieldErrors: { password: "Choisis un mot de passe différent de l'ancien" } };
    return { error: "Impossible de mettre à jour le mot de passe." };
  }
  redirect("/accueil?mdp=1");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/connexion?deconnecte=1");
}
