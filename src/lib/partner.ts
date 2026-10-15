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
};

/** Partenaires dont l'utilisateur connecté est membre (vide pour un étudiant classique). */
export const getMyPartners = cache(async (): Promise<PartnerSummary[]> => {
  const profile = await getProfile();
  if (!profile) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("partner_members")
    .select("partner:partners(id, name, category, logo_url, city_id, is_active)")
    .eq("user_id", profile.id);
  return (data ?? []).map((r) => r.partner).filter((p): p is PartnerSummary => !!p);
});

/** Espace partenaire : profil + partenaire courant (choisi via cookie si plusieurs). */
export async function requirePartner() {
  const profile = await getProfile();
  if (!profile) redirect("/connexion?next=/partenaire");
  const partners = await getMyPartners();
  if (!partners.length) redirect(profile.role === "admin" ? "/admin/partenaires" : "/accueil");
  const chosen = (await cookies()).get(PARTNER_COOKIE)?.value;
  const partner = partners.find((p) => p.id === chosen) ?? partners[0];
  return { profile, partners, partner };
}
