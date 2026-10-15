"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isCardTheme, isStudentCardLayout } from "@/lib/card-template";
import type { FormState } from "@/lib/actions/types";

export async function saveCardStyle(_prev: FormState, formData: FormData): Promise<FormState> {
  const layout = String(formData.get("layout") ?? "");
  const theme = String(formData.get("theme") ?? "");
  if (!isStudentCardLayout(layout) || (theme && !isCardTheme(theme))) return { error: "Choix invalide." };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Session expirée." };
  const { error } = await supabase
    .from("profiles")
    .update({ card_layout: layout, card_theme: isCardTheme(theme) ? theme : null })
    .eq("id", auth.user.id);
  if (error) return { error: "Enregistrement impossible. Réessaie." };
  revalidatePath("/carte");
  revalidatePath("/accueil");
  return { ok: true, message: "Ta carte est personnalisée ✅" };
}
