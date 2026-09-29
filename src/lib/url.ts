export type SearchParams = Record<string, string | string[] | undefined>;

export function param(sp: SearchParams, key: string): string | undefined {
  const v = sp[key];
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() !== "" ? s.trim() : undefined;
}

/** Construit une URL en gardant les filtres existants et en appliquant des changements. */
export function withParams(pathname: string, sp: SearchParams, updates: Record<string, string | undefined | null>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    const s = Array.isArray(v) ? v[0] : v;
    if (s) params.set(k, s);
  }
  for (const [k, v] of Object.entries(updates)) {
    if (v == null || v === "") params.delete(k);
    else params.set(k, v);
  }
  if (!("page" in updates)) params.delete("page");
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/** Échappe les caractères spéciaux pour un filtre ilike PostgREST. */
export function ilikePattern(q: string) {
  return `%${q.replace(/[%_\\,()]/g, " ").trim()}%`;
}

export function safeNext(next: string | null | undefined, fallback = "/accueil") {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}
