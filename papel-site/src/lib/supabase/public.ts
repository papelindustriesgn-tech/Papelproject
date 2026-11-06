import { createClient } from "@supabase/supabase-js";

/** Client anonyme sans cookies : lecture des contenus publiés (pages publiques mises en cache). */
export function createPublicClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
