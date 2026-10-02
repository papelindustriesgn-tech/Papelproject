import { expect, test, type Page } from "@playwright/test";
import { connecter } from "./aide";

/** Crée un client grossiste à crédit et renvoie l'URL de sa fiche. */
async function creerClient(page: Page, nom: string, plafond = "") {
  await page.goto("/ventes/clients/nouveau");
  await page.getByLabel("Nom / raison sociale").fill(nom);
  await page.getByLabel("Type de client").selectOption({ label: "Grossiste" });
  await page.getByLabel("Téléphone").fill("+224 622 00 00 00");
  await page.getByLabel("Condition de paiement").selectOption("credit");
  await page.getByLabel("Délai de paiement (jours)").fill("15");
  if (plafond) await page.getByLabel("Plafond de crédit (GNF)").fill(plafond);
  await page.getByRole("button", { name: "Créer le client" }).click();
  await expect(page.getByRole("heading", { name: nom })).toBeVisible();
}

test.describe("ventes", () => {
  test.beforeEach(async ({ page }) => {
    await connecter(page, "finance");
  });

  test("tableau de bord : CA, volumes, créances, DSO", async ({ page }) => {
    await page.goto("/ventes");
    await expect(page.getByText("Chiffre d'affaires HT", { exact: true })).toBeVisible();
    await expect(page.getByText("DSO (délai moyen de paiement)")).toBeVisible();
    await expect(page.getByText(/\d+ paquets$/).first()).toBeVisible();
  });

  test("parcours complet : commande → livraison → facture TTC → paiement → dotation", async ({ page }) => {
    const nom = `Grossiste E2E ${Date.now() % 100000}`;
    await creerClient(page, nom);
    await page.getByRole("link", { name: "+ Commande" }).click();
    await page.getByRole("button", { name: "Créer et ajouter les produits" }).click();

    // 100 colis de 50 Petit 100 = 5 000 paquets × 3 400 GNF HT
    await page.getByLabel("Produit et colis").selectOption({ label: "Petit 100 – Colis de 50" });
    await page.getByLabel("Colis", { exact: true }).fill("100");
    await page.getByRole("button", { name: "Ajouter" }).click();
    await expect(page.getByText("Ligne ajoutée.")).toBeVisible();
    await expect(page.getByText("20 060 000 GNF")).toBeVisible(); // TTC = 17 000 000 + 18 %
    await expect(page.getByText("Vingt-millions-soixante-mille francs guinéens")).toBeVisible();
    await page.getByRole("button", { name: "Valider la commande" }).click();
    await expect(page.getByRole("heading", { name: /^Commande CMD-\d{4}-\d{5}$/ })).toBeVisible();

    // Livraison : sortie de stock
    await page.getByRole("button", { name: "Préparer le bon de livraison" }).click();
    await expect(page.getByRole("heading", { name: "Bon de livraison (brouillon)" })).toBeVisible();
    await page.getByRole("button", { name: /Valider la livraison/ }).click();
    await expect(page.getByText(/Bon de livraison BL-\d{4}-\d{5} validé/)).toBeVisible();

    // Facture
    await page.getByRole("link", { name: /^← Commande/ }).click();
    await page.getByRole("button", { name: "Créer la facture" }).click();
    await page.getByRole("button", { name: "Valider la facture" }).click();
    await expect(page.getByRole("heading", { name: /^Facture FA-\d{4}-\d{5}$/ })).toBeVisible();
    await expect(page.getByText(/Paiements — reste à payer : 20 060 000 GNF/)).toBeVisible();

    // Paiement de la moitié → dotation : 5 000 × 50 % × 4 % = 100 paquets
    await page.getByLabel("Montant (GNF)").fill("10 030 000");
    await page.getByLabel("Mode").selectOption({ label: "Orange Money" });
    await page.getByLabel(/Référence/).fill("OM-123456");
    await page.getByRole("button", { name: "Enregistrer le paiement" }).click();
    await expect(page.getByText(/reste à payer : 10 030 000 GNF/)).toBeVisible();
    await expect(page.getByText("Petit 100 : 100 paquets dus, 0 remis")).toBeVisible();

    // Remise de la dotation : 2 colis de 50
    await page.getByLabel("Paquets remis").fill("100");
    await page.getByRole("button", { name: "Remettre" }).click();
    await expect(page.getByText("Petit 100 : 100 paquets dus, 100 remis")).toBeVisible();

    // Document imprimable
    await page.getByRole("link", { name: "Imprimer / PDF" }).click();
    await expect(page.getByText("FACTURE", { exact: true })).toBeVisible();
    await expect(page.getByText("Vingt-millions-soixante-mille francs guinéens")).toBeVisible();
  });

  test("plafond de crédit dépassé : facture refusée", async ({ page }) => {
    const nom = `Client plafond ${Date.now() % 100000}`;
    await creerClient(page, nom, "1 000 000");
    await page.getByRole("link", { name: "+ Commande" }).click();
    await page.getByLabel("Type").selectOption("facture");
    await page.getByRole("button", { name: "Créer et ajouter les produits" }).click();
    await page.getByLabel("Produit et colis").selectOption({ label: "Grand 100 – Colis de 30" });
    await page.getByLabel("Colis", { exact: true }).fill("10");
    await page.getByRole("button", { name: "Ajouter" }).click();
    await expect(page.getByText("Ligne ajoutée.")).toBeVisible();
    await page.getByRole("button", { name: "Valider la facture" }).click();
    await expect(page.getByText(/Plafond de crédit dépassé/)).toBeVisible();
  });

  test("impayés : tranches d'ancienneté et relance", async ({ page }) => {
    await page.goto("/ventes/impayes");
    await expect(page.getByText("1 à 30 jours")).toBeVisible();
    await page.getByRole("link", { name: /^FA-/ }).first().click();
    await page.getByLabel("Canal").selectOption("whatsapp");
    await page.getByLabel("Compte rendu").fill("Le client promet de payer vendredi");
    await page.getByRole("button", { name: "Enregistrer la relance" }).click();
    await expect(page.getByText("Relance enregistrée.")).toBeVisible();
  });
});

test("le magasin n'a pas accès aux ventes", async ({ page }) => {
  await connecter(page, "magasin");
  await page.goto("/ventes/clients");
  await expect(page).toHaveURL(/acces-refuse/);
});
