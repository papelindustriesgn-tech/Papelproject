"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePartner } from "@/lib/partner";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/actions/types";
import type { LoyaltyStatus } from "@/lib/loyalty";

const programSchema = z.object({
  stamps_required: z.coerce.number().int().min(2, "2 passages minimum").max(20, "20 passages maximum"),
  reward: z.string().trim().min(3, "Décris la récompense").max(120),
  is_active: z.literal("on").optional(),
});

export async function saveLoyaltyProgram(_prev: FormState, formData: FormData): Promise<FormState> {
  const { partner } = await requirePartner();
  const parsed = programSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fe = Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message]));
    return { error: "Vérifie les champs indiqués.", fieldErrors: fe };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("loyalty_programs").upsert({
    partner_id: partner.id,
    stamps_required: parsed.data.stamps_required,
    reward: parsed.data.reward,
    is_active: parsed.data.is_active === "on",
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: "Enregistrement impossible. Réessaie." };
  revalidatePath("/partenaire", "layout");
  return {
    ok: true,
    message: parsed.data.is_active === "on" ? "Programme de fidélité actif ✅" : "Programme de fidélité mis en pause.",
  };
}

export type LoyaltyActionState = { status?: LoyaltyStatus; message?: string; error?: string };

/** Offrir un tampon ou une récompense à un client (depuis la liste des meilleurs clients). */
export async function giftLoyalty(cardId: string, kind: "stamp" | "reward"): Promise<LoyaltyActionState> {
  const { partner } = await requirePartner();
  if (!z.uuid().safeParse(cardId).success || !["stamp", "reward"].includes(kind)) return { error: "Demande invalide." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("partner_gift_loyalty", { p_partner: partner.id, p_card: cardId, p_kind: kind });
  if (error) return { error: error.code === "P0001" ? error.message : "Action impossible. Réessaie." };
  revalidatePath("/partenaire/fidelite");
  return {
    status: data as LoyaltyStatus,
    message: kind === "reward" ? "Récompense offerte 🎁 Le client est prévenu." : "Tampon offert ⭐ Le client est prévenu.",
  };
}

/** Utiliser une récompense au comptoir (depuis le scanner). */
export async function redeemReward(cardId: string): Promise<LoyaltyActionState> {
  const { partner } = await requirePartner();
  if (!z.uuid().safeParse(cardId).success) return { error: "Demande invalide." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("partner_use_reward", { p_partner: partner.id, p_card: cardId });
  if (error) return { error: error.code === "P0001" ? error.message : "Action impossible. Réessaie." };
  revalidatePath("/partenaire/fidelite");
  return { status: data as LoyaltyStatus, message: "Récompense utilisée ✅" };
}
