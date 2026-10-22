import { execFileSync } from "node:child_process";
import { expect, test, type Page } from "@playwright/test";
import { connecter } from "./aide";

/**
 * Régression de l'audit ventes / encaissements / retours (parcours dans l'interface, téléphone 360 px).
 * Le test « erreur de chargement » agit sur la base LOCALE (docker) : jamais sur la production.
 */
const CONTENEUR = process.env.CONTENEUR_DB ?? "supabase_db_papel-erp";
function sqlLocal(requete: string) {
  execFileSync("docker", ["exec", "-i", CONTENEUR, "psql", "-U", "postgres", "-q", "-c", requete]);
}

/** Client comptant + commande de 1 colis de 100 livrée + facture validée ; renvoie sur la facture. */
async function factureLivree(page: Page, nom: string) {
  await page.goto("/ventes/clients/nouveau");
  await page.getByLabel("Nom / raison sociale").fill(nom);
  await page.getByLabel("Type de client").selectOption({ label: "Détaillant" });
  await page.getByRole("button", { name: "Créer le client" }).click();
  await expect(page.getByRole("heading", { name: nom })).toBeVisible();
  await page.getByRole("link", { name: "+ Commande" }).click();
  await page.getByRole("button", { name: "Créer et ajouter les produits" }).click();
  await page.getByLabel("Produit et colis").selectOption({ label: "Petit 100 – Colis de 100" });
  await page.getByLabel("Colis", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Ajouter" }).click();
  await expect(page.getByText("Ligne ajoutée.")).toBeVisible();
  await page.getByRole("button", { name: "Valider la commande" }).click();
  await expect(page.getByRole("heading", { name: /^CMD-\d{4}-\d{5}$/ })).toBeVisible();
  await page.getByRole("button", { name: "Préparer le bon de livraison" }).click();
  await page.getByRole("button", { name: /Valider la livraison/ }).click();
  await expect(page.getByText(/Bon de livraison BL-\d{4}-\d{5} validé/)).toBeVisible();
  await page.getByRole("link", { name: /^← Commande/ }).click();
  await page.getByRole("button", { name: "Créer la facture" }).click();
  await page.getByRole("button", { name: "Valider la facture" }).click();
  await expect(page.getByRole("heading", { name: /^FA-\d{4}-\d{5}$/ })).toBeVisible();
  // 100 × 2 839 = 283 900 HT + 51 102 TVA
  await expect(page.getByText(/reste à payer : 335 002 GNF/)).toBeVisible();
}

test.describe("ventes : sécurité des factures, avoirs et encaissements", () => {
  test.beforeEach(async ({ page }) => {
    await connecter(page, "finance");
  });

  test("double clic sur « Enregistrer le paiement » : un seul paiement", async ({ page }) => {
    await factureLivree(page, `Client double clic ${Date.now() % 100000}`);
    await page.getByLabel("Montant (GNF)").fill("100 000");
    await page.getByRole("button", { name: "Enregistrer le paiement" }).dblclick();
    await expect(page.getByText(/reste à payer : 235 002 GNF/)).toBeVisible();
    await expect(page.getByRole("cell", { name: "100 000 GNF" })).toHaveCount(1);
  });

  test("avoir sur facture payée : conséquences expliquées, crédit client, remboursement saisi", async ({ page }) => {
    await factureLivree(page, `Client avoir ${Date.now() % 100000}`);
    const facture = page.url();
    await page.getByLabel("Montant (GNF)").fill("335 002");
    await page.getByRole("button", { name: "Enregistrer le paiement" }).click();
    await expect(page.getByText("Facture soldée")).toBeVisible();

    // Avoir de 10 paquets rapportés à l'usine.
    await page.getByRole("button", { name: "Créer un avoir" }).click();
    await expect(page.getByRole("heading", { name: "Avoir (brouillon)" })).toBeVisible();
    await page.getByLabel("Colis", { exact: true }).fill("0");
    await page.getByLabel("Paquets en plus").fill("10");
    await page.getByRole("button", { name: "OK" }).first().click();
    await expect(page.getByText(/déjà payés deviennent un crédit en faveur du client/)).toBeVisible();
    await expect(page.getByText("Aucun paquet n'entre en stock avec cet avoir (avoir financier).")).toBeVisible();
    await page.getByLabel("Paquets qui reviennent en stock").fill("10");
    await page.getByRole("button", { name: "OK" }).nth(1).click();
    await expect(page.getByText("10 paquets rapportés à l'usine entrent en stock (une seule fois).")).toBeVisible();

    // Validation en deux temps : les conséquences sont rappelées avant de confirmer.
    await page.getByRole("button", { name: "Valider l'avoir" }).click();
    await expect(page.getByRole("alertdialog", { name: "Confirmer la validation" })).toContainText("33 500 GNF déjà payés deviennent un crédit");
    await page.getByRole("button", { name: "Confirmer la validation" }).click();
    await expect(page.getByRole("heading", { name: /^AV-\d{4}-\d{5}$/ })).toBeVisible();
    await expect(page.getByText("10 paquets entrés en stock")).toBeVisible();

    // Facture : le crédit client est visible et se rembourse par une saisie explicite.
    await page.goto(facture);
    await expect(page.getByText(/crédit client : 33 500 GNF/)).toBeVisible();
    await expect(page.getByText("rien n'est remboursé automatiquement", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "Enregistrer le remboursement" }).click();
    await expect(page.getByText("Remboursement enregistré (sortie de trésorerie).")).toBeVisible();
    await expect(page.getByText("Facture soldée")).toBeVisible();
  });

  test("menu Ventes : Encaissements, Avoirs et Dotations dans le travail courant", async ({ page }) => {
    await page.goto("/ventes");
    await page.getByRole("button", { name: "Ouvrir le menu" }).click();
    const menu = page.getByRole("dialog", { name: "Menu" });
    await expect(menu.getByRole("link", { name: "Encaissements" })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Avoirs" })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Dotations" })).toBeVisible();
    await menu.getByRole("link", { name: "Encaissements" }).click();
    await expect(page.getByRole("heading", { name: "Encaissements" })).toBeVisible();
    await expect(page.getByText("Encaissé sur la période")).toBeVisible();
  });
});

test("Stocks : une requête en échec affiche un message et « Réessayer », jamais un stock à zéro", async ({ page }) => {
  await connecter(page, "magasin");
  sqlLocal("revoke select on public.etat_stock from authenticated");
  try {
    await page.goto("/magasin");
    await expect(page.getByRole("heading", { name: "Les données n'ont pas pu être chargées" })).toBeVisible();
    await expect(page.getByText("Matière première disponible")).toHaveCount(0);
  } finally {
    sqlLocal("grant select on public.etat_stock to authenticated");
  }
  await page.getByRole("button", { name: "Réessayer" }).click();
  await expect(page.getByText("Matière première disponible")).toBeVisible();
});
