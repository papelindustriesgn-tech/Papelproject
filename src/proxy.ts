import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Tout sauf les fichiers statiques, images, PWA et la vérification publique des cartes.
    "/((?!_next/static|_next/image|favicon.ico|icons/|sw.js|manifest.webmanifest|robots.txt|sitemap.xml|opengraph-image|twitter-image|v/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
