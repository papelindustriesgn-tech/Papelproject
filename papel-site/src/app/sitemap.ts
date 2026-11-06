import type { MetadataRoute } from "next";
import { getNews, getProducts } from "@/lib/data";
import { siteUrl } from "@/lib/env";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [products, news] = await Promise.all([getProducts(), getNews()]);
  const pages = [
    "",
    "/produits",
    "/entreprise",
    "/professionnels",
    "/actualites",
    "/contact",
    "/mentions-legales",
    "/confidentialite",
  ];
  return [
    ...pages.map((p) => ({
      url: `${base}${p}`,
      changeFrequency: "weekly" as const,
      priority: p === "" ? 1 : p === "/produits" || p === "/professionnels" ? 0.9 : 0.6,
    })),
    ...products.map((p) => ({ url: `${base}/produits/${p.slug}`, lastModified: p.updated_at, priority: 0.8 })),
    ...news.map((n) => ({
      url: `${base}/actualites/${n.slug}`,
      lastModified: n.updated_at ?? n.published_at ?? undefined,
      priority: 0.5,
    })),
  ];
}
