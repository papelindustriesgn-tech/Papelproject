import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { accueilPour, espaceDuChemin, peutAcceder } from "@/lib/auth/espaces";

/**
 * Proxy (ex-middleware) : rafraîchit la session Supabase et fait les redirections RAPIDES
 * selon les rôles contenus dans le jeton. C'est un contrôle « optimiste » :
 * chaque page revérifie les rôles en base, et la RLS protège les données.
 */
export async function proxy(requete: NextRequest) {
  let reponse = NextResponse.next({ request: requete });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => requete.cookies.getAll(),
        setAll: (aEcrire) => {
          aEcrire.forEach(({ name, value }) => requete.cookies.set(name, value));
          reponse = NextResponse.next({ request: requete });
          aEcrire.forEach(({ name, value, options }) => reponse.cookies.set(name, value, options));
        },
      },
    },
  );

  // getClaims vérifie la signature du jeton (et le rafraîchit si nécessaire).
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const chemin = requete.nextUrl.pathname;
  // Les tâches planifiées (/api/taches/…, CRON_SECRET) et la connexion Excel (/api/excel/…, clé) s'authentifient elles-mêmes.
  if (chemin.startsWith("/api/taches/") || chemin.startsWith("/api/excel/")) return reponse;
  const pagePublique = chemin === "/connexion" || chemin === "/hors-ligne";

  const rediriger = (vers: string) => {
    const url = requete.nextUrl.clone();
    url.pathname = vers;
    url.search = "";
    const r = NextResponse.redirect(url);
    reponse.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  };

  if (!claims) return pagePublique ? reponse : rediriger("/connexion");

  // Rôles du jeton (hook Auth). Sans hook, on ne relit la base que pour la redirection d'accueil :
  // pour les autres pages, le layout de chaque espace revérifie déjà les droits en base (exigerEspace).
  const rolesJeton = Array.isArray(claims.papel_roles) ? (claims.papel_roles as string[]) : null;
  if (chemin === "/" || chemin === "/connexion") {
    const roles = rolesJeton ?? (((await supabase.rpc("mes_roles")).data as string[] | null) ?? []);
    return rediriger(accueilPour(roles));
  }
  if (rolesJeton) {
    const espace = espaceDuChemin(chemin);
    if (espace && !peutAcceder(espace, rolesJeton)) return rediriger("/acces-refuse");
  }

  return reponse;
}

export const config = {
  // Tout sauf les fichiers statiques, les images et les icônes.
  matcher: ["/((?!_next/static|_next/image|icons/|logo-papel.png|icon.png|apple-icon.png|manifest.webmanifest|sw.js|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
