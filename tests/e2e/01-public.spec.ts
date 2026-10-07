import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow } from "./helpers";

test("landing publique : message clair, carte d'exemple, sections et CTA", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Prouve que tu es étudiant");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Paie moins cher");
  // Le héros et son histoire en 3 temps
  await expect(page.getByText("L'histoire d'Aïssatou")).toBeVisible();
  for (const step of ["1 · Le problème", "2 · La solution : Uny", "3 · Le résultat"])
    await expect(page.getByText(step)).toBeVisible();
  await expect(page.getByText("Disponible dans toute la Guinée", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Obtenir ma carte gratuite/ })).toBeVisible();
  // Seule une carte d'EXEMPLE est affichée
  await expect(page.getByText("Exemple").first()).toBeVisible();
  for (const id of ["histoire", "avantages", "carte"]) await expect(page.locator(`#${id}`)).toBeAttached();
  await expect(page.getByText("Ton statut étudiant devient un avantage.")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("« Voir comment ça marche » fait défiler vers l'histoire", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Voir comment ça marche" }).click();
  await expect(page).toHaveURL(/#histoire/);
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
