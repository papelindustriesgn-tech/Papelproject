import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./env";
import type { Database } from "./types";

/**
 * Client Supabase côté serveur (Server Components, Server Actions, Route Handlers).
 * Il agit AVEC LE JETON DE L'UTILISATEUR : la RLS s'applique.
 */
export async function clientServeur() {
  const magasinCookies = await cookies();
  return createServerClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => magasinCookies.getAll(),
      setAll: (aEcrire) => {
        try {
          aEcrire.forEach(({ name, value, options }) => magasinCookies.set(name, value, options));
        } catch {
          // Appelé depuis un Server Component : sans effet, le proxy rafraîchit la session.
        }
      },
    },
  });
}
