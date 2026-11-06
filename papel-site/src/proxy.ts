import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

// Le proxy ne s'exécute que sur l'administration : le site public reste statique et rapide.
export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
