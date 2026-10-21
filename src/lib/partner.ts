import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { DealCategory } from "@/lib/constants";

export const PARTNER_COOKIE = "uny_partner";

export type PartnerSummary = {
  id: string;
  name: string;
  category: DealCategory;
  logo_url: string | null;
  city_id: number | null;
  is_active: boolean;
  /** « manager » : responsable (offres, fiche, fidélité, équipe) ; « cashier » : caisse (scanner et valider). */
  role: PartnerRole;
};

export type PartnerRole = "manager" | "cashier";

/** Partenaires dont l'utilisateur connecté est membre (vide pour un étudiant classique). */
export const getMyPartners = cache(async (): Promise<PartnerSummary[]> => {
  const profile = await getProfile();
  if (!profile) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("partner_members")
    .select("role, partner:partners(id, name, category, logo_url, city_id, is_active)")
    .eq("user_id", profile.id);
  return (data ?? [])
    .filter((r) => !!r.partner)
    .map((r) => ({ ...r.partner!, role: r.role === "cashier" ? "cashier" : "manager" }) as PartnerSummary);
});

/**
 * Espace partenaire : profil + partenaire courant (choisi via cookie si plusieurs).
 * `manager: true` : page réservée au responsable ; un caissier est renvoyé vers le scanner.
 */
export async function requirePartner({ manager = false }: { manager?: boolean } = {}) {
  const profile = await getProfile();
  if (!profile) redirect("/connexion?next=/partenaire");
  const partners = await getMyPartners();
  if (!partners.length) redirect(profile.role === "admin" ? "/admin/partenaires" : "/accueil");
  const chosen = (await cookies()).get(PARTNER_COOKIE)?.value;
  const partner = partners.find((p) => p.id === chosen) ?? partners[0];
  if (manager && partner.role !== "manager") redirect("/partenaire/scanner");
  return { profile, partners, partner };
}
