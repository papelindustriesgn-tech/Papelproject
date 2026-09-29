import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow } from "./helpers";

test("landing publique : message clair, carte d'exemple, sections et CTA", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Ton statut étudiant devient un avantage");
  await expect(page.getByText("Version pilote — Conakry, Guinée", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Créer mon compte/ }).first()).toBeVisible();
  // Seule une carte d'EXEMPLE est affichée
  await expect(page.getByText("Exemple").first()).toBeVisible();
  for (const id of ["avantages", "carte", "jobs", "logement", "marketplace"]) await expect(page.locator(`#${id}`)).toBeAttached();
  await expect(page.getByText("Rejoins la communauté Uny")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("« Découvrir Uny » fait défiler vers la présentation", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Découvrir Uny" }).click();
  await expect(page).toHaveURL(/#decouvrir/);
});

test("les pages protégées redirigent vers la connexion", async ({ page }) => {
  await page.goto("/jobs");
  await expect(page).toHaveURL(/\/connexion\?next=%2Fjobs/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/connexion/);
});

test("un QR code invalide est signalé comme non authentique", async ({ page }) => {
  await page.goto("/v/" + "0".repeat(36));
  await expect(page.getByText("Carte introuvable")).toBeVisible();
});

test("PWA : manifest, service worker et métadonnées SEO", async ({ page, request }) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.short_name).toBe("Uny");
  expect(manifest.icons.length).toBeGreaterThanOrEqual(3);
  expect((await request.get("/sw.js")).ok()).toBeTruthy();
  expect((await request.get("/icons/icon-512.png")).ok()).toBeTruthy();
  await page.goto("/");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /opengraph-image/);
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
});
