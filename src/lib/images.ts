const SUPABASE_ORIGIN = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return "";
  }
})();

/**
 * N'autorise que les images servies par notre stockage Supabase ou par Unsplash (contenu démo).
 * Une URL arbitraire (écrite directement via l'API) ne doit jamais casser le rendu d'une page.
 */
export function safeImage(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (SUPABASE_ORIGIN && u.origin === SUPABASE_ORIGIN && u.pathname.startsWith("/storage/v1/object/public/")) return url;
    if (u.protocol === "https:" && u.hostname === "images.unsplash.com") return url;
    if (u.protocol === "https:" && u.hostname.endsWith(".supabase.co") && u.pathname.startsWith("/storage/v1/object/public/"))
      return url;
  } catch {
    /* URL invalide */
  }
  return null;
}
