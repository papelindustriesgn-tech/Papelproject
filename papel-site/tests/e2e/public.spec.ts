import { expect, test } from "@playwright/test";

const PAGES = [
  "/",
  "/produits",
  "/produits/papel-doux-soft-pack",
  "/entreprise",
  "/professionnels",
  "/actualites",
  "/actualites/papel-doux-en-rayon",
  "/contact",
  "/mentions-legales",
  "/confidentialite",
];
const VIEWPORTS = [
  { width: 360, height: 740 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
  { width: 1536, height: 900 },
];

for (const path of PAGES) {
  test(`page ${path} : un seul h1, pas d'erreur console, pas de défilement horizontal`, async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(e.message));
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page).toHaveTitle(/Papel/);
    for (const vp of VIEWPORTS) {
      await page.setViewportSize(vp);
      await page.waitForTimeout(150);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `débordement à ${vp.width}px`).toBeLessThanOrEqual(0);
    }
    expect(errors).toEqual([]);
  });
}

test("les gammes non commercialisées n'apparaissent pas dans le catalogue", async ({ page }) => {
  await page.goto("/produits");
  await expect(page.getByRole("heading", { name: "Mouchoirs Papel Doux" })).toBeVisible();
  for (const name of ["Papier toilette", "Essuie-tout", "Serviettes en papier"]) {
    await expect(page.getByRole("heading", { name })).toHaveCount(0);
  }
  // produit en brouillon introuvable
  expect((await page.goto("/produits/papel-doux-petit-format"))?.status()).toBe(404);
});

test("fiche produit : caractéristiques non validées affichées comme telles", async ({ page }) => {
  await page.goto("/produits/papel-doux-soft-pack");
  await expect(page.getByText("300 feuilles")).toBeVisible();
  await expect(page.getByText("En cours de validation").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Demander un devis" })).toHaveAttribute("href", /demande=devis/);
});

test("menu mobile : ouverture, navigation et fermeture", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  const menu = page.locator("#menu-mobile");
  await expect(menu).toBeVisible();
  await menu.getByRole("link", { name: "Professionnels" }).click();
  await expect(page).toHaveURL(/\/professionnels/);
  await expect(menu).toBeHidden();
});

test("SEO : sitemap, robots, métadonnées et données structurées", async ({ page, request }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/produits/papel-doux-soft-pack");
  expect(sitemap).toContain("/actualites/papel-doux-en-rayon");
  expect(sitemap).not.toContain("petit-format");
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toMatch(/Disallow: \/admin/);
  await page.goto("/produits/papel-doux-soft-pack");
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /Papel Doux/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/produits\/papel-doux-soft-pack$/);
  const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(ld.some((t) => t.includes('"@type":"Product"'))).toBe(true);
  expect(ld.some((t) => t.includes('"@type":"Organization"'))).toBe(true);
});

test("page 404", async ({ page }) => {
  const res = await page.goto("/page-qui-n-existe-pas");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("introuvable");
});
