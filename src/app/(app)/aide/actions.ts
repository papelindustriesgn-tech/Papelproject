"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { handOff, supportReply } from "@/lib/ai/support";
import type { FormState } from "@/lib/actions/types";

const conversationId = (fd: FormData) => {
  const v = String(fd.get("conversation") ?? "");
  return z.uuid().safeParse(v).success ? v : null;
};

/** Question à l'assistant : l'identité vient de la session vérifiée (getUser), jamais du formulaire. */
export async function askSupport(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getUser();
  if (!user) return { error: "Connecte-toi pour utiliser l'aide." };
  const question = String(formData.get("question") ?? "").trim();
  if (question.length < 2) return { error: "Écris ta question." };
  if (question.length > 1000) return { error: "Question trop longue (1 000 caractères au plus)." };
  try {
    await supportReply(user.id, conversationId(formData), question);
  } catch {
    return { error: "Ton message n'a pas pu être enregistré. Réessaie dans un instant." };
  }
  revalidatePath("/aide");
  return { ok: true };
}

export async function askHuman(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getUser();
  if (!user) return { error: "Connecte-toi pour utiliser l'aide." };
  try {
    await handOff(user.id, conversationId(formData), "Demande de l'utilisateur");
  } catch {
    return { error: "La demande n'a pas pu être transmise. Réessaie dans un instant." };
  }
  revalidatePath("/aide");
  return { ok: true, message: "Demande transmise à l'équipe Uny." };
}

/** Reprise de contact : la conversation en cours est close, la prochaine question en ouvre une nouvelle. */
export async function startNewConversation(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getUser();
  if (!user) return { error: "Connecte-toi pour utiliser l'aide." };
  const id = conversationId(formData);
  if (id)
    await createAdminClient()
      .from("ai_conversations")
      .update({ status: "closed", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);
  revalidatePath("/aide");
  return { ok: true };
}
