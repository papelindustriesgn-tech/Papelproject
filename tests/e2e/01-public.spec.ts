import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow } from "./helpers";

test("landing publique : promesse, problème, solution, avantages, commerçants", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Ton statut étudiant");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("vaut de l'argent");
  await expect(page.getByText("Disponible dans toute la Guinée", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Obtenir ma carte gratuite/ })).toBeVisible();
  // Avant / après avec le statut étudiant (exemples)
  await expect(page.getByText("Avec ton statut étudiant", { exact: true })).toBeVisible();
  await expect(page.getByText("Exemples illustratifs de réductions étudiantes")).toBeVisible();
  // Le pourquoi, la solution, les commerçants
  await expect(page.getByText("Le problème", { exact: true })).toBeVisible();
  await expect(page.getByText("La solution : Uny")).toBeVisible();
  await expect(page.getByText("Restaurants & fast-foods")).toBeVisible();
  await expect(page.getByRole("link", { name: /Devenir partenaire gratuitement/ })).toBeVisible();
  await expect(page.getByText("Exemple").first()).toBeVisible();
  for (const id of ["pourquoi", "avantages", "histoire", "commercants", "carte"])
    await expect(page.locator(`#${id}`)).toBeAttached();
  await expect(page.getByText("Ton statut étudiant devient un avantage.")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("« Pourquoi Uny ? » fait défiler vers le problème", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Pourquoi Uny ?" }).click();
  await expect(page).toHaveURL(/#pourquoi/);
});

test("les pages protégées redirigent vers la connexion", async ({ page }) => {
  await page.goto("/carte");
  await expect(page).toHaveURL(/\/connexion\?next=%2Fcarte/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/connexion/);
});

test("logement et jobs sont retirés : anciens liens redirigés, plus de lien dans la navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#jobs")).toHaveCount(0);
  await expect(page.locator("#logement")).toHaveCount(0);
  await expect(page.locator('a[href="/jobs"], a[href="/logement"], a[href="/#jobs"], a[href="/#logement"]')).toHaveCount(0);
  await page.goto("/jobs");
  await expect(page).not.toHaveURL(/\/jobs/);
  await page.goto("/logement/abc");
  await expect(page).not.toHaveURL(/\/logement/);
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
