import { expect, test } from "@playwright/test";
import { ADMIN, login, signUp, logout } from "./helpers";

test("un étudiant n'accède pas à l'administration", async ({ page }) => {
  await signUp(page);
  await page.goto("/admin");
  await expect(page).toHaveURL(/accueil/);
});

test("admin : statistiques, CRUD avantage, masquage, modération", async ({ page }) => {
  await login(page, ADMIN.email, ADMIN.password);
  const run = Date.now();
  await page.goto("/admin");
  await expect(page.getByText("Inscrits", { exact: true })).toBeVisible();
  await expect(page.getByText(/comptes de test/)).toBeVisible();

  // Création d'un avantage
  await page.goto("/admin/avantages/nouveau");
  await page.selectOption("#partner_id", { index: 1 });
  await page.fill("#title", `Offre test admin ${run}`);
  await page.fill("#discount_label", "-50 %");
  await page.selectOption("#category", "loisirs");
  await page.getByRole("button", { name: "Créer" }).click();
  await expect(page).toHaveURL(/admin\/avantages\?enregistre=1/);
  const row = page.locator("li", { hasText: `Offre test admin ${run}` });
  await expect(row).toBeVisible();

  // Visible côté étudiant
  await page.goto(`/avantages?q=${run}`);
  await expect(page.getByText(`Offre test admin ${run}`)).toBeVisible();

  // Masquer puis supprimer
  await page.goto(`/admin/avantages?q=${run}`);
  await page.getByRole("button", { name: "Masquer" }).first().click();
  await expect(page.locator("li", { hasText: `Offre test admin ${run}` }).getByText("Masqué")).toBeVisible();
  await page
    .locator("li", { hasText: `Offre test admin ${run}` })
    .getByRole("link", { name: "Modifier" })
    .click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Supprimer" }).click();
  await expect(page).toHaveURL(/supprime=1/);

  // Création d'un logement et d'un job
  await page.goto("/admin/logements/nouveau");
  await page.fill("#title", `Logement test admin ${run}`);
  await page.selectOption("#type", "studio");
  await page.selectOption("#district", "Kaloum");
  await page.fill("#price_gnf", "1000000");
  await page.getByRole("button", { name: "Créer" }).click();
  await expect(page.getByText(`Logement test admin ${run}`)).toBeVisible();
  await page.goto("/admin/jobs/nouveau");
  await page.fill("#title", `Job test admin ${run}`);
  await page.fill("#company_name", "Entreprise test");
  await page.selectOption("#type", "job");
  await page.getByRole("button", { name: "Créer" }).click();
  await expect(page.getByText(`Job test admin ${run}`)).toBeVisible();

  // Nettoyage : suppression des contenus de test
  for (const [entity, label] of [
    ["logements", `Logement test admin ${run}`],
    ["jobs", `Job test admin ${run}`],
  ]) {
    await page.goto(`/admin/${entity}?q=${run}`);
    await page.locator("li", { hasText: label }).getByRole("link", { name: "Modifier" }).click();
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Supprimer" }).click();
    await expect(page).toHaveURL(/supprime=1/);
  }

  // Modération marketplace
  await page.goto("/admin/marketplace?q=Vélo");
  const item = page.locator("li", { hasText: "Vélo de ville" });
  await item.getByPlaceholder("Motif du retrait").fill("Test de modération");
  await item.getByRole("button", { name: "Retirer" }).click();
  await expect(item.getByText("removed")).toBeVisible();
  await item.getByRole("button", { name: "Rétablir" }).click();
  await expect(item.getByText("active")).toBeVisible();

  await page.goto("/admin/statistiques");
  await expect(page.getByText("Offres consultées")).toBeVisible();
  await page.goto("/admin/utilisateurs");
  await expect(page.getByText(/comptes réels/)).toBeVisible();
  await logout(page);
});

test("enquête d'avis : invitation, réponse, résultats admin et export", async ({ page }) => {
  const s = await signUp(page);
  const run = s.last;
  await expect(page.getByRole("link", { name: /Donne ton avis sur Uny/ })).toBeVisible();
  await page.goto("/notifications");
  await expect(page.getByText("Donne ton avis sur Uny").first()).toBeVisible();

  await page.goto("/avis");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Envoyer mon avis" }).click();
  await expect(page.getByText("Il manque quelques réponses.")).toBeVisible();

  await page.locator("label", { hasText: "WhatsApp" }).click();
  await page.getByLabel("4 sur 5").check({ force: true });
  await page.locator("label", { hasText: "Jobs & stages" }).click();
  await page.locator("label", { hasText: "Logement" }).click();
  await page.locator("label").filter({ hasText: /^9$/ }).click();
  await page.locator("label", { hasText: "Peut-être" }).click();
  await page.fill("textarea[name=missing]", `Plus de stages ${run}`);
  await page.getByText("J'accepte d'être contacté(e)").click();
  await page.getByRole("button", { name: "Envoyer mon avis" }).click();
  await expect(page.getByText("Merci pour ton avis !")).toBeVisible();

  await page.goto("/accueil");
  await expect(page.getByRole("link", { name: /Donne ton avis sur Uny/ })).toHaveCount(0);
  await page.goto("/avis");
  await expect(page.getByText("Tu as déjà répondu")).toBeVisible();
  await logout(page);

  await login(page, ADMIN.email, ADMIN.password);
  await page.goto("/admin/avis");
  await expect(page.getByRole("heading", { name: "Avis des inscrits" })).toBeVisible();
  await expect(page.getByText(`Plus de stages ${run}`)).toBeVisible();
  await expect(page.getByText(s.email)).toBeVisible();
  const res = await page.request.get("/admin/avis/export");
  expect(res.headers()["content-type"]).toContain("text/csv");
  expect(await res.text()).toContain(`Plus de stages ${run}`);
});

test("admin : contacter les inscrits par WhatsApp ou SMS", async ({ page }) => {
  const s = await signUp(page);
  await logout(page);
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto("/admin/contacts");
  const row = page.locator("li", { hasText: s.last });
  await expect(row).toBeVisible();
  const wa = row.getByRole("link", { name: "WhatsApp" });
  const href = decodeURIComponent((await wa.getAttribute("href")) ?? "");
  expect(href).toContain(`wa.me/224`);
  expect(href).toContain(`Bonjour ${s.first}`);
  expect(href).toContain("/avis");
  await expect(row.getByRole("link", { name: "SMS" })).toHaveAttribute("href", /^sms:\+224/);
});
