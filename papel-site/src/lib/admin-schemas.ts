import { z } from "zod";

const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `${max} caractères maximum`)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .default(null);

const slug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Lettres minuscules, chiffres et tirets uniquement");

const status = z.enum(["draft", "published", "archived"]);

/** Liste « une valeur par ligne » (images, utilisations). */
const lines = (maxItems: number) =>
  z
    .string()
    .default("")
    .transform((v) =>
      v
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.string().max(500)).max(maxItems, `${maxItems} éléments maximum`));

const imageRef = z.string().refine((v) => v.startsWith("/") || /^https:\/\//.test(v), "Chemin (/images/…) ou URL https attendu");

export const productSchema = z.object({
  range_id: z.uuid("Choisissez une gamme"),
  name: z.string().trim().min(2, "Nom requis").max(120),
  slug,
  short_description: optText(240),
  description: optText(5000),
  images: lines(8).pipe(z.array(imageRef)),
  format: optText(120),
  dimensions: optText(120),
  sheet_count: optText(60),
  ply_count: optText(60),
  packaging: optText(240),
  recommended_uses: lines(12),
  technical_info: optText(3000),
  availability: z.enum(["available", "limited", "coming_soon", "unavailable"]),
  status,
  is_featured: z.boolean(),
  seo_title: optText(70),
  seo_description: optText(170),
  sort_order: z.coerce.number().int().min(0).max(9999),
});

export const rangeSchema = z.object({
  name: z.string().trim().min(2, "Nom requis").max(80),
  slug,
  tagline: optText(160),
  description: optText(2000),
  image_url: optText(500).pipe(imageRef.nullable()),
  is_commercialized: z.boolean(),
  status,
  sort_order: z.coerce.number().int().min(0).max(9999),
});

export const newsSchema = z.object({
  title: z.string().trim().min(4, "Titre requis").max(140),
  slug,
  excerpt: optText(300),
  content: z.string().trim().max(30000).default(""),
  cover_image: optText(500).pipe(imageRef.nullable()),
  category: z.enum(["nouveautes", "lancements", "industrie", "partenariats", "evenements"]),
  status,
  published_at: z
    .string()
    .trim()
    .transform((v) => (v ? new Date(v).toISOString() : null))
    .nullable(),
  seo_title: optText(70),
  seo_description: optText(170),
});

const phoneOrEmpty = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\+?[0-9 ]{8,20}$/.test(v), "Format international attendu, ex. +224 6XX XX XX XX");
const urlOrEmpty = z
  .string()
  .trim()
  .refine((v) => v === "" || /^https:\/\//.test(v), "URL https:// attendue");
const coord = (min: number, max: number) =>
  z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v.replace(",", "."))))
    .pipe(z.number().min(min).max(max).nullable());

export const companySchema = z.object({
  brandName: z.string().trim().min(2).max(80),
  legalName: z.string().trim().max(120),
  legalForm: z.string().trim().max(120),
  signature: z.string().trim().max(120),
  rccm: z.string().trim().max(60),
  nif: z.string().trim().max(60),
  headOffice: z.string().trim().max(200),
  factoryName: z.string().trim().max(120),
  factoryArea: z.string().trim().max(120),
  factoryCity: z.string().trim().max(120),
  country: z.string().trim().max(120),
  factoryLat: coord(-90, 90),
  factoryLng: coord(-180, 180),
  phone: phoneOrEmpty,
  whatsapp: phoneOrEmpty,
  email: z
    .string()
    .trim()
    .refine((v) => v === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), "Adresse e-mail invalide"),
  facebookUrl: urlOrEmpty,
  instagramUrl: urlOrEmpty,
  linkedinUrl: urlOrEmpty,
  openingHours: z.string().trim().max(160),
});

export const homeSchema = z.object({
  heroEyebrow: z.string().trim().max(80),
  heroTitle: z.string().trim().min(4).max(120),
  heroSubtitle: z.string().trim().max(240),
  heroImage: imageRef,
  heroImageMobile: imageRef,
  heroImageAlt: z.string().trim().max(160),
  commitmentsTitle: z.string().trim().max(120),
  commitments: z.array(z.object({ title: z.string().trim().min(2).max(60), text: z.string().trim().max(240) })).length(3),
  companyTitle: z.string().trim().max(120),
  companyText: z.string().trim().max(800),
  closingTitle: z.string().trim().max(120),
  closingText: z.string().trim().max(300),
});
