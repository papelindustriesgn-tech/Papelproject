import { expect, test } from "@playwright/test";
import { connecter } from "./aide";

const BOBINE = "JB-2026-0025"; // bobine de démonstration en cours d'utilisation (déjà consommée sur des fiches)

test("qualité : contrôle à réception non conforme → NC, bobine bloquée, traçabilité, libération, clôture", async ({ page }) => {
  await connecter(page, "qualite");
  await expect(page).toHaveURL(/\/qualite$/);
  await expect(page.getByText("Non-conformités ouvertes")).toBeVisible();

  // 1. Contrôle de la bobine
  await page.goto("/qualite/controles");
  const choix = page.getByLabel("Bobine", { exact: true });
  await choix.selectOption((await choix.locator("option", { hasText: BOBINE }).getAttribute("value"))!);
  await page.getByRole("button", { name: "Commencer le contrôle" }).click();
  await page.waitForURL(/\/qualite\/controles\/[0-9a-f-]{36}/);
  await page.getByLabel("Grammage : valeur").fill("14,2");
  await expect(page.getByText("Hors tolérance", { exact: true })).toBeVisible();
  await page.getByLabel("Humidité : valeur").fill("6");
  await page.getByLabel("Aspect (trous, taches, mandrin) : Conforme").check();
  await page.getByRole("button", { name: "Enregistrer et valider le contrôle" }).click();
  await expect(page.getByText(/Contrôle NON CONFORME : non-conformité NC-\d{4}-\d{5} ouverte, bobine bloquée/)).toBeVisible();

  // 2. Traçabilité : bobine bloquée → lots de produits finis → clients
  await page.goto(`/qualite/tracabilite?q=${BOBINE}`);
  await expect(page.getByText("Bloquée", { exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: /^PF\d{6}-\d+$/ }).first()).toBeVisible();
  await expect(page.getByText(/client\(s\)/)).toBeVisible();
  await page.getByRole("button", { name: "Libérer la bobine" }).click();
  await expect(page.getByText("Indiquez le motif de la décision.")).toBeVisible();
  await page.getByLabel("Motif de la décision").fill("Dérogation : nouvelle mesure à 13,4 g/m²");
  await page.getByRole("button", { name: "Libérer la bobine" }).click();
  await expect(page.getByText("Bobine libérée.")).toBeVisible();

  // 3. Traitement de la NC jusqu'à la clôture
  await page.goto("/qualite/non-conformites?statut=ouverte&q=Grammage");
  await page.getByRole("link", { name: /NC-\d{4}-\d{5}/ }).first().click();
  await page.getByRole("button", { name: "Clôturer la non-conformité" }).click();
  await expect(page.getByText("Renseignez la cause racine avant de clôturer.")).toBeVisible();
  await page.getByLabel(/Cause racine/).fill("Lot fournisseur hors spécification de grammage");
  await page.getByRole("button", { name: "Enregistrer l'analyse" }).click();
  await expect(page.getByText("Analyse enregistrée.")).toBeVisible();
  await page.getByLabel("Action corrective").fill("Réclamation au fournisseur avec les mesures");
  await page.getByLabel("Responsable").fill("Achats");
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(page.getByText("Action ajoutée.")).toBeVisible();
  await page.getByRole("button", { name: "Réalisée", exact: true }).click();
  await expect(page.getByRole("button", { name: "Réalisée", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Clôturer la non-conformité" }).click();
  await expect(page.getByText("Non-conformité clôturée.")).toBeVisible();
});

test("la production signale une non-conformité ; elle ne voit pas l'espace qualité", async ({ page }) => {
  await connecter(page, "production");
  await page.goto("/production/non-conformites");
  await page.getByLabel("Description du problème").fill("Bourrages répétés sur la plieuse, mouchoirs déchirés");
  await page.getByLabel("Gravité").selectOption("mineure");
  await page.getByRole("button", { name: "Déclarer la non-conformité" }).click();
  await expect(page.getByText(/Non-conformité NC-\d{4}-\d{5} enregistrée/)).toBeVisible();
  await page.goto("/qualite");
  await expect(page).toHaveURL(/acces-refuse/);
});
