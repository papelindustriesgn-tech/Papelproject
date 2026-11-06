"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { refreshPublicSite, requireAdmin, uploadImages, zodErrors, type ActionState } from "@/lib/admin";
import { companySchema, homeSchema, newsSchema, productSchema, rangeSchema } from "@/lib/admin-schemas";
import { isSupabaseConfigured } from "@/lib/env";
import { createSessionClient } from "@/lib/supabase/server";

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v : "";
};
const files = (fd: FormData, k: string) => fd.getAll(k).filter((f): f is File => f instanceof File && f.size > 0);
const pgError = (message: string) =>
  message.includes("duplicate key") ? "Cet identifiant d'URL (slug) est déjà utilisé." : `Enregistrement impossible : ${message}`;

/* ------------------------------------------------------------------ */
/* Authentification                                                     */
/* ------------------------------------------------------------------ */

export async function signIn(_: ActionState, fd: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured()) return { message: "Supabase n'est pas configuré (voir le README)." };
  const parsed = z
    .object({ email: z.email("Adresse e-mail invalide"), password: z.string().min(8, "Mot de passe requis") })
    .safeParse({ email: str(fd, "email").trim().toLowerCase(), password: str(fd, "password") });
  if (!parsed.success) return { errors: zodErrors(parsed.error.issues) };
  const supabase = await createSessionClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { message: "Identifiants incorrects." };
  const { data: admin } = await supabase.from("admin_users").select("user_id").maybeSingle();
  if (!admin) {
    await supabase.auth.signOut();
    return { message: "Ce compte n'a pas accès à l'administration." };
  }
  redirect("/admin");
}

export async function signOut() {
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
  redirect("/admin/connexion");
}

/* ------------------------------------------------------------------ */
/* Produits                                                             */
/* ------------------------------------------------------------------ */

export async function saveProduct(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const id = str(fd, "id");

  const upload = await uploadImages(supabase, files(fd, "new_images"), "produits");
  if (upload.error) return { message: upload.error };
  const existing = str(fd, "images");
  const images = [existing, ...upload.urls].filter(Boolean).join("\n");

  const parsed = productSchema.safeParse({
    range_id: str(fd, "range_id"),
    name: str(fd, "name"),
    slug: str(fd, "slug"),
    short_description: str(fd, "short_description"),
    description: str(fd, "description"),
    images,
    format: str(fd, "format"),
    dimensions: str(fd, "dimensions"),
    sheet_count: str(fd, "sheet_count"),
    ply_count: str(fd, "ply_count"),
    packaging: str(fd, "packaging"),
    recommended_uses: str(fd, "recommended_uses"),
    technical_info: str(fd, "technical_info"),
    availability: str(fd, "availability"),
    status: str(fd, "status"),
    is_featured: fd.get("is_featured") === "on",
    seo_title: str(fd, "seo_title"),
    seo_description: str(fd, "seo_description"),
    sort_order: str(fd, "sort_order") || "0",
  });
  if (!parsed.success) return { message: "Certains champs sont à corriger.", errors: zodErrors(parsed.error.issues) };

  const query = id
    ? supabase.from("products").update(parsed.data).eq("id", id).select("id").single()
    : supabase.from("products").insert(parsed.data).select("id").single();
  const { data, error } = await query;
  if (error) return { message: pgError(error.message) };
  refreshPublicSite();
  revalidatePath("/admin/produits");
  redirect(`/admin/produits/${data.id}?enregistre=1`);
}

export async function deleteProduct(fd: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("products").delete().eq("id", str(fd, "id"));
  refreshPublicSite();
  redirect("/admin/produits");
}

/* ------------------------------------------------------------------ */
/* Gammes                                                               */
/* ------------------------------------------------------------------ */

export async function saveRange(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const id = str(fd, "id");
  const upload = await uploadImages(supabase, files(fd, "new_image"), "gammes");
  if (upload.error) return { message: upload.error };

  const parsed = rangeSchema.safeParse({
    name: str(fd, "name"),
    slug: str(fd, "slug"),
    tagline: str(fd, "tagline"),
    description: str(fd, "description"),
    image_url: upload.urls[0] ?? str(fd, "image_url"),
    is_commercialized: fd.get("is_commercialized") === "on",
    status: str(fd, "status"),
    sort_order: str(fd, "sort_order") || "0",
  });
  if (!parsed.success) return { message: "Certains champs sont à corriger.", errors: zodErrors(parsed.error.issues) };

  const query = id
    ? supabase.from("product_ranges").update(parsed.data).eq("id", id).select("id").single()
    : supabase.from("product_ranges").insert(parsed.data).select("id").single();
  const { data, error } = await query;
  if (error) return { message: pgError(error.message) };
  refreshPublicSite();
  revalidatePath("/admin/gammes");
  redirect(`/admin/gammes/${data.id}?enregistre=1`);
}

/* ------------------------------------------------------------------ */
/* Actualités                                                           */
/* ------------------------------------------------------------------ */

