import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"] & {
  university: { name: string; short_name: string | null } | null;
  city: { name: string } | null;
};

/** Utilisateur authentifié (vérifié auprès de Supabase Auth), mis en cache pour la requête. */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
});

/**
 * Identifiant de l'utilisateur à partir du JWT vérifié (getClaims) : avec les clés
 * asymétriques de Supabase, la vérification est locale — pas d'aller-retour réseau
 * à chaque page. Les actions sensibles (Server Actions) utilisent getUser().
 */
export const getUserId = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return (data?.claims?.sub as string | undefined) ?? null;
});

export const getProfile = cache(async (): Promise<Profile | null> => {
  const userId = await getUserId();
  if (!userId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*, university:universities!profiles_university_id_fkey(name, short_name), city:cities(name)")
    .eq("id", userId)
    .single();
  return (data as Profile | null) ?? null;
});

export async function requireProfile() {
  const profile = await getProfile();
  if (!profile) redirect("/connexion");
  return profile;
}

export async function requireAdmin() {
  const profile = await getProfile();
  if (!profile) redirect("/connexion?next=/admin");
  if (profile.role !== "admin") redirect("/accueil");
  return profile;
}

export function universityLabel(p: Pick<Profile, "university" | "university_other">) {
  return p.university?.name ?? p.university_other ?? "Établissement non renseigné";
}
