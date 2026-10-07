import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { normalizeTemplate, type CardBranding, type CardTemplate } from "@/lib/card-template";

export const UNIVERSITY_COOKIE = "uny_university";

export type UniversitySummary = {
  id: number;
  name: string;
  short_name: string | null;
  slug: string;
  partner_status: string;
  city_id: number | null;
};

/** Établissements dont l'utilisateur connecté est membre du portail. */
export const getMyUniversities = cache(async (): Promise<UniversitySummary[]> => {
  const profile = await getProfile();
  if (!profile) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("university_members")
    .select("university:universities(id, name, short_name, slug, partner_status, city_id)")
    .eq("user_id", profile.id);
  return (data ?? [])
    .map((r) => r.university)
    .filter((u): u is UniversitySummary => !!u && ["pending", "partner"].includes(u.partner_status));
});

/** Portail université : profil + établissement courant (choisi via cookie si plusieurs). */
export async function requireUniversity() {
  const profile = await getProfile();
  if (!profile) redirect("/connexion?next=/universite");
  const universities = await getMyUniversities();
  if (!universities.length) redirect(profile.role === "admin" ? "/admin/universites" : "/accueil");
  const chosen = Number((await cookies()).get(UNIVERSITY_COOKIE)?.value);
  const university = universities.find((u) => u.id === chosen) ?? universities[0];
  return { profile, universities, university };
}

export type UniversityCardConfig = { branding: CardBranding; template: CardTemplate };

/** Identité visuelle + template actif. `preview` : aussi pour un établissement pas encore approuvé. */
export const getUniversityCardConfig = cache(
  async (universityId: number | null, preview = false): Promise<UniversityCardConfig | null> => {
    if (!universityId) return null;
    const supabase = await createClient();
    const [{ data: uni }, { data: branding }, { data: template }] = await Promise.all([
      supabase.from("universities").select("name, partner_status").eq("id", universityId).single(),
      supabase.from("university_branding").select("*").eq("university_id", universityId).maybeSingle(),
      supabase
        .from("university_card_templates")
        .select("layout, fields, labels")
        .eq("university_id", universityId)
        .eq("is_active", true)
        .maybeSingle(),
    ]);
    if (!uni || !branding) return null;
    if (uni.partner_status !== "partner" && !preview) return null;
    return {
      branding: {
        name: branding.official_name || uni.name,
        logoUrl: branding.logo_url,
        primary: branding.primary_color,
        secondary: branding.secondary_color,
        accent: branding.accent_color,
      },
      template: normalizeTemplate(template),
    };
  },
);

export const ENROLLMENT_STATUS: Record<
  "pending" | "verified" | "rejected" | "expired" | "manual_review",
  { label: string; tone: "mango" | "mint" | "coral" | "neutral" | "brand" }
> = {
  pending: { label: "En attente", tone: "mango" },
  manual_review: { label: "À examiner", tone: "brand" },
  verified: { label: "Confirmée", tone: "mint" },
  rejected: { label: "Refusée", tone: "coral" },
  expired: { label: "Expirée", tone: "neutral" },
};

export const VERIFICATION_METHODS: Record<"api" | "import" | "portal" | "document" | "manual", string> = {
  api: "API de l'université",
  import: "Liste importée",
  portal: "Portail université",
  document: "Justificatif",
  manual: "Manuelle (Uny)",
};

/** Administrateur Uny, ou membre du portail de cet établissement. */
export async function canManageUniversity(universityId: number) {
  const profile = await getProfile();
  if (!profile) return null;
  if (profile.role === "admin") return profile;
  return (await getMyUniversities()).some((u) => u.id === universityId) ? profile : null;
}

export const PARTNER_STATUS = {
  listed: { label: "Référencée", tone: "neutral" },
  pending: { label: "En attente", tone: "mango" },
  partner: { label: "Partenaire", tone: "mint" },
  suspended: { label: "Suspendue", tone: "coral" },
} as const;