export async function saveNews(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const id = str(fd, "id");
  const upload = await uploadImages(supabase, files(fd, "new_cover"), "actualites");
  if (upload.error) return { message: upload.error };

  const status = str(fd, "status");
  let publishedAt = str(fd, "published_at");
  // Publication sans date : on publie maintenant
  if (status === "published" && !publishedAt) publishedAt = new Date().toISOString();

  const parsed = newsSchema.safeParse({
    title: str(fd, "title"),
    slug: str(fd, "slug"),
    excerpt: str(fd, "excerpt"),
    content: str(fd, "content"),
    cover_image: upload.urls[0] ?? str(fd, "cover_image"),
    category: str(fd, "category"),
    status,
    published_at: publishedAt,
    seo_title: str(fd, "seo_title"),
    seo_description: str(fd, "seo_description"),
  });
  if (!parsed.success) return { message: "Certains champs sont à corriger.", errors: zodErrors(parsed.error.issues) };

  const query = id
    ? supabase.from("news_posts").update(parsed.data).eq("id", id).select("id").single()
    : supabase.from("news_posts").insert(parsed.data).select("id").single();
  const { data, error } = await query;
  if (error) return { message: pgError(error.message) };
  refreshPublicSite();
  revalidatePath("/admin/actualites");
  redirect(`/admin/actualites/${data.id}?enregistre=1`);
}

export async function deleteNews(fd: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("news_posts").delete().eq("id", str(fd, "id"));
  refreshPublicSite();
  redirect("/admin/actualites");
}

/* ------------------------------------------------------------------ */
/* Prospects et messages                                                */
/* ------------------------------------------------------------------ */

const leadUpdate = z.object({
  status: z.enum(["nouveau", "a_contacter", "en_discussion", "converti", "cloture"]),
  internal_notes: z
    .string()
    .trim()
    .max(5000)
    .transform((v) => v || null),
});

export async function updateLead(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const parsed = leadUpdate.safeParse({ status: str(fd, "status"), internal_notes: str(fd, "internal_notes") });
  if (!parsed.success) return { message: "Valeurs invalides.", errors: zodErrors(parsed.error.issues) };
  const { error } = await supabase.from("leads").update(parsed.data).eq("id", str(fd, "id"));
  if (error) return { message: pgError(error.message) };
  revalidatePath("/admin/prospects");
  revalidatePath("/admin");
  return { ok: true, message: "Prospect mis à jour." };
}

export async function setMessageStatus(fd: FormData) {
  const { supabase } = await requireAdmin();
  const status = z.enum(["nouveau", "traite", "archive"]).safeParse(str(fd, "status"));
  if (!status.success) return;
  await supabase.from("contact_messages").update({ status: status.data }).eq("id", str(fd, "id"));
  revalidatePath("/admin/messages");
  revalidatePath("/admin");
}

/* ------------------------------------------------------------------ */
/* Réglages                                                             */
/* ------------------------------------------------------------------ */

async function saveSetting(key: "company" | "home", value: unknown, userId: string) {
  const { supabase } = await requireAdmin();
  return supabase.from("site_settings").upsert({ key, value, updated_by: userId });
}

export async function saveCompany(_: ActionState, fd: FormData): Promise<ActionState> {
  const { userId } = await requireAdmin();
  const raw = Object.fromEntries(Object.keys(companySchema.shape).map((k) => [k, str(fd, k)]));
  const parsed = companySchema.safeParse(raw);
  if (!parsed.success) return { message: "Certains champs sont à corriger.", errors: zodErrors(parsed.error.issues) };
  const { error } = await saveSetting("company", parsed.data, userId);
  if (error) return { message: pgError(error.message) };
  refreshPublicSite();
  return { ok: true, message: "Informations de l'entreprise enregistrées." };
}

export async function saveHome(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, userId } = await requireAdmin();
  const upload = await uploadImages(supabase, [...files(fd, "new_heroImage"), ...files(fd, "new_heroImageMobile")], "accueil");
  if (upload.error) return { message: upload.error };
  const newDesktop = files(fd, "new_heroImage").length ? upload.urls.shift() : undefined;
  const newMobile = files(fd, "new_heroImageMobile").length ? upload.urls.shift() : undefined;

  const parsed = homeSchema.safeParse({
    heroEyebrow: str(fd, "heroEyebrow"),
    heroTitle: str(fd, "heroTitle"),
    heroSubtitle: str(fd, "heroSubtitle"),
    heroImage: newDesktop ?? str(fd, "heroImage"),
    heroImageMobile: newMobile ?? str(fd, "heroImageMobile"),
    heroImageAlt: str(fd, "heroImageAlt"),
    commitmentsTitle: str(fd, "commitmentsTitle"),
    commitments: [0, 1, 2].map((i) => ({ title: str(fd, `commitment_title_${i}`), text: str(fd, `commitment_text_${i}`) })),
    companyTitle: str(fd, "companyTitle"),
    companyText: str(fd, "companyText"),
    closingTitle: str(fd, "closingTitle"),
    closingText: str(fd, "closingText"),
  });
  if (!parsed.success) return { message: "Certains champs sont à corriger.", errors: zodErrors(parsed.error.issues) };
  const { error } = await saveSetting("home", parsed.data, userId);
  if (error) return { message: pgError(error.message) };
  refreshPublicSite();
  return { ok: true, message: "Page d'accueil enregistrée." };
}
