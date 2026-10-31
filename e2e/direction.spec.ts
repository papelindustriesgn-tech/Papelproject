import { expect, test } from "@playwright/test";
import { connecter } from "./aide";

test("tableau de bord Direction : quatre questions, verdicts, explications, période", async ({ page }) => {
  await connecter(page, "pdg");
  await expect(page).toHaveURL(/\/applications$/);
  await page.getByRole("link", { name: "Tableau de bord" }).first().click();
  await expect(page).toHaveURL(/\/direction$/);
  for (const question of ["Gagne-t-on de l'argent ?", "Combien coûte un paquet ?", "L'usine tourne-t-elle bien ?", "Les clients sont-ils servis ?"]) {
    await expect(page.getByRole("heading", { name: question })).toBeVisible();
  }
  await expect(page.getByText(/Ça va|À surveiller|Critique|Pas encore de données/).first()).toBeVisible();
  await expect(page.getByText("Marge sur les ventes").first()).toBeVisible();

  // Bulle « ? » : explique le mot sans quitter la page.
  await page.getByRole("button", { name: /Que veut dire « Rendement »/ }).first().click();
  await expect(page.getByRole("note")).toContainText("tonne de papier");
  await expect(page).toHaveURL(/\/direction$/);

  await page.goto("/direction?periode=semaine");
  await expect(page.getByText(/Rendement/).first()).toBeVisible();
});

test("rapport hebdomadaire imprimable", async ({ page }) => {
  await connecter(page, "pdg");
  await page.goto("/direction/rapport");
  await expect(page.getByRole("main").locator("header").getByText("Rapport hebdomadaire", { exact: true })).toBeVisible();
  await expect(page.getByText("Comparé à la semaine précédente")).toBeVisible();
  await expect(page.getByRole("button", { name: "Imprimer / enregistrer en PDF" })).toBeVisible();
});

test("le tableau de bord Direction est interdit aux autres rôles", async ({ page }) => {
  await connecter(page, "finance");
  await page.goto("/direction");
  await expect(page).toHaveURL(/acces-refuse/);
});
