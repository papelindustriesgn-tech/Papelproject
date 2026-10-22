/**
 * Garde-fou commun (tests, données fictives, tests de charge, réinitialisations) : refuse toute cible de
 * PRODUCTION. Autorisé : Supabase local (127.0.0.1 / localhost), ou une base de préproduction déclarée
 * explicitement avec UNY_ALLOW_REMOTE_TARGET=<hôte> (jamais l'hôte de production).
 */
export const PRODUCTION_SUPABASE_REF = process.env.UNY_PRODUCTION_SUPABASE_REF || "eahujjyeupplllldsuoc";
const PRODUCTION_HOSTS = ["unyafrica.com", "www.unyafrica.com"];

export function isProductionTarget(url) {
  if (!url) return false;
  let host;
  try {
    host = new URL(url).hostname;
  } catch {
    return true; // URL illisible : prudence
  }
  return host.includes(PRODUCTION_SUPABASE_REF) || PRODUCTION_HOSTS.includes(host);
}

export function assertNonProductionTarget(urls, context) {
  for (const url of urls.filter(Boolean)) {
    if (isProductionTarget(url)) {
      throw new Error(`[${context}] Refusé : la cible ${new URL(url).hostname} est la PRODUCTION.`);
    }
    const host = new URL(url).hostname;
    const local = host === "127.0.0.1" || host === "localhost";
    if (!local && process.env.UNY_ALLOW_REMOTE_TARGET !== host) {
      throw new Error(
        `[${context}] Refusé : ${host} n'est ni local ni déclaré comme préproduction (UNY_ALLOW_REMOTE_TARGET=${host}).`,
      );
    }
  }
}
