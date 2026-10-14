import { gunzipSync } from "node:zlib";
import { expect, test } from "@playwright/test";
import { ADMIN, login, logout, signUp } from "./helpers";

test("sauvegarde : l'admin sauvegarde et télécharge la base, interdit aux autres", async ({ page, request }) => {
  const s = await signUp(page);

  // Un étudiant n'a accès ni à la page ni au téléchargement
  await page.goto("/admin/sauvegardes");
  await expect(page).not.toHaveURL(/admin\/sauvegardes/);
  expect(
    (await page.request.get("/admin/sauvegardes/telecharger?f=uny-2026-01-01-00-00-00.json.gz", { maxRedirects: 0 })).status(),
  ).toBe(403);
  // La tâche planifiée refuse les appels non signés
  expect((await request.get("/api/cron/sauvegarde")).status()).toBe(401);
  await logout(page);

  await login(page, ADMIN.email, ADMIN.password);
  await page.goto("/admin/sauvegardes");
  await page.getByRole("button", { name: "Sauvegarder maintenant" }).click();
  await expect(page.getByText(/Sauvegarde créée : \d+ lignes/)).toBeVisible({ timeout: 30_000 });
  await page.reload();
  const link = page.getByRole("link", { name: "Télécharger" }).first();
  await expect(link).toBeVisible();

  const res = await page.request.get((await link.getAttribute("href"))!);
  expect(res.ok()).toBeTruthy();
  const doc = JSON.parse(gunzipSync(await res.body()).toString("utf8"));
  expect(doc.format).toBe("uny-backup-1");
  expect(doc.tables["auth.users"].some((u: { email: string }) => u.email === s.email)).toBeTruthy();
  expect(doc.tables["public.profiles"].some((p: { email: string }) => p.email === s.email)).toBeTruthy();
  expect(doc.tables["public.deals"].length).toBeGreaterThan(0);
});
