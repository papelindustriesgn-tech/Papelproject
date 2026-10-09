import { expect, test } from "@playwright/test";
import { ADMIN, adminAsPartnerMember, login, logout, serviceRest, signUp } from "./helpers";

test("code promo : l'étudiant obtient son code, paie sur le code marchand Orange Money, le partenaire le valide", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const run = `${Date.now()}`.slice(-7);
  const merchant = `62${run.slice(-5)}`;
  await adminAsPartnerMember();

  // Étudiant vérifié
  const student = await signUp(page);
  await page.goto("/carte");
  const unyId = (await page.locator("body").textContent())!.match(/UNY-GN-\d{4}-[0-9A-Z]{6}/)![0];
  const res = await serviceRest(`profiles?uny_id=eq.${unyId}`, {
    method: "PATCH",
    body: JSON.stringify({ verification_status: "verified" }),
  });
  expect(res.ok).toBeTruthy();
  await logout(page);

  // Le partenaire renseigne son code marchand et publie une offre avec prix étudiant
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto("/partenaire/profil");
  await page.waitForLoadState("networkidle");
  await page.fill("#orange_money_merchant_code", "12ab");
  await page.getByRole("button", { name: "Enregistrer la fiche" }).click();
  await expect(page.getByText(/Chiffres uniquement/)).toBeVisible();
  await page.fill("#orange_money_merchant_code", merchant);
  await page.getByRole("button", { name: "Enregistrer la fiche" }).click();
  await expect(page.getByText("Fiche mise à jour ✅")).toBeVisible();

  await page.goto("/partenaire/offres/nouveau");
  await page.waitForLoadState("networkidle");
  await page.fill("#title", `Menu promo ${run}`);
  await page.fill("#discount_label", "-20 %");
  await page.fill("#price_gnf", "50000");
  await page.fill("#promo_price_gnf", "60000");
  await page.getByRole("button", { name: "Publier" }).click();
  await expect(page.getByText("Le prix promo doit être inférieur au prix normal")).toBeVisible();
  await page.fill("#promo_price_gnf", "40000");
  await page.getByRole("button", { name: "Publier" }).click();
  await expect(page).toHaveURL(/partenaire\/offres\?enregistre=1/);
  await logout(page);

  // L'étudiant obtient son code et déclare son paiement Orange Money
  await login(page, student.email, student.password);
  await page.goto(`/avantages?q=${run}&ville=toutes`);
  await page.getByText(`Menu promo ${run}`).click();
  await expect(page.getByText("-20 %").first()).toBeVisible();
  await page.getByRole("button", { name: "Obtenir mon code promo" }).click();
  const codeEl = page.getByTestId("promo-code");
  await expect(codeEl).toHaveText(/^UNY-[0-9A-Z]{4}-[0-9A-Z]{2}$/);
  const code = (await codeEl.textContent())!;
  await expect(page.getByText(merchant).first()).toBeVisible();
  await expect(page.getByText("40 000 GNF").first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Ouvrir Orange Money/ })).toHaveAttribute("href", "tel:%23144%23");
  await page.fill("#om-ref", "pp2610.1234.a56789");
  await page.getByRole("button", { name: /J'ai payé/ }).click();
  await expect(page.getByText(/Référence envoyée au partenaire/)).toBeVisible();

  // Le même code est conservé si l'étudiant revient sur l'offre
  await page.reload();
  await expect(page.getByTestId("promo-code")).toHaveText(code);
  await logout(page);

  // Le partenaire vérifie puis valide le code
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto("/partenaire/scanner");
  await page.waitForLoadState("networkidle");
  await page.fill("input[name=promo_code]", code.toLowerCase().replace(/-/g, ""));
  await page.getByRole("button", { name: "Vérifier le code" }).click();
  const result = page.getByTestId("promo-result");
  await expect(result.getByText("Code valable")).toBeVisible();
  await expect(result.getByText("PP2610.1234.A56789")).toBeVisible();
  await expect(result.getByText(`${student.first} ${student.last}`)).toBeVisible();
  await page.getByRole("button", { name: /Valider le code/ }).click();
  await expect(result.getByText("Code validé ✅")).toBeVisible();

  // Un code ne sert qu'une fois
  await page.fill("input[name=promo_code]", code);
  await page.getByRole("button", { name: "Vérifier le code" }).click();
  await expect(result.getByText("Code déjà utilisé")).toBeVisible();
  await logout(page);

  // L'étudiant voit son code utilisé et la notification
  await login(page, student.email, student.password);
  await page.goto("/avantages/mes-codes");
  await expect(page.getByText(code)).toBeVisible();
  await expect(page.getByText("Utilisé", { exact: true })).toBeVisible();
  await page.goto("/notifications");
  await expect(page.getByText("Code promo utilisé ✅").first()).toBeVisible();
});

