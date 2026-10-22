import { expect, test } from "@playwright/test";

/** Tâches planifiées : sans le bon CRON_SECRET, refus ; le User-Agent « vercel-cron » ne suffit plus. */
for (const path of ["/api/cron/sauvegarde", "/api/cron/questionnaires", "/api/cron/surveillance"]) {
  test(`${path} refuse les appels sans secret, même avec le User-Agent de Vercel`, async ({ request }) => {
    expect((await request.get(path)).status()).toBe(401);
    expect((await request.get(path, { headers: { "User-Agent": "vercel-cron/1.0" } })).status()).toBe(401);
    expect((await request.get(path, { headers: { Authorization: "Bearer devine" } })).status()).toBe(401);
  });
}
