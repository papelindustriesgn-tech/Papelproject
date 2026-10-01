import { expect, test } from "@playwright/test";
import { ADMIN, login, logout, serviceRest, signUp } from "./helpers";

async function setVerified(unyId: string) {
  const res = await serviceRest(`profiles?uny_id=eq.${unyId}`, {
    method: "PATCH",
    body: JSON.stringify({ verification_status: "verified" }),
  });
  expect(res.ok).toBeTruthy();
}

test("partenaire : demande → validation admin → publication → scan d'une carte étudiante", async ({ page }) => {
  test.setTimeout(120_000);
  const run = `${Date.now()}`.slice(-7);
  const business = `Café Test ${run}`;
  const email = `partenaire.${run}@example.com`;

  // 1. Demande publique
  await page.goto("/partenaires");
  await page.waitForLoadState("networkidle");
  await page.fill("#business_name", business);
  await page.selectOption("#category", "restauration");
  await page.fill("#contact_name", "Alpha Bah");
  await page.fill("#phone", `66${run}`);
  await page.fill("#email", email);
  await page.fill("#offer", "-15 % sur présentation de la carte Uny");
  await page.getByRole("button", { name: "Envoyer ma demande" }).click();
  await expect(page.getByText("Demande envoyée")).toBeVisible();

  // 2. L'admin accepte : fiche + compte créés, mot de passe provisoire affiché
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto("/admin/demandes-partenaires");
  const card = page.locator("li", { hasText: business });
  await card.getByRole("button", { name: /Accepter/ }).click();
  const msg = card.getByText(/Mot de passe provisoire/);
  await expect(msg).toBeVisible();
  const password = (await msg.textContent())!.match(/provisoire : (\S+)/)![1];
  await logout(page);

  // 3. Étudiant inscrit (non vérifié pour l'instant)
  const student = await signUp(page);
  await page.goto("/carte");
  const unyId = (await page.locator("body").textContent())!.match(/GN-\d{4}-\d{6}/)![0];
  await logout(page);

  // 4. Le partenaire se connecte : il arrive dans son espace, pas dans l'espace étudiant
  await login(page, email, password).catch(() => undefined);
  await page.goto("/accueil");
  await expect(page).toHaveURL(/\/partenaire$/);
  await expect(page.getByRole("heading", { name: /Bonjour Alpha/ })).toBeVisible();

  // Offre étudiante
  await page.goto("/partenaire/offres/nouveau");
  await page.waitForLoadState("networkidle");
  await page.fill("#title", `Menu étudiant ${run}`);
  await page.fill("#discount_label", "-15 %");
  await page.getByRole("button", { name: "Publier" }).click();
  await expect(page).toHaveURL(/partenaire\/offres\?enregistre=1/);
  await expect(page.getByText(`Menu étudiant ${run}`)).toBeVisible();

  // Article en boutique (marketplace)
  await page.goto("/partenaire/boutique/nouveau");
  await page.waitForLoadState("networkidle");
  await page.fill("#title", `Sandwich ${run}`);
  await page.selectOption("#category", "autres");
  await page.fill("#price_gnf", "25000");
  await page.getByRole("button", { name: "Publier" }).click();
  await expect(page).toHaveURL(/partenaire\/boutique\?enregistre=1/);

  // 5. Scan (saisie du numéro) : étudiant non vérifié → refus
  await page.goto("/partenaire/scanner");
  await page.waitForLoadState("networkidle");
  await page.selectOption("select[name=deal_id]", { label: `-15 % · Menu étudiant ${run}` });
  await page.getByRole("tab", { name: "Saisir le numéro" }).click();
  await page.fill("input[name=code]", unyId);
  await page.getByRole("button", { name: "Vérifier", exact: true }).click();
  await expect(page.getByText("Statut étudiant non vérifié")).toBeVisible();
  await expect(page.getByText(`${student.first} ${student.last}`)).toBeVisible();

  // Étudiant vérifié → validé
  await setVerified(unyId);
  await page.getByRole("button", { name: /Vérifier une autre carte/ }).click();
  await page.fill("input[name=code]", unyId.toLowerCase());
  await page.getByRole("button", { name: "Vérifier", exact: true }).click();
  await expect(page.getByText("✅ Étudiant vérifié")).toBeVisible();
  await expect(page.getByText(`Tu peux appliquer : Menu étudiant ${run}`)).toBeVisible();

  // Code inconnu
  await page.getByRole("button", { name: /Vérifier une autre carte/ }).click();
  await page.fill("input[name=code]", "GN-1999-000001");
  await page.getByRole("button", { name: "Vérifier", exact: true }).click();
  await expect(page.getByText("Carte introuvable")).toBeVisible();

  // Tableau de bord : passage enregistré
  await page.goto("/partenaire");
  await expect(page.getByText(unyId).first()).toBeVisible();
  await logout(page);

  // 6. Côté étudiant : notification, offre et boutique visibles
  await login(page, student.email, student.password);
  await page.goto("/notifications");
  await expect(page.getByText("Carte Uny validée").first()).toBeVisible();
  await page.goto(`/avantages?q=${run}&ville=toutes`);
  await expect(page.getByText(`Menu étudiant ${run}`)).toBeVisible();
  await page.goto(`/marketplace?q=${run}&ville=toutes`);
  await expect(page.getByText(`Sandwich ${run}`)).toBeVisible();
  await expect(page.getByText(business).first()).toBeVisible();
});

test("un étudiant n'accède pas à l'espace partenaire", async ({ page }) => {
  await signUp(page);
  await page.goto("/partenaire");
  await expect(page).toHaveURL(/accueil/);
});
