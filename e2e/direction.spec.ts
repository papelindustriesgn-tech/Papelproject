import { expect, test } from "@playwright/test";
import { connecter } from "./aide";

test("tableau de bord Direction : cinq domaines, alertes, comparaison, période", async ({ page }) => {
  await connecter(page, "pdg");
  await expect(page).toHaveURL(/\/direction$/);
  for (const titre of ["Commercial", "Production", "Stock", "Finance", "Distribution"]) {
    await expect(page.getByRole("heading", { name: titre, exact: true })).toBeVisible();
  }
  await expect(page.getByRole("heading", { name: /Alertes prioritaires du jour/ })).toBeVisible();
  await expect(page.getByText("Marge brute", { exact: true })).toBeVisible();
  await expect(page.getByText(/vs période précédente/).first()).toBeVisible();

  await page.getByLabel("Période").selectOption("7j");
  await page.getByRole("button", { name: "Afficher" }).click();
  await expect(page).toHaveURL(/periode=7j/);
  await expect(page.getByText(/Rendement réel \/ théorique/).first()).toBeVisible();
});

test("rapport hebdomadaire imprimable", async ({ page }) => {
  await connecter(page, "pdg");
  await page.goto("/direction/rapport");
  await expect(page.locator("header").getByText("Rapport hebdomadaire", { exact: true })).toBeVisible();
  await expect(page.getByText("Comparé à la semaine précédente")).toBeVisible();
  await expect(page.getByRole("button", { name: "Imprimer / enregistrer en PDF" })).toBeVisible();
});

test("le tableau de bord Direction est interdit aux autres rôles", async ({ page }) => {
  await connecter(page, "finance");
  await page.goto("/direction");
  await expect(page).toHaveURL(/acces-refuse/);
});
