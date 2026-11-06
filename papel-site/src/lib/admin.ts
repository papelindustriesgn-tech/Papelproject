import "server-only";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/env";
import { createSessionClient } from "@/lib/supabase/server";

/**
 * Vérifie la session ET l'appartenance à admin_users (contrôle d'autorité,
 * le proxy ne fait qu'une redirection optimiste). À appeler dans chaque page
 * et chaque Server Action de l'administration.
 */
export async function requireAdmin() {
  if (!isSupabaseConfigured()) redirect("/admin/connexion?erreur=config");
  const supabase = await createSessionClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/admin/connexion");
  const { data: admin } = await supabase.from("admin_users").select("role, display_name").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/admin/connexion?erreur=acces");
  return { supabase, userId, role: admin.role as "admin" | "editor", email: (claims?.claims?.email as string | undefined) ?? "" };
}

/** Invalide le cache des pages publiques après une modification de contenu. */
export function refreshPublicSite() {
  revalidatePath("/", "layout");
}

export type ActionState = { ok?: boolean; message?: string; errors?: Record<string, string> } | undefined;

export function zodErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const i of issues) out[String(i.path[0] ?? "form")] ??= i.message;
  return out;
}

/** Envoie des images vers le stockage « media » (droits admin vérifiés par RLS). */
export async function uploadImages(
  supabase: Awaited<ReturnType<typeof createSessionClient>>,
  files: File[],
  folder: string,
): Promise<{ urls: string[]; error?: string }> {
  const urls: string[] = [];
  const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
  for (const file of files) {
    if (!file || file.size === 0) continue;
    if (!allowed.has(file.type)) return { urls, error: `Format non accepté : ${file.name} (JPG, PNG, WebP ou AVIF)` };
    if (file.size > 5 * 1024 * 1024) return { urls, error: `Image trop lourde : ${file.name} (5 Mo maximum)` };
    const ext = file.type.split("/")[1].replace("jpeg", "jpg");
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("media")
      .upload(path, file, { contentType: file.type, cacheControl: "31536000" });
    if (error) return { urls, error: `Envoi impossible : ${error.message}` };
    urls.push(supabase.storage.from("media").getPublicUrl(path).data.publicUrl);
  }
  return { urls };
}
