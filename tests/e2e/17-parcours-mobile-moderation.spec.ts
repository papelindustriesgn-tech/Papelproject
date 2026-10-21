import { expect, test } from "@playwright/test";
import { createAuthUser, serviceRest, signUp, uniqueStudent } from "./helpers";

/**
 * Parcours étudiants et commerçants : navigation à 5 onglets, Opportunités, carte hors ligne, signalement et
 * blocage sur la marketplace, caisse (caissier), refus de la caméra. Données 100 % fictives.
 */

test("navigation : Accueil · Avantages · Ma carte · Opportunités · Profil", async ({ page }) => {
  await signUp(page);
  const nav = page.getByRole("navigation", { name: "Navigation principale" });
  await expect(nav.getByRole("link")).toHaveText(["Accueil", "Avantages", "Ma carte", "Opportunités", "Profil"]);
  await nav.getByRole("link", { name: "Opportunités" }).click();
  await expect(page).toHaveURL(/\/opportunites/);
  await expect(page.getByRole("heading", { name: "Opportunités" })).toBeVisible();
  const tabs = page.getByRole("navigation", { name: "Rubrique opportunités" });
  await tabs.getByRole("link", { name: "Jobs" }).click();
  await expect(page).toHaveURL(/\/jobs/);
  await expect(nav.getByRole("link", { name: "Opportunités" })).toHaveAttribute("aria-current", "page");
  await tabs.getByRole("link", { name: "Logement" }).click();
  await expect(page).toHaveURL(/\/logement/);
  await tabs.getByRole("link", { name: "Marketplace" }).click();
  await expect(page).toHaveURL(/\/marketplace/);
  await expect(nav.getByRole("link", { name: "Opportunités" })).toHaveAttribute("aria-current", "page");
});

test("carte : hors connexion, la date de dernière actualisation est affichée", async ({ page, context }) => {
  await signUp(page);
  await page.goto("/carte");
  await expect(page.getByTestId("card-freshness")).toHaveCount(0);
  await context.setOffline(true);
  await expect(page.getByTestId("card-freshness")).toContainText("actualisée le");
  await context.setOffline(false);
  await expect(page.getByTestId("card-freshness")).toHaveCount(0);
});

test("marketplace : signaler une annonce puis bloquer le vendeur (ses annonces disparaissent)", async ({ page }) => {
  test.setTimeout(120_000);
  // Vendeur fictif avec une annonce
  const seller = uniqueStudent();
  const created = await (
    await createAuthUser({
      email: seller.email,
      password: seller.password,
      email_confirm: true,
      user_metadata: { first_name: "Vendeur", last_name: seller.last },
    })
  ).json();
  await serviceRest(`profiles?id=eq.${created.id}`, { method: "PATCH", body: JSON.stringify({ account_status: "approved" }) });
  const title = `Calculatrice fictive ${Date.now()}`;
  const [item] = await (
    await serviceRest("marketplace_items", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        seller_id: created.id,
        title,
        category: "informatique",
        condition: "bon_etat",
        price_gnf: 150000,
        description: "Annonce de test",
        contact_phone: "+224620000000",
      }),
    })
  ).json();
  expect(item?.id, JSON.stringify(item)).toBeTruthy();

  await signUp(page);
  await page.goto(`/marketplace/${item.id}`);
  await page.getByRole("button", { name: "Signaler l'annonce" }).click();
  await page.selectOption("#report-reason", "scam");
  await page.fill("#report-details", "Demande de paiement avant rencontre");
  await page.getByRole("button", { name: "Envoyer le signalement" }).click();
  await expect(page.getByText("l'équipe Uny va examiner")).toBeVisible();
  const [report] = await (await serviceRest(`content_reports?item_id=eq.${item.id}&select=reason,status`)).json();
  expect(report).toEqual({ reason: "scam", status: "open" });

  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Bloquer le vendeur" }).click();
  await expect(page).toHaveURL(/\/marketplace\?bloque=1/);
  await expect(page.getByText("Vendeur bloqué")).toBeVisible();
  await page.goto(`/marketplace?vue=tout&q=${encodeURIComponent(title)}`);
  await expect(page.getByText(title)).toHaveCount(0);
  // Page de l'annonce : introuvable pour l'étudiant qui a bloqué (page « introuvable », sans coordonnées)
  await page.goto(`/marketplace/${item.id}`);
  await expect(page.getByRole("heading", { name: title })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "WhatsApp" })).toHaveCount(0);
  // Déblocage depuis « Mes annonces »
  await page.goto("/marketplace/mes-annonces");
  await page.getByRole("button", { name: "Débloquer" }).click();
  await expect(page.getByRole("button", { name: "Débloquer" })).toHaveCount(0);
  await page.goto(`/marketplace/${item.id}`);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await serviceRest(`../../auth/v1/admin/users/${created.id}`, { method: "DELETE" });
});

test("caissier : seule la caisse est accessible ; caméra refusée → message et saisie manuelle", async ({ page, context }) => {
  const run = `${Date.now()}`.slice(-7);
  const [partner] = await (
    await serviceRest("partners", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ name: `Boutique fictive ${run}`, category: "restauration" }),
    })
  ).json();
  const email = `caisse.${run}@uny.test`;
  const created = await (
    await createAuthUser({
      email,
      password: "Caisse2026x",
      email_confirm: true,
      user_metadata: { first_name: "Awa", last_name: "Caisse" },
    })
  ).json();
  await serviceRest(`profiles?id=eq.${created.id}`, {
    method: "PATCH",
    body: JSON.stringify({ role: "partner", account_status: "approved" }),
  });
  await serviceRest("partner_members", {
    method: "POST",
    body: JSON.stringify({ partner_id: partner.id, user_id: created.id, role: "cashier" }),
  });
  await context.clearPermissions();
  await page.goto("/connexion");
  await page.fill("#identifier", email);
  await page.fill("#password", "Caisse2026x");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(/\/partenaire/);
  await page.goto("/partenaire");
  await expect(page).toHaveURL(/\/partenaire\/scanner/);
  await page.goto("/partenaire/offres");
  await expect(page).toHaveURL(/\/partenaire\/scanner/);
  await expect(page.getByText("Caisse partenaire").first()).toBeAttached();
  // Caméra refusée (aucune autorisation accordée au navigateur de test)
  await expect(page.getByRole("alert").filter({ hasText: /caméra/i })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Saisir le numéro" }).click();
  await expect(page.getByLabel("Numéro de carte Uny")).toBeVisible();
  await serviceRest(`partners?id=eq.${partner.id}`, { method: "DELETE" });
  await serviceRest(`../../auth/v1/admin/users/${created.id}`, { method: "DELETE" });
});
