"use server";

import { revalidatePath, updateTag } from "next/cache";
import { CONTENT_TAG } from "@/lib/queries";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isValidPhone, normalizePhone } from "@/lib/format";
import { formValues, zodFieldErrors, type FormState } from "@/lib/actions/types";
import { MARKET_CATEGORIES, ITEM_CONDITIONS } from "@/lib/constants";

const imageSchema = z.object({ url: z.url(), path: z.string().nullable() });

const schema = z.object({
  id: z.uuid().optional().or(z.literal("")),
  title: z.string().trim().min(3, "Titre trop court").max(100, "100 caractères maximum"),
  category: z.enum(Object.keys(MARKET_CATEGORIES) as [keyof typeof MARKET_CATEGORIES]),
  condition: z.enum(Object.keys(ITEM_CONDITIONS) as [keyof typeof ITEM_CONDITIONS]),
  price_gnf: z.coerce.number({ message: "Prix invalide" }).int("Prix invalide").min(0, "Prix invalide").max(1_000_000_000, "Prix trop élevé"),
  is_negotiable: z.literal("on").optional(),
  description: z.string().trim().max(2000, "2000 caractères maximum").optional().default(""),
  district: z.string().trim().max(60).optional(),
  contact_phone: z
    .string()
    .trim()
    .min(6, "Numéro requis pour être contacté")
    .transform((v) => normalizePhone(v))
    .refine(isValidPhone, "Numéro invalide"),
  images: z.string().transform((s, ctx) => {
    try {
      return z.array(imageSchema).max(5).parse(JSON.parse(s || "[]"));
    } catch {
      ctx.addIssue({ code: "custom", message: "Photos invalides" });
      return z.NEVER;
    }
  }),
});

export async function saveItem(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Vérifie les champs indiqués.", fieldErrors: zodFieldErrors(parsed.error.issues), values };
  const d = parsed.data;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Session expirée, reconnecte-toi." };
  const uid = auth.user.id;

  // Les photos doivent provenir du dossier de l'utilisateur dans le bucket marketplace
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/marketplace/`;
  for (const img of d.images) {
    if (img.path && (!img.path.startsWith(`${uid}/`) || img.url !== base + img.path)) {
      return { error: "Photo invalide.", values };
    }
  }
  if (d.images.length === 0) return { error: "Ajoute au moins une photo.", fieldErrors: { images: "Au moins 1 photo" }, values };

  const { data: profile } = await supabase.from("profiles").select("city_id").eq("id", uid).single();
  const row = {
    title: d.title,
    category: d.category,
    condition: d.condition,
    price_gnf: d.price_gnf,
    is_negotiable: d.is_negotiable === "on",
    description: d.description,
    district: d.district || null,
    contact_phone: d.contact_phone,
    city_id: profile?.city_id ?? null,
  };

  let itemId = d.id || null;
  if (itemId) {
    const { data: existing } = await supabase.from("marketplace_items").select("id, seller_id, images:marketplace_images(id, storage_path)").eq("id", itemId).single();
    if (!existing || existing.seller_id !== uid) return { error: "Annonce introuvable." };
    const { error } = await supabase.from("marketplace_items").update(row).eq("id", itemId);
    if (error) return { error: error.message.includes("modération") ? error.message : "Mise à jour impossible.", values };
    const kept = new Set(d.images.map((i) => i.path).filter(Boolean));
    const removed = (existing.images ?? []).map((i) => i.storage_path).filter((p): p is string => !!p && !kept.has(p));
    await supabase.from("marketplace_images").delete().eq("item_id", itemId);
    if (removed.length) await supabase.storage.from("marketplace").remove(removed);
  } else {
    const { data, error } = await supabase
      .from("marketplace_items")
      .insert({ ...row, seller_id: uid })
      .select("id")
      .single();
    if (error || !data) return { error: "Publication impossible, réessaie.", values };
    itemId = data.id;
  }

  const { error: imgErr } = await supabase
    .from("marketplace_images")
    .insert(d.images.map((img, position) => ({ item_id: itemId!, url: img.url, storage_path: img.path, position })));
  if (imgErr) console.error("[saveItem] images", imgErr);

  updateTag(CONTENT_TAG);
  revalidatePath("/marketplace");
  revalidatePath("/marketplace/mes-annonces");
  redirect(`/marketplace/${itemId}?publie=1`);
}

export async function setItemStatus(id: string, status: "active" | "sold" | "hidden") {
  if (!z.uuid().safeParse(id).success || !["active", "sold", "hidden"].includes(status)) return;
  const supabase = await createClient();
  await supabase.from("marketplace_items").update({ status }).eq("id", id);
  updateTag(CONTENT_TAG);
  revalidatePath("/marketplace/mes-annonces");
  revalidatePath(`/marketplace/${id}`);
}

export async function deleteItem(id: string) {
  if (!z.uuid().safeParse(id).success) return;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  const { data: imgs } = await supabase.from("marketplace_images").select("storage_path").eq("item_id", id);
  const { error } = await supabase.from("marketplace_items").delete().eq("id", id).eq("seller_id", auth.user.id);
  if (!error) {
    const paths = (imgs ?? []).map((i) => i.storage_path).filter((p): p is string => !!p);
    if (paths.length) await supabase.storage.from("marketplace").remove(paths);
  }
  updateTag(CONTENT_TAG);
  revalidatePath("/marketplace/mes-annonces");
  redirect("/marketplace/mes-annonces?supprime=1");
}