test("conditions générales : codes promo et paiement Orange Money", async ({ page }) => {
  await page.goto("/conditions");
  await expect(page.getByRole("heading", { name: "Conditions générales d'utilisation" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "6. Paiement avec Orange Money" })).toBeVisible();
  await expect(page.getByText(/Uny n'encaisse, ne détient et ne transfère aucun fonds/)).toBeVisible();
});

test("marketplace : les promos des partenaires s'affichent en premier avec le pourcentage", async ({ page }) => {
  const run = `${Date.now()}`.slice(-7);
  await adminAsPartnerMember();
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto("/partenaire/boutique/nouveau");
  await page.waitForLoadState("networkidle");
  await page.fill("#title", `Casque promo ${run}`);
  await page.selectOption("#category", "informatique");
  await page.fill("#original_price_gnf", "100000");
  await page.fill("#price_gnf", "75000");
  await page.getByRole("button", { name: "Publier" }).click();
  await expect(page).toHaveURL(/partenaire\/boutique\?enregistre=1/);

  await page.goto("/marketplace?ville=toutes");
  await expect(page.getByRole("link", { name: "🔥 Promos" })).toHaveAttribute("aria-current", "page");
  const card = page.locator("a", { hasText: `Casque promo ${run}` });
  await expect(card).toBeVisible();
  await expect(card.getByText("-25 %")).toBeVisible();
  // Les annonces entre étudiants (sans prix barré) ne sont pas dans l'onglet Promos
  await expect(page.getByText("iPhone 11 64 Go")).toHaveCount(0);
  await card.click();
  await expect(page).toHaveURL(/\/marketplace\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: `Casque promo ${run}` })).toBeVisible();
  await expect(page.getByText("100 000 GNF")).toBeVisible();
  await expect(page.getByRole("link", { name: /Ouvrir Orange Money/ })).toBeVisible();
});

test("questionnaire partenaire : attentes et avantages proposés, visibles par l'admin", async ({ page }) => {
  const partnerId = await adminAsPartnerMember();
  await serviceRest(`partner_survey_responses?partner_id=eq.${partnerId}`, { method: "DELETE" });
  const run = `${Date.now()}`.slice(-7);
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto("/partenaire");
  await page.getByRole("link", { name: /Quelles sont vos attentes/ }).click();
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Envoyer mes réponses" }).click();
  await expect(page.getByText("Il manque quelques réponses.")).toBeVisible();

  await expect(page.getByText("Uny en 3 points")).toBeVisible();
  await page.locator("label", { hasText: "Un peu" }).click();
  await page.locator("label", { hasText: "Prix étudiant fixe" }).click();
  await page.locator("label", { hasText: "10 à 20 %" }).click();
  await page.locator("label", { hasText: "Remplir les heures creuses" }).click();
  await page.locator("label", { hasText: "Être payé facilement" }).click();
  await page.fill("textarea[name=comments]", `Midi en semaine ${run}`);
  await page.getByRole("button", { name: "Envoyer mes réponses" }).click();
  await expect(page.getByText("Merci pour ton avis !")).toBeVisible();

  await page.goto("/partenaire");
  await expect(page.getByRole("link", { name: /Quelles sont vos attentes/ })).toHaveCount(0);

  await page.goto("/admin/avis?type=partenaires");
  await expect(page.getByText(`Midi en semaine ${run}`)).toBeVisible();
  await expect(page.getByText("Ce qu'ils attendent d'Uny")).toBeVisible();
  const res = await page.request.get("/admin/avis/export?type=partenaires");
  const csv = await res.text();
  expect(csv).toContain(`Midi en semaine ${run}`);
  expect(csv).toContain("Remplir les heures creuses, Être payé facilement (Orange Money)");
});
