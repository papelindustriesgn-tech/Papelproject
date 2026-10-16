import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./env";

/**
 * Client Supabase « administrateur » (clé secrète) : CONTOURNE la RLS.
 * Réservé à la gestion des comptes Auth (création, mot de passe), après avoir vérifié
 * que l'appelant est administrateur. Ne jamais l'utiliser pour lire des données métier.
 */
export function clientAdminAuth() {
  const cle = process.env.SUPABASE_SECRET_KEY;
  if (!cle) throw new Error("Configuration manquante : SUPABASE_SECRET_KEY.");
  return createClient(SUPABASE_URL, cle, { auth: { autoRefreshToken: false, persistSession: false } });
}

/**
 * Client des tâches planifiées (clé secrète, sans session utilisateur). Il n'appelle que des fonctions SQL
 * dédiées, exécutables par le seul rôle service (ex. `rapport_hebdomadaire`) : jamais de lecture directe des tables.
 */
export function clientTachePlanifiee() {
  return clientAdminAuth();
}
