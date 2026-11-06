import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Rafraîchit la session et protège l'espace /admin (contrôle optimiste ; le layout revérifie le rôle). */
export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLogin = pathname === "/admin/connexion";

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    if (!isLogin) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/connexion";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
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
  });

  const { data } = await supabase.auth.getClaims();
  const loggedIn = Boolean(data?.claims?.sub);

  if (!loggedIn && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/connexion";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (loggedIn && isLogin && !request.nextUrl.searchParams.has("erreur")) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}
