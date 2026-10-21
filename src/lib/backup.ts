import "server-only";
import { gzipSync } from "node:zlib";
import { createAdminClient } from "@/lib/supabase/admin";

export const BACKUP_BUCKET = "backups";
import { BACKUP_KEEP } from "@/lib/backup-config";
export { BACKUP_KEEP };

/** Exporte la base (tables publiques + comptes), la compresse et la range dans le bucket privé. */
export async function createBackup() {
  const db = createAdminClient();
  const { data, error } = await db.rpc("backup_snapshot");
  if (error || !data) throw new Error(`Export impossible : ${error?.message ?? "réponse vide"}`);

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const name = `uny-${stamp}.json.gz`;
  const body = gzipSync(Buffer.from(JSON.stringify(data)));
  const { error: upErr } = await db.storage
    .from(BACKUP_BUCKET)
    .upload(name, body, { contentType: "application/gzip", upsert: true });
  if (upErr) throw new Error(`Envoi impossible : ${upErr.message}`);

  // Rotation : on garde les plus récentes
  const files = await listBackups();
  const old = files.slice(BACKUP_KEEP).map((f) => f.name);
  if (old.length) await db.storage.from(BACKUP_BUCKET).remove(old);

  const tables = (data as { tables: Record<string, unknown[]> }).tables;
  return { name, bytes: body.length, rows: Object.values(tables).reduce((n, rows) => n + rows.length, 0) };
}

export async function listBackups() {
  const { data } = await createAdminClient()
    .storage.from(BACKUP_BUCKET)
    .list("", { limit: 200, sortBy: { column: "name", order: "desc" } });
  return (data ?? [])
    .filter((f) => f.name.endsWith(".json.gz"))
    .map((f) => ({ name: f.name, size: (f.metadata?.size as number | undefined) ?? 0, createdAt: f.created_at }));
}

/** Lien de téléchargement temporaire (5 minutes). */
export async function backupDownloadUrl(name: string) {
  if (!/^uny-[\d-]+\.json\.gz$/.test(name)) return null;
  const { data } = await createAdminClient().storage.from(BACKUP_BUCKET).createSignedUrl(name, 300, { download: true });
  return data?.signedUrl ?? null;
}
