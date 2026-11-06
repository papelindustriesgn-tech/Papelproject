import "server-only";
import { cache } from "react";
import { DEFAULT_COMPANY, DEFAULT_HOME, DEFAULT_NEWS, DEFAULT_PRODUCTS, DEFAULT_RANGES } from "@/content/defaults";
import { isSupabaseConfigured } from "@/lib/env";
import { createPublicClient } from "@/lib/supabase/public";
import type { CompanySettings, HomeSettings, NewsPost, Product, ProductRange } from "@/lib/types";

/**
 * Lecture des contenus publics. Les politiques RLS ne renvoient que les contenus publiés ;
 * les filtres ci-dessous les répètent pour le mode sans base (contenu par défaut).
 */

function fail(what: string, error: { message: string }): never {
  // L'erreur interrompt la régénération : la dernière version valide de la page reste servie.
  throw new Error(`Lecture ${what} impossible : ${error.message}`);
}

async function getSetting<T extends object>(key: string, fallback: T): Promise<T> {
  if (!isSupabaseConfigured()) return fallback;
  const { data, error } = await createPublicClient().from("site_settings").select("value").eq("key", key).maybeSingle();
  if (error) fail(`des réglages (${key})`, error);
  return { ...fallback, ...((data?.value as Partial<T>) ?? {}) };
}

export const getCompany = cache(() => getSetting<CompanySettings>("company", DEFAULT_COMPANY));
export const getHome = cache(() => getSetting<HomeSettings>("home", DEFAULT_HOME));

export const getRanges = cache(async (): Promise<ProductRange[]> => {
  if (!isSupabaseConfigured()) return DEFAULT_RANGES.filter((r) => r.status === "published");
  const { data, error } = await createPublicClient()
    .from("product_ranges")
    .select("*")
    .eq("status", "published")
    .order("sort_order");
  if (error) fail("des gammes", error);
  return data as ProductRange[];
});

export const getProducts = cache(async (): Promise<Product[]> => {
  if (!isSupabaseConfigured()) {
    const ranges = new Set(DEFAULT_RANGES.filter((r) => r.status === "published").map((r) => r.id));
    return DEFAULT_PRODUCTS.filter((p) => p.status === "published" && ranges.has(p.range_id));
  }
  const { data, error } = await createPublicClient().from("products").select("*").eq("status", "published").order("sort_order");
  if (error) fail("des produits", error);
  return data as Product[];
});

export const getProduct = cache(async (slug: string) => {
  const products = await getProducts();
  const product = products.find((p) => p.slug === slug) ?? null;
  if (!product) return null;
  const range = (await getRanges()).find((r) => r.id === product.range_id) ?? null;
  return { product, range };
});

export const getNews = cache(async (limit?: number): Promise<NewsPost[]> => {
  if (!isSupabaseConfigured()) {
    const now = Date.now();
    const list = DEFAULT_NEWS.filter((n) => n.status === "published" && n.published_at && Date.parse(n.published_at) <= now);
    return limit ? list.slice(0, limit) : list;
  }
  let query = createPublicClient()
    .from("news_posts")
    .select("*")
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) fail("des actualités", error);
  return data as NewsPost[];
});

export const getNewsPost = cache(async (slug: string) => {
  const posts = await getNews();
  return posts.find((p) => p.slug === slug) ?? null;
});
