import path from "node:path";
import { expect, test } from "@playwright/test";
import { ADMIN, expectNoHorizontalOverflow, login, logout, signUp } from "./helpers";

const fixture = (f: string) => path.join(__dirname, "..", "fixtures", f);

test("vérification étudiante : envoi du justificatif → validation admin → carte vérifiée → QR", async ({ page }) => {
  const s = await signUp(page);

  // Carte : non vérifiée au départ
  await page.goto("/carte");
  await expect(page.getByText("Non vérifié").first()).toBeVisible();

  // Envoi du justificatif
  await page.goto("/profil/verification");
  await page.waitForLoadState("networkidle");
  await page.selectOption("#document_type", "student_card");
  await page.setInputFiles('[data-testid="doc-input"]', fixture("student-card.jpg"));
  await page.getByRole("button", { name: "Envoyer mon justificatif" }).click();
  await expect(page.getByText(/a été envoyé à l'instant/)).toBeVisible();
  await expect(page.getByText("Vérification en cours").first()).toBeVisible();

  // Validation par l'administrateur
  await logout(page);
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto("/admin/verifications");
  const card = page.locator("li", { hasText: `${s.first} ${s.last}` }).first();
  await expect(card.locator("img")).toBeVisible(); // justificatif affiché via URL signée
  await card.getByRole("button", { name: "Valider" }).click();
  await expect(page.getByText(/Étudiant vérifié ✅/)).toBeVisible();
  await expect(page.locator("li", { hasText: `${s.first} ${s.last}` })).toHaveCount(0);

  // L'étudiant voit sa carte vérifiée + notification
  await logout(page);
  await login(page, s.email, s.password);
  await page.goto("/carte");
  await expect(page.getByText("Étudiant vérifié").first()).toBeVisible();
  await page.getByRole("button", { name: "Présenter ma carte" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.getByRole("button", { name: "Fermer" }).click();

  // Le QR code pointe vers la page publique de vérification
  const token = (await page.evaluate(() => fetch("/carte").then((r) => r.text()))).match(/\/v\/([a-f0-9]{36})/);
  expect(token).toBeTruthy();
  await page.goto("/notifications");
  await expect(page.getByText("Tu es vérifié ✅")).toBeVisible();

  // Un partenaire (non connecté) scanne le QR : carte authentique et vérifiée
  await logout(page);
  await page.goto(`/v/${token![1]}`);
  await expect(page.getByRole("heading", { name: "Étudiant vérifié" })).toBeVisible();
  await expect(page.getByText(`${s.first} ${s.last}`)).toBeVisible();
});

test("le justificatif est privé : aucun accès public", async ({ request }) => {
  const res = await request.get("http://127.0.0.1:54321/storage/v1/object/public/verification-docs/x/y.jpg");
  expect(res.ok()).toBeFalsy();
});

test("avantages : filtres, recherche, détail, favori", async ({ page }) => {
  await signUp(page);
  await page.goto("/avantages");
  await page.getByRole("link", { name: /Sport/ }).first().click();
  await expect(page).toHaveURL(/categorie=sport/);
  await expect(page.getByText("Abonnement mensuel à -30 %")).toBeVisible();
  await page.goto("/avantages?q=cinéma");
  await expect(page.getByText("Place de cinéma à -30 %")).toBeVisible();
  await page.goto("/avantages?quartier=Kipé");
  await expect(page.getByText("Burger étudiant à -15 %")).toBeVisible();
  await page.getByText("Burger étudiant à -15 %").click();
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Burger étudiant à -15 %");
  await expect(page.getByText("Contenu de démonstration.")).toBeVisible();
  await expect(page.getByRole("link", { name: /Vérifier mon statut/ })).toBeVisible();
  // Attendre la réponse de la Server Action avant de quitter la page
  await Promise.all([
    page.waitForResponse((r) => r.request().method() === "POST"),
    page.getByRole("button", { name: "Ajouter aux favoris" }).click(),
  ]);
  await expect(page.getByRole("button", { name: "Retirer des favoris" })).toBeVisible();
  await page.goto("/favoris");
  await expect(page.getByText("Burger étudiant à -15 %")).toBeVisible();
});

test("marketplace : publier avec photo, modifier, marquer vendu, supprimer", async ({ page }) => {
  await signUp(page);
  const title = `Calculatrice Casio E2E ${Date.now()}`;
  await page.goto("/marketplace/nouveau");
  await page.waitForLoadState("networkidle"); // attendre l'hydratation avant l'envoi de fichier
  await page.setInputFiles('[data-testid="image-input"]', fixture("product.jpg"));
  await expect(page.getByText("1/5 photos")).toBeVisible({ timeout: 15000 });
  await page.fill("#title", title);
  await page.selectOption("#category", "fournitures");
  await page.fill("#price_gnf", "150000");
  await page.fill("#description", "Très bon état, peu servi.");
  await page.selectOption("#district", "Kipé");
  await page.getByRole("button", { name: "Publier l'annonce" }).click();
  await expect(page.getByText("Ton annonce est en ligne")).toBeVisible();
  await expect(page.getByText("150 000 GNF").first()).toBeVisible();

  await page.getByRole("link", { name: "Modifier" }).click();
  await page.fill("#price_gnf", "130000");
  await page.getByRole("button", { name: "Enregistrer les modifications" }).click();
  await expect(page.getByText("130 000 GNF").first()).toBeVisible();

  await page.goto(`/marketplace?q=${encodeURIComponent(title)}`);
  await expect(page.getByText(title)).toBeVisible();

  await page.goto("/marketplace/mes-annonces");
  await page.getByRole("button", { name: "✅ Vendu" }).click();
  await expect(page.getByText("Vendu").first()).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Supprimer" }).click();
  await expect(page.getByText("Annonce supprimée.")).toBeVisible();
  await expect(page.getByText(title)).toHaveCount(0);
});

test("profil : modification, paramètres et sécurité", async ({ page }) => {
  await signUp(page);
  await page.goto("/profil/modifier");
  await page.fill("#field_of_study", "Génie civil");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Profil mis à jour ✅")).toBeVisible();
  await page.goto("/profil");
  await expect(page.getByText("Génie civil")).toBeVisible();
  await page.goto("/profil/parametres");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Préférences enregistrées ✅")).toBeVisible();
  await page.goto("/profil/securite");
  await expect(page.getByText("Changer de mot de passe")).toBeVisible();
});
