"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEAL_CATEGORIES } from "@/lib/constants";
import { isValidPhone, normalizePhone } from "@/lib/format";
import { formValues, zodFieldErrors, type FormState } from "@/lib/actions/types";
import { partnerApplicationEmail, sendEmail } from "@/lib/email";
import { SUPPORT_EMAIL } from "@/lib/constants";

const WANTS = ["avantages", "jobs", "logements", "marketplace"] as const;

const schema = z.object({
  business_name: z.string().trim().min(2, "Nom requis").max(120),
  category: z.enum(Object.keys(DEAL_CATEGORIES) as [keyof typeof DEAL_CATEGORIES, ...(keyof typeof DEAL_CATEGORIES)[]], {
    error: "Choisis une catégorie",
  }),
  city_id: z.coerce.number({ error: "Choisis une ville" }).int().positive("Choisis une ville"),
  contact_name: z.string().trim().min(2, "Nom requis").max(120),
  phone: z
    .string()
    .trim()
    .transform((v) => normalizePhone(v))
    .refine(isValidPhone, "Numéro invalide"),
  email: z.email("Email invalide").max(200),
  offer: z.string().trim().max(1000),
  wants: z.array(z.enum(WANTS)).min(1, "Choisis au moins une option"),
});

export async function applyAsPartner(_prev: FormState, formData: FormData): Promise<FormState> {
  // Champ piège invisible : rempli uniquement par les robots
  if (String(formData.get("website2") ?? "")) return { ok: true, message: "Merci !" };
  const parsed = schema.safeParse({
    business_name: formData.get("business_name"),
    category: formData.get("category") || undefined,
    city_id: formData.get("city_id") || undefined,
    contact_name: formData.get("contact_name"),
    phone: formData.get("phone") ?? "",
    email: String(formData.get("email") ?? "")
      .trim()
      .toLowerCase(),
    offer: formData.get("offer") ?? "",
    wants: formData.getAll("wants"),
  });
  if (!parsed.success)
    return {
      error: "Vérifie les champs indiqués.",
      fieldErrors: zodFieldErrors(parsed.error.issues),
      values: formValues(formData),
    };

  const d = parsed.data;
  const admin = createAdminClient();
  const since = new Date(Date.now() - 86400_000).toISOString();
  const { count } = await admin
    .from("partner_applications")
    .select("id", { count: "exact", head: true })
    .or(`phone.eq.${d.phone},email.eq.${d.email}`)
    .gte("created_at", since);
  if ((count ?? 0) >= 3) return { error: "Nous avons déjà reçu ta demande. L'équipe Uny te recontacte très vite." };

  const { error } = await admin.from("partner_applications").insert({ ...d, offer: d.offer || null });
  if (error) return { error: "Envoi impossible pour le moment. Réessaie.", values: formValues(formData) };

  await sendEmail({
    to: SUPPORT_EMAIL,
    ...partnerApplicationEmail({
      business: d.business_name,
      category: DEAL_CATEGORIES[d.category].label,
      contact: d.contact_name,
      phone: d.phone,
      email: d.email,
    }),
  });

  return { ok: true, message: "Demande envoyée ✅ L'équipe Uny te contacte sous 48 h pour activer ton espace partenaire." };
}
