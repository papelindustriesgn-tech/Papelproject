import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { param, type SearchParams } from "@/lib/url";

export type City = { id: number; name: string; slug: string; districts: string[] };

/** Villes actives (toute la Guinée), mises en cache 1 h. */
export const getCities = unstable_cache(
  async (): Promise<City[]> => {
    const { data } = await createPublicClient()
      .from("cities")
      .select("id, name, slug, districts")
      .eq("is_active", true)
      .order("name");
    return (data ?? []).map((c) => ({ ...c, districts: c.districts ?? [] }));
  },
  ["cities-active"],
  { revalidate: 3600, tags: ["content"] },
);

/** Valeur du filtre « ville » pour afficher toute la Guinée. */
export const ALL_CITIES = "toutes";

/**
 * Ville affichée dans les listes : `?ville=<slug>` si présent, sinon la ville de l'étudiant.
 * `?ville=toutes` affiche le pays entier. Les contenus sans ville (nationaux) apparaissent partout.
 */
export async function resolveCity(sp: SearchParams, profileCityId: number | null) {
  const cities = await getCities();
  const slug = param(sp, "ville");
  if (slug === ALL_CITIES) return { cities, city: null as City | null, slug: ALL_CITIES };
  const city =
    (slug && cities.find((c) => c.slug === slug)) ||
    cities.find((c) => c.id === profileCityId) ||
    cities.find((c) => c.slug === "conakry") ||
    null;
  return { cities, city, slug: city?.slug ?? ALL_CITIES };
}
