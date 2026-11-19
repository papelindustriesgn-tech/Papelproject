import { expect, test } from "@playwright/test";
import { connecter } from "./aide";

/** Accueil de chaque service : à faire aujourd'hui, en attente, ce qui vient de se passer. */
test("magasin et comptabilité : l'accueil montre les gestes du jour, ce qui attend, et les derniers faits", async ({ page, browser }) => {
  await connecter(page, "magasin");
  await page.goto("/magasin");
  await expect(page.getByRole("heading", { name: /À faire aujourd'hui/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Préparer une commande/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Compter le stock/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /En attente de vous/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Ce qui vient de se passer/ })).toBeVisible();

  const compta = await (await browser.newContext()).newPage();
  await connecter(compta, "finance");
  await compta.goto("/finance");
  await expect(compta.getByRole("link", { name: /Facturer une commande/ })).toBeVisible();
  await expect(compta.getByRole("link", { name: /Enregistrer une dépense/ })).toBeVisible();
  await expect(compta.getByRole("link", { name: /Vérifier la caisse et la banque/ })).toBeVisible();
});

test("vérification de la caisse : écart calculé par l'ERP, date visible par le PDG", async ({ page, browser }) => {
  await connecter(page, "finance");
  await page.goto("/finance/tresorerie");
  const ligne = page.locator("section, div", { has: page.getByRole("heading", { name: "Vérifier la caisse et la banque" }) }).last().getByRole("row", { name: /Caisse principale/ }).first();
  await page.getByLabel("1. Quel compte avez-vous vérifié ?").selectOption({ label: "Caisse principale" });
  await page.getByLabel("2. Montant réel (devise du compte)").fill("1 000");
  await page.getByRole("button", { name: "Enregistrer la vérification" }).click();
  await expect(page.getByText(/Caisse principale vérifié/)).toBeVisible();
  await expect(ligne).not.toContainText("Jamais vérifié");

  const pdg = await (await browser.newContext()).newPage();
  await connecter(pdg, "pdg");
  await pdg.goto("/direction");
  const tresorerie = pdg.locator("li", { has: pdg.getByRole("heading", { name: "Trésorerie" }) });
  await expect(tresorerie).toBeVisible();
  await expect(tresorerie.getByText(/Estimé|Validé/)).toBeVisible();
  await expect(pdg.getByRole("region", { name: "Données à compléter" })).toBeVisible();
  // Chaque chiffre dit d'où il vient.
  await tresorerie.getByText("D'où vient ce chiffre ?").click();
  await expect(tresorerie.getByText(/Mesure :/)).toBeVisible();
});
