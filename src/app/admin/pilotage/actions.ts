"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { diagnoseAlert } from "@/lib/ai/developer";
import type { FormState } from "@/lib/actions/types";

/** Évaluation immédiate des règles de surveillance (mêmes règles que la tâche quotidienne). */
export async function runChecks(_prev: FormState): Promise<FormState> {
  await requireAdmin();
  const { data, error } = await (await createClient()).rpc("ops_run_checks");
  if (error) return { error: "Évaluation impossible." };
  revalidatePath("/admin/pilotage");
  const r = data as { active: number; resolved: number };
  return { ok: true, message: `${r.active} alerte(s) active(s), ${r.resolved} résolue(s) automatiquement.` };
}

export async function updateAlert(alertId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const status = String(formData.get("status"));
  if (!z.uuid().safeParse(alertId).success || !["acknowledged", "resolved"].includes(status)) return { error: "Demande invalide." };
  const note = String(formData.get("note") ?? "").trim().slice(0, 500);
  const { error } = await (await createClient()).rpc("ops_alert_update", { p_alert: alertId, p_status: status, p_note: note || undefined });
  if (error) return { error: "Mise à jour impossible (alerte déjà résolue ?)." };
  revalidatePath("/admin/pilotage");
  return { ok: true, message: status === "resolved" ? "Alerte résolue." : "Alerte prise en charge." };
}

export async function requestDiagnosis(alertId: string, _prev: FormState): Promise<FormState> {
  const admin = await requireAdmin();
  if (!z.uuid().safeParse(alertId).success) return { error: "Demande invalide." };
  const r = await diagnoseAlert(admin.id, alertId);
  if (!r.ok) return { error: `Diagnostic indisponible : ${r.reason}.` };
  redirect(`/admin/ia/rapports/${r.id}`);
}
