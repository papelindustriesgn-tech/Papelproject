"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePartner } from "@/lib/partner";
import type { FormState } from "@/lib/actions/types";

const ROLE = z.enum(["manager", "cashier"]);

/** Ajoute un membre (compte Uny existant) : responsable ou caissier. */
export async function addPartnerMember(_prev: FormState, formData: FormData): Promise<FormState> {
  const { partner } = await requirePartner({ manager: true });
  const parsed = z
    .object({ email: z.email("Email invalide").max(200), role: ROLE })
    .safeParse({ email: String(formData.get("email") ?? "").trim().toLowerCase(), role: formData.get("role") });
  if (!parsed.success) return { error: "Vérifie l'email et le rôle.", values: { email: String(formData.get("email") ?? "") } };
  const admin = createAdminClient();
  const { data: user } = await admin
    .from("profiles")
    .select("id, role, first_name, last_name")
    .eq("email", parsed.data.email)
    .maybeSingle();
  if (!user)
    return {
      error: "Aucun compte Uny avec cet email. La personne crée d'abord son compte, puis tu l'ajoutes.",
      values: { email: parsed.data.email },
    };
  const { error } = await admin
    .from("partner_members")
    .upsert({ partner_id: partner.id, user_id: user.id, role: parsed.data.role });
  if (error) return { error: "Ajout impossible. Réessaie." };
  // Un étudiant ajouté comme caissier garde son compte étudiant ; il accède à la caisse depuis son profil.
  revalidatePath("/partenaire/equipe");
  return { ok: true, message: `${user.first_name} ${user.last_name} a été ajouté(e) ✅` };
}

export async function removePartnerMember(userId: string): Promise<{ error?: string }> {
  const { partner, profile } = await requirePartner({ manager: true });
  if (!z.uuid().safeParse(userId).success) return { error: "Demande invalide." };
  if (userId === profile.id) return { error: "Tu ne peux pas te retirer toi-même." };
  const admin = createAdminClient();
  const { data: target } = await admin
    .from("partner_members")
    .select("role")
    .eq("partner_id", partner.id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!target) return { error: "Membre introuvable." };
  await admin.from("partner_members").delete().eq("partner_id", partner.id).eq("user_id", userId);
  revalidatePath("/partenaire/equipe");
  return {};
}
