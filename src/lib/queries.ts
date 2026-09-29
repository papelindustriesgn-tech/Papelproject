import "server-only";
import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { createAdminClient } from "@/lib/supabase/admin";
import { PAGE_SIZE, type DealCategory, type HousingType, type JobType, type MarketCategory } from "@/lib/constants";
import { ilikePattern } from "@/lib/url";
import type { ItemCardData } from "@/components/content/cards";

type Supabase = Awaited<ReturnType<typeof createClient>>;
type AnyClient = Supabase | ReturnType<typeof createPublicClient>;

/** Tag du cache des contenus publics (avantages, jobs, logements, marketplace). */
export const CONTENT_TAG = "content";
/**
 * Les listes de contenus sont identiques pour tous les étudiants : on les met en cache
 * 60 s côté serveur (invalidées immédiatement après chaque modification admin/vendeur).
 * Seules les données personnelles (profil, favoris, notifications) sont lues à chaque requête.
 */
const cached = <A extends unknown[], R>(fn: (...args: A) => Promise<R>, key: string) =>
  unstable_cache(fn, [key], { revalidate: 60, tags: [CONTENT_TAG] });

export const DEAL_COLUMNS =
  "id, title, discount_label, category, district, image_url, valid_until, is_demo, is_featured, partner:partners(name, logo_url)";
export const JOB_COLUMNS = "id, title, company_name, type, location, is_remote, compensation, deadline, is_demo, created_at";
export const HOUSING_COLUMNS = "id, title, type, district, price_gnf, rooms, images, is_available, available_from, is_demo";
export const ITEM_COLUMNS =
  "id, title, category, price_gnf, condition, district, created_at, is_demo, status, seller_id, images:marketplace_images(url, position)";

const today = () => new Date().toISOString().slice(0, 10);

function range(page: number) {
  const from = (page - 1) * PAGE_SIZE;
  return [from, from + PAGE_SIZE] as const; // +1 élément pour savoir s'il y a une page suivante
}

async function _listDeals(
  supabase: AnyClient,
  {
    category,
    q,
    district,
    page = 1,
    featured,
  }: { category?: string; q?: string; district?: string; page?: number; featured?: boolean },
) {
  let query = supabase
    .from("deals")
    .select(DEAL_COLUMNS)
    .eq("is_active", true)
    .or(`valid_until.is.null,valid_until.gte.${today()}`);
  if (category) query = query.eq("category", category as DealCategory);
  if (district) query = query.eq("district", district);
  if (featured) query = query.eq("is_featured", true);
  if (q) query = query.ilike("title", ilikePattern(q));
  const [from, to] = range(page);
  const { data, error } = await query
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (error) throw error;
  return { items: (data ?? []).slice(0, PAGE_SIZE), hasMore: (data?.length ?? 0) > PAGE_SIZE };
}

async function _listJobs(supabase: AnyClient, { type, q, page = 1 }: { type?: string; q?: string; page?: number }) {
  let query = supabase.from("jobs").select(JOB_COLUMNS).eq("is_active", true).or(`deadline.is.null,deadline.gte.${today()}`);
  if (type) query = query.eq("type", type as JobType);
  if (q) query = query.or(`title.ilike.${ilikePattern(q)},company_name.ilike.${ilikePattern(q)}`);
  const [from, to] = range(page);
  const { data, error } = await query.order("created_at", { ascending: false }).range(from, to);
  if (error) throw error;
  return { items: (data ?? []).slice(0, PAGE_SIZE), hasMore: (data?.length ?? 0) > PAGE_SIZE };
}

