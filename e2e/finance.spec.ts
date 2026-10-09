import { expect, test } from "@playwright/test";
import { connecter } from "./aide";

test("finance : facture fournisseur réglée, caisse protégée, résultat, prévisionnel, exports comptables", async ({ page }) => {
  await connecter(page, "finance");
  await page.goto("/finance");
  await expect(page.getByText("Trésorerie disponible")).toBeVisible();
  await expect(page.getByText("Seuil de rentabilité")).toBeVisible();

  // 1. Facture d'électricité, puis règlement intégral par la banque
  await page.goto("/finance/fournisseurs/nouvelle");
  await page.getByLabel("Bénéficiaire (sans fiche)").fill("EDG Coyah (E2E)");
  await page.getByLabel("Libellé").fill("Électricité septembre");
  await page.getByLabel("Catégorie").selectOption({ label: "Énergie : électricité, carburant du groupe (variable)" });
  await page.getByLabel("Montant HT").fill("2 500 000");
  await page.getByRole("button", { name: "Enregistrer la facture" }).click();
  await page.waitForURL(/\/finance\/fournisseurs\/[0-9a-f-]{36}/);
  await expect(page.getByRole("heading", { name: /Facture FF-\d{4}-\d{5}/ })).toBeVisible();
  await page.getByLabel("Payé depuis").selectOption({ index: 2 }); // Banque (GNF)
  await page.getByLabel("Montant (GNF)").fill("3 000 000");
  await page.getByRole("button", { name: "Enregistrer le règlement" }).click();
  await expect(page.getByText(/dépasse le reste à payer \(2 500 000 GNF\)/)).toBeVisible();
  await page.getByLabel("Montant (GNF)").fill("2 500 000");
  await page.getByRole("button", { name: "Enregistrer le règlement" }).click();
  await expect(page.getByText("Règlement enregistré : la trésorerie est à jour.")).toBeVisible();
  await expect(page.getByText("Soldée", { exact: true })).toBeVisible();

  // 2. La caisse ne peut pas devenir négative
  await page.goto("/finance/tresorerie");
  await expect(page.getByRole("cell", { name: /Règlement FF-\d{4}-\d{5} – EDG Coyah \(E2E\)/ })).toBeVisible();
  const compte = page.getByLabel("Compte", { exact: true });
  await compte.selectOption((await compte.locator("option", { hasText: "Caisse principale" }).getAttribute("value"))!);
  await page.getByLabel("Montant (devise du compte)").fill("999 999 999 999");
  await page.getByLabel("Libellé", { exact: true }).fill("Retrait impossible");
  await page.getByRole("button", { name: "Enregistrer le mouvement" }).click();
  await expect(page.getByText(/Solde insuffisant sur « Caisse principale »/)).toBeVisible();

  // 3. Résultat et prévisionnel
  await page.goto("/finance/resultat");
  await expect(page.getByRole("cell", { name: "Résultat d'exploitation" })).toBeVisible();
  await page.goto("/finance/previsionnel");
  await expect(page.getByText("Solde de départ")).toBeVisible();

  // 4. Export du journal des ventes : CSV « ; » équilibré
  await page.goto("/finance/exports");
  const lien = page.getByRole("link", { name: "Télécharger" }).first();
  const reponse = await page.request.get((await lien.getAttribute("href"))!);
  expect(reponse.status()).toBe(200);
  const csv = await reponse.text();
  expect(csv.replace(/^﻿/, "").split("\r\n")[0]).toBe("Journal;Date;N° pièce;Compte;Compte tiers;Libellé;Débit;Crédit");
  expect(csv).toContain(";4111;");
});

test("un commercial n'accède pas à la finance, ni aux exports", async ({ page }) => {
  await connecter(page, "commercial1");
  await page.goto("/finance");
  await expect(page).toHaveURL(/acces-refuse/);
  const r = await page.request.get("/finance/exports/ventes?du=2026-01-01&au=2026-12-31", { maxRedirects: 0 });
  expect(r.status()).not.toBe(200);
});

test("tâche planifiée du rapport hebdomadaire : refusée sans secret, calculée avec", async ({ request }) => {
  expect((await request.get("/api/taches/rapport-hebdo")).status()).toBe(401);
  const r = await request.get("/api/taches/rapport-hebdo", { headers: { Authorization: "Bearer secret-local-de-test" } });
  expect(r.status()).toBe(200);
  // Sans service d'e-mail configuré en local : calculé mais non envoyé.
  expect(await r.json()).toMatchObject({ envoye: false });
});
