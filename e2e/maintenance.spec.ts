import { expect, test } from "@playwright/test";
import { connecter } from "./aide";

test("maintenance : panne signalée par la production → OT réparé avec pièce → préventifs", async ({ browser }) => {
  // 1. La production signale la panne
  const production = await (await browser.newContext()).newPage();
  await connecter(production, "production");
  await production.goto("/production/pannes");
  await production.getByLabel("Équipement").selectOption({ label: "L1-PLI – Plieuse – interfolieuse" });
  await production.getByLabel("Description de la panne").fill("E2E : la plieuse s'arrête toutes les 5 minutes");
  await production.getByRole("button", { name: "Signaler la panne" }).click();
  const confirmation = production.getByText(/Panne signalée : ordre de travail OT-\d{4}-\d{5}/);
  await expect(confirmation).toBeVisible();
  const numero = (await confirmation.textContent())!.match(/OT-\d{4}-\d{5}/)![0];

  // 2. La maintenance répare, avec une courroie prise dans le stock
  const page = await (await browser.newContext()).newPage();
  await connecter(page, "maintenance");
  await expect(page).toHaveURL(/\/maintenance$/);
  await expect(page.getByText("Pièces critiques en alerte")).toBeVisible();
  await page.getByRole("link", { name: numero }).click();
  await expect(page.getByRole("heading", { name: `Ordre de travail ${numero}` })).toBeVisible();
  const piece = page.getByLabel("Pièce", { exact: true });
  await piece.selectOption((await piece.locator("option", { hasText: "PDR-COUR-PLI" }).getAttribute("value"))!);
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(page.getByText("Pièce ajoutée (sortie du stock à la clôture).")).toBeVisible();

  await page.getByRole("button", { name: "Enregistrer et terminer" }).click();
  await expect(page.getByText("Renseignez le début et la fin de l'intervention.")).toBeVisible();
  const jour = new Date().toISOString().slice(0, 10);
  await page.getByLabel("Début de l'intervention").fill(`${jour}T08:10`);
  await page.getByLabel("Fin de l'intervention").fill(`${jour}T09:05`);
  await page.getByLabel("Intervenant(s)").fill("Moussa Condé");
  await page.getByLabel("Cause de la panne").fill("Courroie usée");
  await page.getByLabel("Travaux réalisés").fill("Remplacement de la courroie, réglage de la tension");
  await page.getByRole("button", { name: "Enregistrer et terminer" }).click();
  await expect(page.getByText("Intervention terminée : pièces sorties du stock.")).toBeVisible();
  await expect(page.getByText("(55 min)")).toBeVisible();

  // 3. Préventif : création des ordres de travail arrivés à échéance
  await page.goto("/maintenance/preventif");
  await expect(page.getByText("En retard").first()).toBeVisible();
  await page.getByRole("button", { name: "Créer les OT des 7 prochains jours" }).click();
  await expect(page.getByText(/ordre\(s\) de travail préventif\(s\) créé\(s\)/)).toBeVisible();
});

test("un commercial n'accède pas à la maintenance", async ({ page }) => {
  await connecter(page, "commercial1");
  await page.goto("/maintenance");
  await expect(page).toHaveURL(/acces-refuse/);
});
