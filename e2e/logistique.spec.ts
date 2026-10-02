import { expect, test } from "@playwright/test";
import { connecter } from "./aide";

test.use({ geolocation: { latitude: 9.7105, longitude: -13.3869, accuracy: 15 }, permissions: ["geolocation"] });

test("logistique : tournée, chargement, départ, remise partielle signée, dépense, clôture", async ({ page }) => {
  await connecter(page, "logistique");
  await expect(page).toHaveURL(/\/logistique$/);
  await expect(page.getByText("Bons à planifier")).toBeVisible();

  // 1. Nouvelle tournée
  await page.goto("/logistique/tournees/nouvelle");
  await page.getByLabel("Véhicule").selectOption({ label: "RC-1234-A – Camion 10 t (1500 colis)" });
  await page.getByLabel("Chauffeur").selectOption({ label: "Mamadou Cissé" });
  await page.getByRole("button", { name: "Créer et charger les bons" }).click();
  await page.waitForURL(/\/logistique\/tournees\/[0-9a-f-]{36}/);
  await expect(page.getByRole("heading", { name: /Tournée TL-\d{4}-\d{5}/ })).toBeVisible();

  // 2. Chargement du bon en attente, puis départ
  const aPlanifier = page.getByRole("row", { name: /BL-\d{4}-\d{5}/ }).filter({ has: page.getByRole("button", { name: "Charger" }) }).first();
  const numeroBl = (await aPlanifier.getByRole("cell").first().textContent())!.trim();
  await aPlanifier.getByRole("button", { name: "Charger" }).click();
  await expect(page.getByRole("row", { name: new RegExp(numeroBl) }).getByRole("button", { name: "Retirer" })).toBeVisible();
  await page.getByLabel("Compteur au départ (km)").fill("50 000");
  await page.getByRole("button", { name: "Chargement terminé : départ" }).click();
  await expect(page.getByText("Tournée partie")).toBeVisible();
  const urlTournee = page.url().split("?")[0];

  // 3. Remise partielle chez le client : 100 paquets rapportés, signature, position
  await page.getByRole("link", { name: "Saisir la remise" }).click();
  await expect(page.getByRole("heading", { name: `Livraison ${numeroBl}` })).toBeVisible();
  await page.getByLabel("Livré en partie").check();
  await page.getByLabel(/\(sur \d+ paquets\)/).first().fill("100");
  await page.getByLabel("Réceptionné par").fill("Gérant E2E");
  const canvas = page.getByLabel("Signature du client");
  await canvas.scrollIntoViewIfNeeded();
  const zone = await canvas.boundingBox();
  await page.mouse.move(zone!.x + 30, zone!.y + 40);
  await page.mouse.down();
  await page.mouse.move(zone!.x + 120, zone!.y + 90, { steps: 8 });
  await page.mouse.move(zone!.x + 200, zone!.y + 50, { steps: 8 });
  await page.mouse.up();
  await page.getByRole("button", { name: "Relever la position GPS" }).click();
  await expect(page.getByText(/Position relevée \(précision 15 m\)/)).toBeVisible();
  await page.getByRole("button", { name: "Enregistrer la remise" }).click();
  await expect(page.getByText("Preuve de livraison")).toBeVisible();
  await expect(page.getByText("Gérant E2E")).toBeVisible();
  await expect(page.getByRole("img", { name: "Signature du client" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Voir sur la carte/ })).toBeVisible();

  // 4. Dépense et clôture
  await page.goto(urlTournee);
  await page.getByLabel("Dépense").selectOption({ label: "Carburant" });
  await page.getByLabel("Montant (GNF)").fill("400 000");
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(page.getByText("Dépense enregistrée.")).toBeVisible();
  await page.getByLabel("Compteur au retour (km)").fill("49 000");
  await page.getByRole("button", { name: "Retour à l'usine : clôturer" }).click();
  await expect(page.getByText(/inférieur à celui du départ/)).toBeVisible();
  await page.getByLabel("Compteur au retour (km)").fill("50 085");
  await page.getByRole("button", { name: "Retour à l'usine : clôturer" }).click();
  await expect(page.getByText("Tournée clôturée.")).toBeVisible();
  await expect(page.getByText("85 km")).toBeVisible();
});

test("un commercial n'accède pas à la logistique", async ({ page }) => {
  await connecter(page, "commercial1");
  await page.goto("/logistique");
  await expect(page).toHaveURL(/acces-refuse/);
});
