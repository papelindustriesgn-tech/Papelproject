"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createBackup } from "@/lib/backup";

export type BackupState = { ok?: boolean; message?: string; error?: string };

export async function backupNow(_prev: BackupState): Promise<BackupState> {
  await requireAdmin();
  try {
    const r = await createBackup();
    revalidatePath("/admin/sauvegardes");
    return { ok: true, message: `Sauvegarde créée : ${r.rows} lignes (${Math.ceil(r.bytes / 1024)} Ko).` };
  } catch (e) {
    console.error("[sauvegarde]", e);
    return { error: "Sauvegarde impossible. Réessaie dans un instant." };
  }
}
