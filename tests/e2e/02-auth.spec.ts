import { expect, test } from "@playwright/test";
import { latestMailLink, login, logout, signUp, uniqueStudent } from "./helpers";

test("inscription complète → email de confirmation → dashboard", async ({ page }) => {
  const s = await signUp(page);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(`${s.first}`);
  await expect(page.getByText("Bienvenue sur Uny")).toBeVisible();
  await expect(page.getByRole("link", { name: /Ma carte/ }).first()).toBeVisible();
});

test("validation : champs manquants et email déjà utilisé", async ({ page }) => {
  const s = await signUp(page);
  await logout(page);
  await page.goto("/inscription");
  await page.getByRole("button", { name: "Continuer" }).click();
  // Le navigateur bloque le passage à l'étape 2 tant que l'étape 1 est invalide
  await expect(page.locator("#first_name")).toBeVisible();
  const again = { ...uniqueStudent(), email: s.email };
  await page.fill("#first_name", again.first);
  await page.fill("#last_name", again.last);
  await page.fill("#birth_date", "2002-01-01");
  await page.fill("#phone", again.phone);
  await page.fill("#email", again.email);
  await page.fill("#password", again.password);
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.selectOption("#university_id", { index: 2 });
  await page.fill("#field_of_study", "Droit");
  await page.selectOption("#study_level", "Licence 1");
  await page.check("input[name=terms]");
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page.getByText("Un compte existe déjà avec cet email.")).toBeVisible();
});

test("connexion par téléphone, mauvais mot de passe, déconnexion", async ({ page }) => {
  const s = await signUp(page);
  await logout(page);
  await page.goto("/connexion");
  await page.fill("#identifier", s.phone);
  await page.fill("#password", "MauvaisMdp1");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByText("Identifiants incorrects.")).toBeVisible();
  await login(page, `+224 ${s.phone}`, s.password);
  await expect(page).toHaveURL(/accueil/);
  await page.goto("/profil");
  await page.getByRole("button", { name: "Déconnexion" }).click();
  await expect(page).toHaveURL(/deconnecte=1/);
  await page.goto("/accueil");
  await expect(page).toHaveURL(/connexion/);
});

test("mot de passe oublié → lien email → nouveau mot de passe", async ({ page }) => {
  const s = await signUp(page);
  await logout(page);
  await page.goto("/mot-de-passe-oublie");
  await page.fill("#identifier", s.email);
  await page.getByRole("button", { name: "Recevoir le lien" }).click();
  await expect(page.getByText(/Si un compte correspond/)).toBeVisible();
  const link = await latestMailLink(s.email, /href="([^"]*type=recovery[^"]*)"/);
  await page.goto(link);
  await expect(page).toHaveURL(/reinitialiser-mot-de-passe/);
  await page.fill("#password", "NouveauMdp2026");
  await page.fill("#password_confirm", "NouveauMdp2026");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page).toHaveURL(/accueil\?mdp=1/);
  await logout(page);
  await login(page, s.email, "NouveauMdp2026");
});

test("suppression du compte depuis Profil → Sécurité", async ({ page }) => {
  const s = await signUp(page);
  await page.goto("/profil/securite");
  await page.waitForLoadState("networkidle");
  await page.fill("#delete_password", "mauvais1");
  await page.fill("#delete_confirm", "SUPPRIMER");
  await page.getByRole("button", { name: "Supprimer définitivement mon compte" }).click();
  await expect(page.getByText("Mot de passe incorrect")).toBeVisible();
  await page.fill("#delete_password", s.password);
  await page.fill("#delete_confirm", "SUPPRIMER");
  await page.getByRole("button", { name: "Supprimer définitivement mon compte" }).click();
  await page.waitForURL(/connexion\?supprime=1/);
  await expect(page.getByText("Ton compte et tes données ont été supprimés")).toBeVisible();
  await page.fill("#identifier", s.email);
  await page.fill("#password", s.password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/connexion/);
  await expect(page.getByRole("alert").or(page.locator("[role=status]")).first()).toBeVisible();
});
