import { expect, test } from "@playwright/test";
import { connecter } from "./aide";

test("un visiteur non connecté est renvoyé vers la connexion", async ({ page }) => {
  await page.goto("/admin/utilisateurs");
  await expect(page).toHaveURL(/\/connexion$/);
});

test("mauvais mot de passe : message en français", async ({ page }) => {
  await connecter(page, "magasin", "mauvais-mdp", false);
  await expect(page.getByRole("alert").filter({ hasText: "incorrect" })).toHaveText("Identifiant ou mot de passe incorrect.");
});

test("champs vides : erreurs de validation en français", async ({ page }) => {
  await page.goto("/connexion");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByText("L'identifiant doit contenir au moins 3 caractères.")).toBeVisible();
  await expect(page.getByText("Saisissez votre mot de passe.")).toBeVisible();
});

test("chaque rôle arrive dans son espace et ne voit que lui", async ({ page }) => {
  await connecter(page, "magasin");
  await expect(page).toHaveURL(/\/magasin$/);
  const menu = page.getByRole("navigation", { name: "Espaces" });
  await expect(menu.getByRole("link")).toHaveText(["Stocks"]);
  // Accès direct à une autre page : refusé.
  await page.goto("/admin/utilisateurs");
  await expect(page).toHaveURL(/\/acces-refuse$/);
});

test("le commercial terrain arrive sur l'application terrain", async ({ page }) => {
  await connecter(page, "commercial1");
  await expect(page).toHaveURL(/\/terrain$/);
});

test("la direction voit tous les espaces", async ({ page }) => {
  await connecter(page, "pdg");
  await expect(page).toHaveURL(/\/direction$/);
  await expect(page.getByRole("navigation", { name: "Espaces" }).getByRole("link")).toHaveCount(12);
});

test("l'admin crée un compte, qui peut ensuite se connecter", async ({ page }) => {
  const identifiant = `test${Date.now() % 100000}`;
  await connecter(page, "admin");
  await expect(page).toHaveURL(/\/admin$|\/admin\/utilisateurs$/);
  await page.goto("/admin/utilisateurs");
  await page.getByLabel("Identifiant de connexion").fill(identifiant);
  await page.getByLabel("Mot de passe provisoire").fill("Provisoire123");
  await page.getByLabel(/^Nom/).fill("Test");
  await page.getByLabel("Production").check();
  await page.getByRole("button", { name: "Créer le compte" }).click();
  await expect(page.getByText(`Compte « ${identifiant} » créé.`)).toBeVisible();

  await page.getByRole("button", { name: "Déconnexion" }).click();
  await connecter(page, identifiant, "Provisoire123");
  await expect(page).toHaveURL(/\/production$/);
});

test("l'admin modifie un paramètre (pourcentage saisi à la française)", async ({ page }) => {
  await connecter(page, "admin");
  await page.goto("/admin/parametres");
  const champ = page.getByLabel("Taux de dotation");
  await champ.fill("4,5");
  await champ.locator("xpath=ancestor::form").getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Enregistré.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Taux de dotation")).toHaveValue("4,5");
  // Remise à la valeur par défaut.
  await page.getByLabel("Taux de dotation").fill("4");
  await page.getByLabel("Taux de dotation").locator("xpath=ancestor::form").getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Enregistré.")).toBeVisible();
});

test("les produits affichent le rendement théorique de référence", async ({ page }) => {
  await connecter(page, "admin");
  await page.goto("/admin/produits");
  await expect(page.getByText("10 175 paquets/t")).toBeVisible();
  await expect(page.getByText("6 508 paquets/t")).toBeVisible();
});
