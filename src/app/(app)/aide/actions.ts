"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUser } from "@/lib/auth";
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
  await supportReply(user.id, conversationId(formData), question);
  revalidatePath("/aide");
  return { ok: true };
}

export async function askHuman(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getUser();
  if (!user) return { error: "Connecte-toi pour utiliser l'aide." };
  await handOff(user.id, conversationId(formData), "Demande de l'utilisateur");
  revalidatePath("/aide");
  return { ok: true, message: "Demande transmise à l'équipe Uny." };
}
