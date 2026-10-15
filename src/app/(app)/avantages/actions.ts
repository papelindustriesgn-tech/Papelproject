"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type PromoState = { code?: string; expiresAt?: string; error?: string; message?: string; reference?: string };

export async function claimPromoCode(dealId: string, _prev: PromoState): Promise<PromoState> {
  if (!z.uuid().safeParse(dealId).success) return { error: "Offre introuvable." };
  await requireProfile();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("claim_promo_code", { p_deal: dealId });
  if (error) return { error: error.code === "P0001" ? error.message : "Impossible d'obtenir un code. Réessaie." };
  const r = data as { code: string; expires_at: string };
  revalidatePath("/avantages/mes-codes");
  return { code: r.code, expiresAt: r.expires_at };
}

export async function declarePromoPayment(prev: PromoState, formData: FormData): Promise<PromoState> {
  await requireProfile();
  const code = String(formData.get("code") ?? "");
  const reference = String(formData.get("reference") ?? "").trim();
  const supabase = await createClient();
  const { error } = await supabase.rpc("declare_promo_payment", { p_code: code, p_reference: reference });
  if (error) return { ...prev, error: error.code === "P0001" ? error.message : "Enregistrement impossible." };
  revalidatePath("/avantages/mes-codes");
  return {
    ...prev,
    error: undefined,
    reference: reference.toUpperCase(),
    message: "Référence envoyée au partenaire ✅ Montre ton code au comptoir.",
  };
}
