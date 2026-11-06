import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Client « service role » (contourne RLS) — serveur uniquement.
 * Utilisé exclusivement pour enregistrer les formulaires publics après validation
 * et les événements de conversion. Jamais pour lire des données vers le public.
 */
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY manquant");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
