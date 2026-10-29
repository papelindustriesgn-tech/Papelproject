import { expect, test } from "@playwright/test";
import { ADMIN, adminAsPartnerMember, login, logout, serviceRest, signUp, userApi } from "./helpers";

/**
 * Offres façon UNiDAYS (données fictives) : offre en ligne publiée par la marque, lien et code révélés aux
 * seuls étudiants vérifiés, vitrine (en ligne, exclusivités, marques), page de la marque, statistiques.
 */
test("offre en ligne : publiée par la marque, révélée aux étudiants vérifiés, visible dans la vitrine", async ({ page }) => {
  test.setTimeout(180_000);
  const run = `${Date.now()}`.slice(-7);
  const title = `Casque audio en ligne ${run}`;
  const partnerId = await adminAsPartnerMember();
  const [partner] = await (await serviceRest(`partners?id=eq.${partnerId}&select=name`)).json();

  // Étudiant non vérifié et étudiant vérifié
  const pending = await signUp(page);
  await logout(page);
  const student = await signUp(page);
  await page.goto("/carte");
  const unyId = (await page.locator("body").textContent())!.match(/UNY-GN-\d{4}-[0-9A-Z]{6}/)![0];
  expect(
    (await serviceRest(`profiles?uny_id=eq.${unyId}`, { method: "PATCH", body: JSON.stringify({ verification_status: "verified" }) }))
      .ok,
  ).toBeTruthy();
  await logout(page);

  // La marque publie une offre en ligne avec le code de sa boutique
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto("/partenaire/offres/nouveau");
  await page.waitForLoadState("networkidle");
  await page.fill("#title", title);
  await page.getByLabel("Où l'offre est-elle valable ?").selectOption("online");
  await page.getByLabel("Avantage (offre sans prix)").fill("-25 %");
  await page.getByRole("button", { name: "Publier" }).click();
  await expect(page.getByText("Indique le lien de la boutique en ligne (https://…)")).toBeVisible();
  await page.getByLabel("Lien de la boutique en ligne").fill("http://boutique.example/uny");
  await page.getByLabel("Comment l'étudiant obtient la réduction en ligne ?").selectOption("shared");
  await page.getByRole("button", { name: "Publier" }).click();
  await expect(page.getByText("Indique le lien de la boutique en ligne (https://…)")).toBeVisible();
  await expect(page.getByText("Indique le code de ta boutique")).toBeVisible();
  await page.getByLabel("Lien de la boutique en ligne").fill("https://boutique.example/uny");
  await page.getByLabel("Code de ta boutique en ligne").fill(`UNY${run}`);
  await page.getByRole("button", { name: "Publier" }).click();
  await expect(page).toHaveURL(/partenaire\/offres\?enregistre=1/);
  await expect(page.getByText(title)).toBeVisible();
  const [deal] = await (await serviceRest(`deals?title=eq.${encodeURIComponent(title)}&select=id,channel,online_code_mode`)).json();
  expect(deal).toMatchObject({ channel: "online", online_code_mode: "shared" });

  // Le lien et le code ne sont jamais lisibles directement, même par un étudiant vérifié
  const api = await userApi(student.email, student.password);
  expect(await api.select(`deal_online_access?deal_id=eq.${deal.id}`)).toEqual([]);
  const [publicRow] = await api.select(`deals?id=eq.${deal.id}&select=*`);
  expect(JSON.stringify(publicRow)).not.toContain(`UNY${run}`);
  expect(JSON.stringify(publicRow)).not.toContain("boutique.example");

  // L'administration en fait une exclusivité
  await page.goto(`/admin/avantages/${deal.id}`);
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Exclusivité Uny (badge « Exclu Uny »)").check();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page).toHaveURL(/admin\/avantages\?enregistre=1/);
  await logout(page);

  // Étudiant non vérifié : invité à vérifier son statut, aucun lien
  await login(page, pending.email, pending.password);
  await page.goto(`/avantages/${deal.id}`);
  await expect(page.getByRole("link", { name: /Vérifier mon statut/ })).toBeVisible();
  await expect(page.getByTestId("online-panel")).toHaveCount(0);
  await logout(page);

  // Étudiant vérifié : vitrine, filtre « En ligne », page de la marque, puis code et lien
  await login(page, student.email, student.password);
  await page.goto("/avantages?ville=toutes");
  await expect(page.getByTestId("deal-showcase")).toBeVisible();
  await expect(page.getByTestId("rail-exclusives").getByText(title)).toBeVisible();
  await expect(page.getByTestId("rail-online").getByText(title)).toBeVisible();
  await expect(page.getByTestId("rail-brands").getByText(partner.name)).toBeVisible();

  await page.goto("/avantages?canal=en-ligne&ville=toutes");
  await expect(page.getByTestId("deal-showcase")).toHaveCount(0);
  await expect(page.getByText(title)).toBeVisible();

  await page.goto(`/avantages/marques/${partnerId}`);
  await expect(page.getByTestId("brand-name")).toHaveText(partner.name);
  await page.getByText(title).click();
  await expect(page).toHaveURL(new RegExp(`/avantages/${deal.id}`));
  await expect(page.getByText("★ Exclu Uny")).toBeVisible();
  await expect(page.getByText("Sur le site de la marque")).toBeVisible();
  await page.getByRole("button", { name: "Obtenir mon code en ligne" }).click();
  await expect(page.getByTestId("online-code")).toHaveText(`UNY${run}`);
  await expect(page.getByTestId("online-link")).toHaveAttribute("href", "https://boutique.example/uny");
  await logout(page);

  // Statistiques de la marque : l'ouverture en ligne est comptée
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto("/partenaire/offres");
  const row = page.locator("li", { hasText: title });
  await expect(row.getByText(/1 ouvertures en ligne/)).toBeVisible();

  // Retour en magasin : le lien et le code sont supprimés
  await page.goto(`/partenaire/offres/${deal.id}`);
  await page.waitForLoadState("networkidle");
  await expect(page.getByLabel("Code de ta boutique en ligne")).toHaveValue(`UNY${run}`);
  await page.getByLabel("Où l'offre est-elle valable ?").selectOption("in_store");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page).toHaveURL(/partenaire\/offres\?enregistre=1/);
  expect(await (await serviceRest(`deal_online_access?deal_id=eq.${deal.id}`)).json()).toEqual([]);

  // Nettoyage (données fictives)
  await serviceRest(`deals?id=eq.${deal.id}`, { method: "DELETE" });
});
