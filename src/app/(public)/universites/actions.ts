"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isValidPhone, normalizePhone } from "@/lib/format";
import { formValues, zodFieldErrors, type FormState } from "@/lib/actions/types";
import { internalEmail, sendEmail } from "@/lib/email";
import { SUPPORT_EMAIL } from "@/lib/constants";

const schema = z.object({
  university_id: z.coerce.number().int().positive().optional(),
  university_name: z.string().trim().min(2, "Nom de l'établissement requis").max(200),
  city_id: z.coerce.number().int().positive().optional(),
  contact_name: z.string().trim().min(2, "Nom requis").max(120),
  contact_title: z.string().trim().max(120).optional(),
  phone: z
    .string()
    .trim()
    .transform((v) => normalizePhone(v))
    .refine(isValidPhone, "Numéro invalide"),
  email: z.email("Email invalide").max(200),
  password: z
    .string()
    .min(8, "8 caractères minimum")
    .max(72)
    .regex(/[A-Za-z]/, "Ajoute au moins une lettre")
    .regex(/\d/, "Ajoute au moins un chiffre"),
  student_count: z.coerce.number().int().min(0).max(1_000_000).optional(),
  has_api: z.boolean(),
  message: z.string().trim().max(1000).optional(),
});

/**
 * Inscription en libre-service d'un établissement : compte « université » + fiche établissement
 * (en attente de vérification par Uny) + accès immédiat au portail. Les fonctions qui touchent aux
 * données des étudiants s'ouvrent après la vérification de l'établissement par l'équipe Uny.
 */
export async function applyAsUniversity(_prev: FormState, formData: FormData): Promise<FormState> {
  if (String(formData.get("website2") ?? "")) return { ok: true, message: "Merci !" };
  const opt = (k: string) => String(formData.get(k) ?? "").trim() || undefined;
  const values = formValues(formData);
  const parsed = schema.safeParse({
    university_id: opt("university_id"),
    university_name: opt("university_name") ?? "",
    city_id: opt("city_id"),
    contact_name: formData.get("contact_name"),
    contact_title: opt("contact_title"),
    phone: formData.get("phone") ?? "",
    email: String(formData.get("email") ?? "")
      .trim()
      .toLowerCase(),
    password: String(formData.get("password") ?? ""),
    student_count: opt("student_count"),
    has_api: formData.get("has_api") === "on",
    message: opt("message"),
  });
  if (!parsed.success) return { error: "Vérifie les champs indiqués.", fieldErrors: zodFieldErrors(parsed.error.issues), values };
  const { password, ...d } = parsed.data;
  const admin = createAdminClient();

  const { count } = await admin
    .from("university_applications")
    .select("id", { count: "exact", head: true })
    .or(`phone.eq.${d.phone},email.eq.${d.email}`)
    .gte("created_at", new Date(Date.now() - 86400_000).toISOString());
  if ((count ?? 0) >= 3) return { error: "Trop de demandes aujourd'hui avec ces coordonnées. Réessayez demain.", values };

  const { data: existingAccount } = await admin.from("profiles").select("id").eq("email", d.email).maybeSingle();
  if (existingAccount)
    return {
      error: "Un compte Uny existe déjà avec cet email. Connectez-vous, ou utilisez l'email officiel de l'établissement.",
      fieldErrors: { email: "Email déjà utilisé" },
      values,
    };

  // Établissement : fiche existante (si personne ne gère encore son portail) ou nouvelle fiche
  let universityId = d.university_id ?? null;
  let alreadyManaged = false;
  if (universityId) {
    const { data: uni } = await admin.from("universities").select("id, partner_status").eq("id", universityId).maybeSingle();
    if (!uni) return { error: "Établissement introuvable.", values };
    const { count: members } = await admin
      .from("university_members")
      .select("user_id", { count: "exact", head: true })
      .eq("university_id", universityId);
    alreadyManaged = (members ?? 0) > 0;
    if (!alreadyManaged && uni.partner_status === "listed")
      await admin.from("universities").update({ partner_status: "pending", contact_email: d.email }).eq("id", universityId);
  } else {
    const { data: uni, error } = await admin
      .from("universities")
      .insert({
        country_code: "GN",
        name: d.university_name,
        city_id: d.city_id ?? null,
        slug: "",
        partner_status: "pending",
        contact_email: d.email,
      })
      .select("id")
      .single();
    if (error || !uni)
      return {
        error: "Cet établissement existe déjà dans la liste : choisissez-le dans le menu.",
        fieldErrors: { university_name: "Déjà dans la liste" },
        values,
      };
    universityId = uni.id;
  }

  // Compte du responsable
  const [first, ...rest] = d.contact_name.split(/\s+/);
  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email: d.email,
    password,
    email_confirm: true,
    user_metadata: { first_name: first, last_name: rest.join(" ") || first, city_id: d.city_id ? String(d.city_id) : "" },
  });
  if (authError || !created.user) {
    console.error("[universite]", authError);
    return { error: "Création du compte impossible pour le moment. Réessayez.", values };
  }
  const userId = created.user.id;
  await admin.from("profiles").update({ role: "university", phone: d.phone }).eq("id", userId);
  await admin.from("student_cards").delete().eq("user_id", userId);
  await admin.from("notifications").delete().eq("user_id", userId);
  // Un établissement déjà géré par quelqu'un : pas d'accès automatique, l'équipe Uny vérifie
  if (!alreadyManaged) await admin.from("university_members").insert({ university_id: universityId, user_id: userId });

  await admin.from("university_applications").insert({ ...d, university_id: universityId });
  const { data: admins } = await admin.from("profiles").select("id").eq("role", "admin");
  if (admins?.length)
    await admin.from("notifications").insert(
      admins.map((a) => ({
        user_id: a.id,
        type: "university_signup",
        title: `Nouvel établissement inscrit : ${d.university_name}`.slice(0, 120),
        body: `${d.contact_name}${d.contact_title ? ` (${d.contact_title})` : ""} · ${d.phone} · ${d.email}. Vérifiez puis approuvez.`,
        link: "/admin/universites",
      })),
    );
  await sendEmail({
    to: SUPPORT_EMAIL,
    ...internalEmail(`Établissement inscrit — ${d.university_name}`, [
      `${d.contact_name}${d.contact_title ? ` (${d.contact_title})` : ""} a créé l'espace de l'établissement.`,
      `Contact : ${d.phone} · ${d.email}`,
      alreadyManaged
        ? "⚠️ L'établissement a déjà un portail : accès en attente de votre décision."
        : "Portail ouvert en attente de vérification.",
      "À vérifier dans Admin → Universités.",
    ]),
  });

  if (alreadyManaged)
    return {
      ok: true,
      message:
        "Compte créé ✅ Cet établissement a déjà un espace sur Uny : l'équipe Uny vérifie votre demande avant de vous donner l'accès.",
    };

  const supabase = await createClient();
  await supabase.auth.signInWithPassword({ email: d.email, password });
  redirect("/universite?bienvenue=1");
}
