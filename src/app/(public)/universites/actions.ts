"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
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
  student_count: z.coerce.number().int().min(0).max(1_000_000).optional(),
  has_api: z.boolean(),
  message: z.string().trim().max(1000).optional(),
});

export async function applyAsUniversity(_prev: FormState, formData: FormData): Promise<FormState> {
  if (String(formData.get("website2") ?? "")) return { ok: true, message: "Merci !" };
  const opt = (k: string) => String(formData.get(k) ?? "").trim() || undefined;
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
    student_count: opt("student_count"),
    has_api: formData.get("has_api") === "on",
    message: opt("message"),
  });
  if (!parsed.success)
    return {
      error: "Vérifie les champs indiqués.",
      fieldErrors: zodFieldErrors(parsed.error.issues),
      values: formValues(formData),
    };
  const d = parsed.data;
  const admin = createAdminClient();
  const { count } = await admin
    .from("university_applications")
    .select("id", { count: "exact", head: true })
    .or(`phone.eq.${d.phone},email.eq.${d.email}`)
    .gte("created_at", new Date(Date.now() - 86400_000).toISOString());
  if ((count ?? 0) >= 3) return { error: "Nous avons déjà reçu votre demande. L'équipe Uny vous recontacte très vite." };

  const { error } = await admin.from("university_applications").insert(d);
  if (error) return { error: "Envoi impossible pour le moment. Réessayez.", values: formValues(formData) };
  await sendEmail({
    to: SUPPORT_EMAIL,
    ...internalEmail(`Université partenaire — ${d.university_name}`, [
      `${d.contact_name}${d.contact_title ? ` (${d.contact_title})` : ""} demande l'ouverture du portail université.`,
      `Établissement : ${d.university_name}`,
      `Contact : ${d.phone} · ${d.email}`,
      `API disponible : ${d.has_api ? "oui" : "non"}`,
      "À traiter dans Admin → Universités.",
    ]),
  });
  return {
    ok: true,
    message: "Demande envoyée ✅ L'équipe Uny vous contacte sous 48 h pour vérifier votre identité et ouvrir le portail.",
  };
}
