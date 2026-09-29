"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const kinds = z.enum(["deal", "job", "housing"]);
const uuid = z.uuid();

/** Ajoute/retire un favori. Retourne le nouvel état. */
export async function toggleFavorite(kind: "deal" | "job" | "housing", id: string, favorite: boolean) {
  const k = kinds.parse(kind);
  const itemId = uuid.parse(id);
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false as const, error: "Connecte-toi pour enregistrer des favoris." };

  const userId = auth.user.id;
  let error;
  if (k === "deal") {
    ({ error } = favorite
      ? await supabase.from("deal_favorites").upsert({ user_id: userId, deal_id: itemId })
      : await supabase.from("deal_favorites").delete().match({ user_id: userId, deal_id: itemId }));
  } else if (k === "job") {
    ({ error } = favorite
      ? await supabase.from("job_favorites").upsert({ user_id: userId, job_id: itemId })
      : await supabase.from("job_favorites").delete().match({ user_id: userId, job_id: itemId }));
  } else {
    ({ error } = favorite
      ? await supabase.from("housing_favorites").upsert({ user_id: userId, housing_id: itemId })
      : await supabase.from("housing_favorites").delete().match({ user_id: userId, housing_id: itemId }));
  }
  if (error) return { ok: false as const, error: "Action impossible, réessaie." };
  revalidatePath("/favoris");
  return { ok: true as const, favorite };
}

export async function trackView(kind: "deal" | "job" | "housing" | "marketplace", id: string) {
  const parsed = z.object({ kind: z.enum(["deal", "job", "housing", "marketplace"]), id: uuid }).safeParse({ kind, id });
  if (!parsed.success) return;
  const supabase = await createClient();
  await supabase.rpc("track_view", { p_type: parsed.data.kind, p_id: parsed.data.id });
}
