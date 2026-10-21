import "server-only";
import { timingSafeEqual } from "node:crypto";

/**
 * Tâches planifiées (Vercel Cron) : seule une requête portant `Authorization: Bearer <CRON_SECRET>` est acceptée.
 * Sans CRON_SECRET configuré, toutes les requêtes sont refusées (pas de repli sur le User-Agent, falsifiable).
 * Le secret n'est jamais journalisé.
 */
export function isAuthorizedCron(authorization: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) {
    console.error("[cron] CRON_SECRET absent ou trop court : requête refusée");
    return false;
  }
  if (!authorization) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(authorization);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