async function _listHousing(
  supabase: AnyClient,
  {
    type,
    district,
    max,
    available,
    page = 1,
  }: { type?: string; district?: string; max?: number; available?: boolean; page?: number },
) {
  let query = supabase.from("housing").select(HOUSING_COLUMNS).eq("is_active", true);
  if (type) query = query.eq("type", type as HousingType);
  if (district) query = query.eq("district", district);
  if (max) query = query.lte("price_gnf", max);
  if (available) query = query.eq("is_available", true).or(`available_from.is.null,available_from.lte.${today()}`);
  const [from, to] = range(page);
  const { data, error } = await query
    .order("is_available", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (error) throw error;
  return { items: (data ?? []).slice(0, PAGE_SIZE), hasMore: (data?.length ?? 0) > PAGE_SIZE };
}

type RawItem = {
  id: string;
  title: string;
  category: MarketCategory;
  price_gnf: number;
  condition: ItemCardData["condition"];
  district: string | null;
  created_at: string;
  is_demo: boolean;
  status: string;
  seller_id: string | null;
  images: { url: string; position: number }[] | null;
};

export function toItemCard(i: RawItem, verifiedSellers?: Set<string>): ItemCardData {
  const cover = [...(i.images ?? [])].sort((a, b) => a.position - b.position)[0]?.url ?? null;
  return {
    id: i.id,
    title: i.title,
    category: i.category,
    price_gnf: i.price_gnf,
    condition: i.condition,
    district: i.district,
    created_at: i.created_at,
    is_demo: i.is_demo,
    status: i.status,
    cover,
    verifiedSeller: i.seller_id ? verifiedSellers?.has(i.seller_id) : false,
  };
}

export async function verifiedSellerSet(supabase: AnyClient, ids: (string | null)[]) {
  const unique = [...new Set(ids.filter(Boolean) as string[])];
  if (!unique.length) return new Set<string>();
  const { data } = await supabase.rpc("seller_public_info", { p_ids: unique });
  return new Set((data ?? []).filter((s) => s.verification_status === "verified").map((s) => s.id));
}

async function _listMarket(
  supabase: AnyClient,
  { category, q, max, page = 1 }: { category?: string; q?: string; max?: number; page?: number },
) {
  let query = supabase.from("marketplace_items").select(ITEM_COLUMNS).eq("status", "active");
  if (category) query = query.eq("category", category as MarketCategory);
  if (max) query = query.lte("price_gnf", max);
  if (q) query = query.ilike("title", ilikePattern(q));
  const [from, to] = range(page);
  const { data, error } = await query.order("created_at", { ascending: false }).range(from, to);
  if (error) throw error;
  const rows = (data ?? []) as RawItem[];
  const verified = await verifiedSellerSet(
    createAdminClient(),
    rows.map((r) => r.seller_id),
  );
  return { items: rows.slice(0, PAGE_SIZE).map((r) => toItemCard(r, verified)), hasMore: rows.length > PAGE_SIZE };
}

/** Identifiants des favoris de l'utilisateur, pour afficher les cœurs. */
export async function favoriteIds(supabase: Supabase, userId: string, kind: "deal" | "job" | "housing") {
  if (kind === "deal") {
    const { data } = await supabase.from("deal_favorites").select("deal_id").eq("user_id", userId);
    return new Set((data ?? []).map((r) => r.deal_id));
  }
  if (kind === "job") {
    const { data } = await supabase.from("job_favorites").select("job_id").eq("user_id", userId);
    return new Set((data ?? []).map((r) => r.job_id));
  }
  const { data } = await supabase.from("housing_favorites").select("housing_id").eq("user_id", userId);
  return new Set((data ?? []).map((r) => r.housing_id));
}

type Opts<F> = F extends (s: AnyClient, o: infer O) => unknown ? O : never;

export const listDeals = cached((o: Opts<typeof _listDeals>) => _listDeals(createPublicClient(), o), "deals");
export const listJobs = cached((o: Opts<typeof _listJobs>) => _listJobs(createPublicClient(), o), "jobs");
export const listHousing = cached((o: Opts<typeof _listHousing>) => _listHousing(createPublicClient(), o), "housing");
// Service role : les colonnes vendeur ne sont pas lisibles par « anon » ; seules les annonces actives sont renvoyées.
export const listMarket = cached((o: Opts<typeof _listMarket>) => _listMarket(createAdminClient(), o), "market");

export const getDistricts = unstable_cache(
  async (slug: string = "conakry") => {
    const { data } = await createPublicClient().from("cities").select("districts").eq("slug", slug).single();
    return data?.districts ?? [];
  },
  ["districts"],
  { revalidate: 3600, tags: [CONTENT_TAG] },
);
