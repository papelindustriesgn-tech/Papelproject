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
  /** Rôle du membre dans le portail (un admin Uny en aperçu a tous les droits). */
  role: UniversityRole;
  /** Ouvert par un admin Uny qui n'est pas membre du portail. */
  preview?: boolean;
};

export type { UniversityRole } from "@/lib/university-roles";
import type { UniversityRole } from "@/lib/university-roles";
export type UniversityAction = "read" | "decide" | "audit" | "announce" | "manage" | "prepare";

export { UNIVERSITY_ROLES } from "@/lib/university-roles";

const ROLE_ACTIONS: Record<UniversityRole, UniversityAction[]> = {
  admin: ["read", "decide", "audit", "announce", "manage", "prepare"],
  validator: ["read", "decide", "audit"],
  viewer: ["read"],
  announcer: ["announce"],
};

/**
 * Même règle que la fonction SQL `university_can` : les données d'étudiants (« read », « decide »,
 * « audit », « announce », « manage ») exigent un établissement approuvé ; « prepare » (fiche, carte)
 * est possible dès l'inscription, pour le rôle administrateur.
 */
export function universityCan(u: UniversitySummary, action: UniversityAction): boolean {
  if (u.preview) return true;
  if (!ROLE_ACTIONS[u.role]?.includes(action)) return false;
  return action === "prepare" ? ["pending", "partner"].includes(u.partner_status) : u.partner_status === "partner";
}

/**
 * Établissements dont l'utilisateur connecté est membre du portail. Un admin Uny peut aussi
 * ouvrir le portail de n'importe quel établissement (aperçu, choisi depuis l'administration).
 */
export const getMyUniversities = cache(async (): Promise<UniversitySummary[]> => {
  const profile = await getProfile();
  if (!profile) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("university_members")
    .select("role, university:universities(id, name, short_name, slug, partner_status, city_id)")
    .eq("user_id", profile.id);
  const mine: UniversitySummary[] = (data ?? [])
    .filter((r) => !!r.university && ["pending", "partner"].includes(r.university.partner_status))
    .map((r) => ({ ...r.university!, role: (r.role as UniversityRole) ?? "viewer" }));
  if (profile.role === "admin") {
    const chosen = Number((await cookies()).get(UNIVERSITY_COOKIE)?.value);
    if (Number.isInteger(chosen) && chosen > 0 && !mine.some((u) => u.id === chosen)) {
      const { data: u } = await supabase
        .from("universities")
        .select("id, name, short_name, slug, partner_status, city_id")
        .eq("id", chosen)
        .maybeSingle();
      if (u) mine.unshift({ ...u, role: "admin", preview: true });
    }
  }
  return mine;
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

/**
 * Identité visuelle + template publié. La carte personnalisée s'affiche dès qu'une carte a été publiée
 * (par l'université ou l'admin Uny), sauf si l'établissement est suspendu. `preview` : toujours.
 */
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
    if (!preview && (!template || uni.partner_status === "suspended")) return null;
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
  "pending" | "verified" | "rejected" | "expired" | "manual_review" | "incomplete",
  { label: string; tone: "mango" | "mint" | "coral" | "neutral" | "brand" }
> = {
  pending: { label: "Soumise", tone: "mango" },
  manual_review: { label: "À vérifier", tone: "brand" },
  incomplete: { label: "À compléter", tone: "neutral" },
  verified: { label: "Validée", tone: "mint" },
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

/** Administrateur Uny, ou administrateur du portail de cet établissement (préparation de l'espace). */
export async function canManageUniversity(universityId: number) {
  const profile = await getProfile();
  if (!profile) return null;
  if (profile.role === "admin") return profile;
  return (await getMyUniversities()).some((u) => u.id === universityId && universityCan(u, "prepare")) ? profile : null;
}

export const PARTNER_STATUS = {
  listed: { label: "Référencée", tone: "neutral" },
  pending: { label: "En attente", tone: "mango" },
  partner: { label: "Partenaire", tone: "mint" },
  suspended: { label: "Suspendue", tone: "coral" },
} as const;

/** Libellés de l'historique des opérations sensibles. */
export const AUDIT_ACTIONS: Record<string, string> = {
  "enrollment.verified": "Inscription validée",
  "enrollment.rejected": "Inscription refusée / carte révoquée",
  "enrollment.expired": "Carte expirée",
  "enrollment.incomplete": "Complément demandé",
  "enrollment.manual_review": "Demande à vérifier",
  "enrollment.pending": "Demande remise en attente",
  "enrollment.submitted": "Nouvelle demande",
  "roster.imported": "Liste importée",
  "roster.deleted": "Liste supprimée",
  "students.exported": "Liste des étudiants exportée",
  "card_template.published": "Carte publiée",
  "connector.verify": "Vérification par API",
  "integration.requested": "Raccordement API demandé",
  "integration.updated": "Connecteur modifié par Uny",
  "integration.tested": "Connecteur testé",
  "member.added": "Membre ajouté",
  "member.role_changed": "Rôle modifié",
  "member.removed": "Membre retiré",
};

/** Correspondance automatique complète (liste importée ou API) : les 4 critères concordent, sans conflit. */
export function isFullMatch(details: unknown) {
  if (!details || typeof details !== "object") return false;
  const d = details as Record<string, unknown>;
  return ["student_number", "last_name", "first_name", "birth_date"].every((k) => d[k] === true) && d.conflict !== true;
}
