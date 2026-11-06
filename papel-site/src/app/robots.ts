import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  // Les préversions Vercel ne doivent pas être indexées
  const isProduction = !process.env.VERCEL_ENV || process.env.VERCEL_ENV === "production";
  return {
    rules: isProduction ? { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] } : { userAgent: "*", disallow: "/" },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
