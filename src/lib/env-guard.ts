/**
 * Isolation des environnements : une préversion (Vercel « preview ») ne doit jamais utiliser la base de
 * production. Si c'est le cas (variables de production héritées), l'application s'arrête avant toute lecture
 * ou écriture. Référence publique du projet de production (pas un secret).
 */
export const PRODUCTION_SUPABASE_REF = process.env.UNY_PRODUCTION_SUPABASE_REF || "eahujjyeupplllldsuoc";

export function previewUsesProductionDatabase(env: Record<string, string | undefined> = process.env) {
  if (env.VERCEL_ENV !== "preview") return false;
  return (env.NEXT_PUBLIC_SUPABASE_URL ?? "").includes(PRODUCTION_SUPABASE_REF);
}
