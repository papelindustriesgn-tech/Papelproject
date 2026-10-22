import { createServerClient } from "@supabase/ssr";
import { previewUsesProductionDatabase } from "@/lib/env-guard";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";

const PROTECTED_PREFIXES = [
  "/accueil",
  "/carte",
  "/avantages",
  "/marketplace",
  "/opportunites",
  "/jobs",
  "/logement",
  "/profil",
  "/notifications",
  "/favoris",
  "/avis",
  "/aide",
  "/admin",
  "/partenaire",
  "/universite",
];
const AUTH_PAGES = ["/connexion", "/inscription"];

function matches(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Rafraîchit la session Supabase et applique les redirections d'accès optimistes. */
export async function updateSession(request: NextRequest) {
  // Préversion branchée sur la base de production : arrêt avant toute lecture ou écriture
  if (previewUsesProductionDatabase()) {
    return new NextResponse(
      "<!doctype html><meta charset=utf-8><title>Préversion non isolée</title><p style=\"font-family:sans-serif;padding:2rem\">Cette préversion est volontairement désactivée : elle n'a pas de base de test dédiée et ne doit pas utiliser les données réelles. Voir docs/ENVIRONNEMENTS.md.</p>",
      { status: 503, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } },
    );
  }
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims?.sub);
  const { pathname, search } = request.nextUrl;

  // Dans l'application mobile (Android/iOS), pas de page vitrine : on ouvre directement l'espace étudiant.
  if (pathname === "/" && request.headers.get("user-agent")?.includes("UnyApp")) {
    const url = request.nextUrl.clone();
    url.pathname = isLoggedIn ? "/accueil" : "/connexion";
    return NextResponse.redirect(url);
  }

  if (!isLoggedIn && matches(pathname, PROTECTED_PREFIXES)) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    url.search = "";
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  if (isLoggedIn && matches(pathname, AUTH_PAGES)) {
    const url = request.nextUrl.clone();
    url.pathname = "/accueil";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
