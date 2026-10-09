import { expect, test } from "@playwright/test";
import { ADMIN, latestMailLink, login, logout, serviceRest, signUp } from "./helpers";

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

  await expect(page.getByText("Uny en 3 points")).toBeVisible();
  await page.locator("label", { hasText: "Oui, c'est clair" }).click();
  await page.locator("label", { hasText: "Restauration" }).click();
  await page.locator("label", { hasText: "Tech" }).click();
  await page.locator("label", { hasText: "Oui, sûrement" }).click();
  await page.locator("label", { hasText: "Orange Money" }).click();
  await page.fill("textarea[name=missing]", `-30 % sur internet ${run}`);
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
  await expect(page.getByText(`-30 % sur internet ${run}`)).toBeVisible();
  await expect(page.getByText(s.email)).toBeVisible();
  await expect(page.getByText("Domaines où ils veulent des réductions")).toBeVisible();
  const res = await page.request.get("/admin/avis/export");
  expect(res.headers()["content-type"]).toContain("text/csv");
  const csv = await res.text();
  expect(csv).toContain(`-30 % sur internet ${run}`);
  expect(csv).toContain("Restauration, Tech");
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

test("questionnaire : relances automatiques (notification + email) tant que l'étudiant n'a pas répondu", async ({
  page,
  request,
}) => {
  const s = await signUp(page);
  const [profile] = await (await serviceRest(`profiles?email=eq.${encodeURIComponent(s.email)}&select=id`)).json();
  // Inscrit depuis 3 jours, invitation initiale reçue il y a 5 jours
  const old = (days: number) => new Date(Date.now() - days * 86400_000).toISOString();
  await serviceRest(`profiles?id=eq.${profile.id}`, { method: "PATCH", body: JSON.stringify({ created_at: old(3) }) });
  await serviceRest(`notifications?user_id=eq.${profile.id}&type=eq.survey`, {
    method: "PATCH",
    body: JSON.stringify({ created_at: old(5), emailed_at: old(5) }),
  });
  const count = async () =>
    (await (await serviceRest(`notifications?user_id=eq.${profile.id}&type=eq.survey&select=id`)).json()).length;
  expect(await count()).toBe(1);

  expect((await request.get("/api/cron/questionnaires")).status()).toBe(401);
  const run = () => request.get("/api/cron/questionnaires", { headers: { "user-agent": "vercel-cron/1.0" } });
  const res = await run();
  expect(res.ok()).toBeTruthy();
  expect((await res.json()).reminders).toBeGreaterThanOrEqual(1);
  expect(await count()).toBe(2);
  const mail = await latestMailLink(s.email, /href="([^"]*\/avis)"/);
  expect(mail).toContain("/avis");

  // Pas de nouvelle relance avant 4 jours
  await run();
  expect(await count()).toBe(2);

  // La relance apparaît dans les notifications de l'étudiant
  await page.goto("/notifications");
  await expect(page.getByText("Ton avis compte").first()).toBeVisible();
});
