import { expect, test } from "@playwright/test";
import { connecter } from "./aide";

// Position simulée du téléphone (Madina, Conakry).
test.use({ geolocation: { latitude: 9.5400, longitude: -13.6800, accuracy: 8 }, permissions: ["geolocation"] });

test("commercial hors ligne : PVA, check-in, facture numérotée, puis synchronisation", async ({ page, context, browser }) => {
  test.setTimeout(120_000);
  await connecter(page, "commercial1");
  await expect(page).toHaveURL(/\/terrain/);
  // Première synchronisation (référentiels, prix, série C01).
  await expect(page.getByText(/dernière synchronisation/)).toBeVisible({ timeout: 30_000 });
  // Le service worker met l'application en cache pour l'ouvrir sans réseau.
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect(page.getByText(/dernière synchronisation/)).toBeVisible({ timeout: 30_000 });

  // --- Coupure du réseau ---------------------------------------------------
  await context.setOffline(true);
  await expect(page.getByText("● Hors ligne — vous pouvez continuer à travailler")).toBeVisible();

  const nom = `Boutique hors ligne ${Date.now() % 100000}`;
  await page.getByRole("button", { name: /Nouveau PVA/ }).click();
  await page.getByLabel("Nom du point de vente *").fill(nom);
  await page.getByLabel("Type *").selectOption({ label: "Détaillant" });
  await page.getByLabel("Repère (pour retrouver la boutique)").fill("À côté de la pharmacie");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.getByRole("heading", { name: nom, exact: true })).toBeVisible();

  // Check-in : première visite → la position devient celle du PVA.
  await page.getByRole("button", { name: "Commencer la visite (check-in GPS)" }).click();
  await page.getByRole("button", { name: "Je suis sur place : check-in" }).click();
  await expect(page.getByText(/Check-in enregistré : cette position devient celle du point de vente/)).toBeVisible();
  await page.getByLabel("Stock Papel constaté (colis)").fill("0");
  await page.getByRole("button", { name: "Oui", exact: true }).click();
  await page.getByLabel("Petit 100").fill("5000");
  await page.getByRole("button", { name: "Terminer la visite" }).click();
  // Retour sur la fiche du PVA, avec la visite enregistrée (en attente d'envoi).
  await expect(page.getByRole("heading", { name: nom, exact: true })).toBeVisible();
  await expect(page.getByText("(à envoyer)")).toBeVisible();

  // Rechargement complet SANS réseau : l'application s'ouvre et les données sont toujours là.
  await page.reload();
  await expect(page.getByRole("heading", { name: nom, exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("(à envoyer)")).toBeVisible();

  // Le PVA devient client, puis facture hors ligne.
  await page.getByRole("button", { name: "Créer comme client" }).click();
  await expect(page.getByText(/maintenant client/)).toBeVisible();
  await page.getByRole("button", { name: "Facture / devis" }).click();
  await page.getByLabel("Produit et colis").selectOption({ label: "Petit 100 – Colis de 50" });
  await page.getByLabel("Colis", { exact: true }).fill("2");
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(page.getByText("401 200 GNF")).toBeVisible(); // 100 paquets × 3 400 + 18 %
  await page.getByRole("button", { name: "Valider la facture" }).click();
  await expect(page.getByText(/Document FA-\d{4}-C01-\d{5} validé/)).toBeVisible();
  const numero = (await page.getByText(/Document FA-\d{4}-C01-\d{5} validé/).innerText()).match(/FA-\d{4}-C01-\d{5}/)![0];
  await expect(page.getByText("Deux-cent-mille").or(page.getByText(/Quatre-cent-un-mille-deux-cents francs guinéens/))).toBeVisible();

  await page.getByRole("button", { name: "Retour" }).click();
  await page.getByRole("button", { name: "Retour" }).click();
  await expect(page.getByText(/saisie\(s\) en attente d'envoi/)).toBeVisible();

  // --- Retour du réseau : synchronisation automatique ----------------------
  await context.setOffline(false);
  await expect(page.getByText("Tout est envoyé")).toBeVisible({ timeout: 30_000 });

  // Le responsable commercial voit la visite ; la comptabilité voit la facture.
  const resp = await browser.newContext();
  const p2 = await resp.newPage();
  await connecter(p2, "resp.commercial");
  await p2.goto("/commercial/visites");
  await expect(p2.getByRole("cell", { name: nom })).toBeVisible();
  await resp.close();

  const fin = await browser.newContext();
  const p3 = await fin.newPage();
  await connecter(p3, "finance");
  await p3.goto(`/ventes/pieces?type=facture&q=${numero}`);
  await expect(p3.getByRole("link", { name: numero })).toBeVisible();
  await fin.close();
});

test("commercial : tableau de bord terrain et tournée du jour", async ({ page }) => {
  await connecter(page, "commercial1");
  await expect(page.getByRole("heading", { name: "Tournée du jour" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Mes objectifs du mois" })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: /Mes points de vente/ }).click();
  await expect(page.getByRole("button", { name: /Ets Diallo & Frères/ })).toBeVisible();
});

test("responsable commercial : carte, indicateurs, planification", async ({ page }) => {
  await connecter(page, "resp.commercial");
  await page.goto("/commercial");
  await expect(page.getByText("Taux de rupture")).toBeVisible();
  await expect(page.locator(".leaflet-container")).toBeVisible();
  await page.goto("/commercial/planification");
  await page.getByLabel("Commercial", { exact: true }).selectOption({ label: "Kadiatou Bangoura" });
  await page.locator('input[name="pva"]').first().check();
  await page.getByRole("button", { name: "Enregistrer la tournée" }).click();
  await expect(page.getByText(/Tournée enregistrée \(1 étape/)).toBeVisible();
});
