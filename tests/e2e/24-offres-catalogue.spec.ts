import { expect, test } from "@playwright/test";
import { ADMIN, adminAsPartnerMember, login, logout, serviceRest, signUp, userApi } from "./helpers";

/**
 * Offres façon UNiDAYS adaptées à la Guinée (données fictives) : offre à distance d'une marque sans site
 * (WhatsApp), contact et code révélés aux seuls étudiants vérifiés, vitrine, page de la marque, statistiques.
 */
test("offre à distance (WhatsApp) : publiée par une marque sans site, révélée aux étudiants vérifiés, visible dans la vitrine", async ({ page }) => {
  test.setTimeout(180_000);
  const run = `${Date.now()}`.slice(-7);
  const title = `Casque audio livré ${run}`;
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

  // La marque (sans site internet) publie une offre à distance : commande par WhatsApp, code personnel Uny
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto("/partenaire/offres/nouveau");
  await page.waitForLoadState("networkidle");
  await page.fill("#title", title);
  await page.getByLabel("Où l'offre est-elle valable ?").selectOption("online");
  await page.getByLabel("Avantage (offre sans prix)").fill("-25 %");
  await page.getByRole("button", { name: "Publier" }).click();
  await expect(page.getByText("Choisis comment l'étudiant te contacte")).toBeVisible();
  await page.getByLabel("Comment l'étudiant te contacte pour commander ?").selectOption("whatsapp");
  await page.getByLabel("Numéro ou lien de contact").fill("12 34");
  await page.getByLabel("Comment l'étudiant prouve qu'il a droit à la réduction ?").selectOption("unique");
  await page.getByRole("button", { name: "Publier" }).click();
  await expect(page.getByText("Numéro guinéen invalide (ex. 620 00 00 00)")).toBeVisible();
  await page.getByLabel("Numéro ou lien de contact").fill("+224 620 12 34 56");
  await page.getByRole("button", { name: "Publier" }).click();
  await expect(page).toHaveURL(/partenaire\/offres\?enregistre=1/);
  await expect(page.getByText(title)).toBeVisible();
  const [deal] = await (await serviceRest(`deals?title=eq.${encodeURIComponent(title)}&select=id,channel,online_code_mode`)).json();
  expect(deal).toMatchObject({ channel: "online", online_code_mode: "unique" });
  const [access] = await (await serviceRest(`deal_online_access?deal_id=eq.${deal.id}&select=contact_kind,contact`)).json();
  expect(access).toEqual({ contact_kind: "whatsapp", contact: "+224620123456" });

  // Le contact n'est jamais lisible directement, même par un étudiant vérifié
  const api = await userApi(student.email, student.password);
  expect(await api.select(`deal_online_access?deal_id=eq.${deal.id}`)).toEqual([]);
  const [publicRow] = await api.select(`deals?id=eq.${deal.id}&select=*`);
  expect(JSON.stringify(publicRow)).not.toContain("620123456");

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

  await page.goto("/avantages?canal=a-distance&ville=toutes");
  await expect(page.getByTestId("deal-showcase")).toHaveCount(0);
  await expect(page.getByText(title)).toBeVisible();

  await page.goto(`/avantages/marques/${partnerId}`);
  await expect(page.getByTestId("brand-name")).toHaveText(partner.name);
  await page.getByText(title).click();
  await expect(page).toHaveURL(new RegExp(`/avantages/${deal.id}`));
  await expect(page.getByText("★ Exclu Uny")).toBeVisible();
  await expect(page.getByText("Commande à distance")).toBeVisible();
  await page.getByRole("button", { name: "Obtenir mon code et le contact" }).click();
  const codeEl = page.getByTestId("online-code");
  await expect(codeEl).toHaveText(/^UNY-[0-9A-Z]{4}-[0-9A-Z]{2}$/);
  const code = (await codeEl.textContent())!;
  // Message WhatsApp prêt, avec le code personnel
  const href = (await page.getByTestId("online-link").getAttribute("href"))!;
  expect(href.startsWith("https://wa.me/224620123456?text=")).toBeTruthy();
  expect(decodeURIComponent(href)).toContain(code);
  await expect(page.getByTestId("online-link")).toContainText("Commander sur WhatsApp");
  // Lien de vérification Uny, inclus dans le message WhatsApp
  const verifyLink = (await page.getByTestId("verify-link").getAttribute("data-link"))!;
  expect(verifyLink).toMatch(/\/p\/[0-9a-f]{32}$/);
  expect(decodeURIComponent(href)).toContain(verifyLink);
  const verifyPath = new URL(verifyLink).pathname;
  const token = verifyPath.split("/").pop()!;
  // Un étudiant (même le titulaire) n'obtient ni le code ni l'identité par ce lien : réservé à la marque
  const lookup = await (await api.rpc("promo_link_lookup", { p_token: token })).json();
  expect(lookup).toEqual({ found: true, allowed: false, partner_name: partner.name });
  await page.goto(verifyPath);
  await expect(page).not.toHaveURL(/\/partenaire\/verifier/);
  await logout(page);

  // La marque ouvre le lien reçu sur WhatsApp : statut vérifié, code valable, photo/initiales et nom de l'étudiant
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto(verifyPath);
  await expect(page).toHaveURL(new RegExp(`/partenaire/verifier/${token}$`));
  const result = page.getByTestId("promo-result");
  await expect(result.getByText("Code valable")).toBeVisible();
  await expect(result.getByText(`${student.first} ${student.last}`)).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Code promo" })).toHaveCount(0);
  await result.getByRole("button", { name: /Confirmer l'utilisation/ }).click();
  await expect(result.getByText("Code validé ✅")).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("promo-result").getByText("Code déjà utilisé")).toBeVisible();
  // Lien inconnu : aucune donnée
  await page.goto(`/p/${"0".repeat(32)}`);
  await expect(page.getByTestId("verify-link-refused")).toContainText("Lien de vérification inconnu");
  await page.goto("/partenaire/offres");
  const row = page.locator("li", { hasText: title });
  await expect(row.getByText(/1 ouvertures à distance/)).toBeVisible();
  await expect(row.getByText(/1 codes obtenus/)).toBeVisible();
  await expect(row.getByText(/1 utilisés/)).toBeVisible();

  // Passage à un code fixe sur Facebook, puis retour en magasin : le contact est supprimé
  await page.goto(`/partenaire/offres/${deal.id}`);
  await page.waitForLoadState("networkidle");
  await expect(page.getByLabel("Numéro ou lien de contact")).toHaveValue("+224620123456");
  await page.getByLabel("Comment l'étudiant te contacte pour commander ?").selectOption("facebook");
  await page.getByLabel("Numéro ou lien de contact").fill("https://facebook.com/marque.test");
  await page.getByLabel("Comment l'étudiant prouve qu'il a droit à la réduction ?").selectOption("shared");
  await page.getByLabel("Code fixe").fill(`UNY${run}`);
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page).toHaveURL(/partenaire\/offres\?enregistre=1/);
  const [fb] = await (await serviceRest(`deal_online_access?deal_id=eq.${deal.id}&select=contact_kind,code`)).json();
  expect(fb).toEqual({ contact_kind: "facebook", code: `UNY${run}` });
  await page.goto(`/partenaire/offres/${deal.id}`);
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Où l'offre est-elle valable ?").selectOption("in_store");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page).toHaveURL(/partenaire\/offres\?enregistre=1/);
  expect(await (await serviceRest(`deal_online_access?deal_id=eq.${deal.id}`)).json()).toEqual([]);

  // Nettoyage (données fictives)
  await serviceRest(`deals?id=eq.${deal.id}`, { method: "DELETE" });
});
