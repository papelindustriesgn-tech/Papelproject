import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { redact } from "@/lib/ops/redact";

type Begin = { run: string; proceed: boolean; reason?: string; attempt?: number };

/** Clé d'idempotence quotidienne (fuseau Africa/Conakry = UTC). */
export function dailyKey(job: string, date = new Date()) {
  return `${job}:${date.toISOString().slice(0, 10)}`;
}

/**
 * Exécute une tâche une seule fois par clé d'idempotence, avec un nombre de tentatives limité.
 * Une clé déjà réussie n'est pas rejouée (aucun double effet) ; après `maxAttempts` échecs, la tâche passe
 * en échec définitif et une alerte critique est levée par la règle « job_failed ». L'erreur est nettoyée.
 */
export async function runJob<T extends Record<string, unknown>>(
  job: string,
  key: string,
  fn: () => Promise<T>,
  maxAttempts = 3,
): Promise<{ status: "succeeded"; result: T } | { status: "skipped"; reason: string } | { status: "failed"; error: string }> {
  const db = createAdminClient();
  const { data, error } = await db.rpc("ops_job_begin", { p_job: job, p_key: key, p_max: maxAttempts });
  if (error || !data) return { status: "failed", error: redact(error?.message ?? "début impossible") };
  const begin = data as unknown as Begin;
  if (!begin.proceed) return { status: "skipped", reason: begin.reason ?? "ignorée" };
  try {
    const result = await fn();
    await db.rpc("ops_job_finish", { p_run: begin.run, p_ok: true, p_result: result as never });
    return { status: "succeeded", result };
  } catch (e) {
    const message = redact(e);
    console.error(`[job ${job}]`, message);
    await db.rpc("ops_job_finish", { p_run: begin.run, p_ok: false, p_error: message });
    return { status: "failed", error: message };
  }
}
