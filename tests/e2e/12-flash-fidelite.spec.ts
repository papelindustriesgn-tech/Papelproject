import { expect, test, type Page } from "@playwright/test";
import { createAuthUser, login, logout, serviceRest, signUp } from "./helpers";

async function verify(page: Page) {
  await page.goto("/carte");
  const unyId = (await page.locator("body").textContent())!.match(/UNY-GN-\d{4}-[0-9A-Z]{6}/)![0];
  await serviceRest(`profiles?uny_id=eq.${unyId}`, {
    method: "PATCH",
    body: JSON.stringify({ verification_status: "verified" }),
  });
  return unyId;
}

test("offre flash à places limitées, carte de fidélité et récompense offerte par le partenaire", async ({ page }) => {
  test.setTimeout(180_000);
  const run = `${Date.now()}`.slice(-7);
  const ret = { Prefer: "return=representation" };

  // Partenaire réel avec son compte
  const [partner] = await (
    await serviceRest("partners", {
      method: "POST",
      headers: ret,
      body: JSON.stringify({ name: `Resto ${run}`, category: "restauration" }),
    })
  ).json();
  const owner = { email: `resto.${run}@uny.test`, password: "Resto2026x" };
  const created = await (
    await createAuthUser({ ...owner, email_confirm: true, user_metadata: { first_name: "Awa", last_name: `Resto${run}` } })
  ).json();
  expect(
    (await serviceRest(`profiles?id=eq.${created.id}`, { method: "PATCH", body: JSON.stringify({ role: "partner" }) })).ok,
  ).toBeTruthy();
  await serviceRest("partner_members", { method: "POST", body: JSON.stringify({ partner_id: partner.id, user_id: created.id }) });

  // Deux étudiants vérifiés
  const s1 = await signUp(page);
  const uny1 = await verify(page);
  await logout(page);
  const s2 = await signUp(page);
  await verify(page);
  await logout(page);

  // Le partenaire crée sa carte de fidélité puis une offre flash (1 place)
  await login(page, owner.email, owner.password);
  await page.goto("/partenaire/fidelite");
  await page.fill("#stamps_required", "3");
  await page.fill("#reward", "1 jus offert");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Programme de fidélité actif ✅")).toBeVisible();

  await page.goto("/partenaire/offres/nouveau");
  await page.waitForLoadState("networkidle");
  await page.fill("#title", `Poulet braisé ${run}`);
  await page.fill("#discount_label", "-30 %");
  await page.fill("#price_gnf", "50000");
  await page.fill("#promo_price_gnf", "35000");
  await page.selectOption("#flash_hours", "4");
  await page.fill("#flash_quantity", "1");
  await page.getByRole("button", { name: "Publier" }).click();
  await expect(page).toHaveURL(/partenaire\/offres\?enregistre=1/);
  await logout(page);

  // Tous les étudiants validés sont prévenus immédiatement
  const [st1] = await (await serviceRest(`profiles?email=eq.${encodeURIComponent(s1.email)}&select=id`)).json();
  const flashNotifs = await (await serviceRest(`notifications?user_id=eq.${st1.id}&type=eq.flash_deal&select=title,body`)).json();
  expect(flashNotifs).toHaveLength(1);
  expect(flashNotifs[0].title).toBe(`⚡ Offre flash : Resto ${run}`);
  expect(flashNotifs[0].body).toContain("1 places");

  // Étudiant 1 : section flash, bandeau, programme de fidélité, il prend la seule place
  await login(page, s1.email, s1.password);
  await page.goto("/accueil");
  await expect(page.getByRole("heading", { name: "⚡ Offres flash" })).toBeVisible();
  await page.getByText(`Poulet braisé ${run}`).first().click();
  await expect(page.getByTestId("flash-banner")).toContainText("Plus que 1 place");
  await expect(page.getByTestId("loyalty-info")).toContainText("3 passages = 1 jus offert");
  await page.getByRole("button", { name: "Obtenir mon code promo" }).click();
  const code = (await page.getByTestId("promo-code").textContent())!;
  await logout(page);

  // Étudiant 2 : l'offre est épuisée
  await login(page, s2.email, s2.password);
  await page.goto("/avantages?ville=toutes&q=" + run);
  await page.getByText(`Poulet braisé ${run}`).first().click();
  await expect(page.getByText("Offre flash épuisée.")).toBeVisible();
  await logout(page);

  // Le partenaire valide le code : premier tampon
  await login(page, owner.email, owner.password);
  await page.goto("/partenaire/scanner");
  await page.waitForLoadState("networkidle");
  await page.fill("input[name=promo_code]", code);
  await page.getByRole("button", { name: "Vérifier le code" }).click();
  await page.getByRole("button", { name: /Valider le code/ }).click();
  await expect(page.getByTestId("promo-result").getByText("Code validé ✅")).toBeVisible();
  await expect(page.getByTestId("loyalty-block")).toContainText("Fidélité : 1/3 tampons");

  // Il récompense son client depuis « Mes meilleurs clients »
  await page.goto("/partenaire/fidelite");
  const row = page.getByTestId("customer-row").filter({ hasText: s1.first });
  await expect(row).toContainText("1 passage");
  await expect(row).toContainText("35 000 GNF");
  await row.getByRole("button", { name: "🎁 Offrir la récompense" }).click();
  await expect(row.getByText("Récompense offerte 🎁 Le client est prévenu.")).toBeVisible();

  // Au comptoir, la carte du client montre la récompense : le partenaire l'utilise (pas de 2e tampon le même jour)
  await page.goto("/partenaire/scanner");
  await page.waitForLoadState("networkidle");
  await page.getByRole("tab", { name: "Saisir le numéro" }).click();
  await page.fill("input[name=code]", uny1);
  await page.getByRole("button", { name: "Vérifier", exact: true }).click();
  const block = page.getByTestId("loyalty-block");
  await expect(block).toContainText("1/3 tampons");
  await expect(block).toContainText("1 récompense : 1 jus offert");
  await block.getByRole("button", { name: "Utiliser la récompense" }).click();
  await expect(block.getByText("Récompense utilisée ✅")).toBeVisible();
  await logout(page);

  // L'étudiant suit sa carte de fidélité et a été prévenu
  await login(page, s1.email, s1.password);
  await page.goto("/avantages/fidelite");
  await expect(page.getByTestId("loyalty-card")).toContainText(`Resto ${run}`);
  await expect(page.getByTestId("loyalty-card")).toContainText("1/3");
  await page.goto("/notifications");
  await expect(page.getByText(`🎁 Resto ${run} t'offre une récompense`)).toBeVisible();

  // Bilan hebdomadaire du partenaire
  const report = await serviceRest("rpc/partner_weekly_report", { method: "POST", body: "{}" });
  expect(report.ok).toBeTruthy();
  const [rep] = await (await serviceRest(`notifications?user_id=eq.${created.id}&type=eq.partner_report&select=body`)).json();
  expect(rep.body).toContain("1 codes obtenus · 1 utilisés · 1 clients · 35 000 GNF de ventes");

  // Nettoyage : ce partenaire réel masquerait les exemples de démo des autres tests
  await serviceRest(`partners?id=eq.${partner.id}`, { method: "DELETE" });
});
