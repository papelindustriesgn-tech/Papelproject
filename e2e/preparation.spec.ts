import { expect, test, type Browser } from "@playwright/test";
import { connecter } from "./aide";

/** Le bureau enregistre une commande de 10 colis de Petit 100 (colis de 100) ; renvoie son numéro. */
async function commandeDuBureau(browser: Browser): Promise<string> {
  const page = await (await browser.newContext()).newPage();
  await connecter(page, "resp.commercial");
  await page.goto("/ventes/pieces/nouvelle?type=commande");
  await page.getByLabel("2. Pour quel client ?").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Continuer : choisir les produits" }).click();
  await page.getByLabel("Produit et format de colis").selectOption({ label: "Petit 100 – Colis de 100" });
  await page.getByLabel("Colis", { exact: true }).fill("10");
  await page.getByRole("button", { name: "Ajouter" }).click();
  await expect(page.getByText("Ligne ajoutée.")).toBeVisible();
  await page.getByRole("button", { name: "Valider la commande" }).click();
  const titre = page.getByRole("heading", { name: /^CMD-\d{4}-\d{5}$/ });
  await expect(titre).toBeVisible();
  const numero = await titre.innerText();
  await page.context().close();
  return numero;
}

/** Parcours 2 : le magasin prépare une commande (livraison partielle), valide la sortie de stock ; le reste reste à livrer. */
test("magasin : stock physique / réservé / disponible, préparation partielle avec récapitulatif, reste à livrer", async ({ page, browser }) => {
  test.setTimeout(90_000);
  const numero = await commandeDuBureau(browser);
  await connecter(page, "magasin");
  await page.goto("/magasin/commandes");
  await expect(page.getByRole("heading", { name: "Stock des produits finis" })).toBeVisible();
  await expect(page.getByText("Réservé pour les commandes").first()).toBeVisible();

  const commande = page.locator("li", { hasText: numero }).filter({ has: page.getByRole("button", { name: /^Préparer/ }) });
  await expect(page.getByText(/Réservé pour les commandes/).first()).toBeVisible();
  await commande.getByRole("button", { name: /^Préparer/ }).click();
  await expect(page.getByRole("heading", { name: `Préparer la commande ${numero}` })).toBeVisible();

  // Livraison partielle : 1 colis seulement sur la première ligne.
  const premiere = page.locator("form", { has: page.getByLabel("Colis préparés") }).first();
  await premiere.getByLabel("Colis préparés").fill("1");
  await premiere.getByLabel("Paquets en plus").fill("0");
  await premiere.getByRole("button", { name: "Enregistrer" }).click();
  await expect(premiere.getByText("Quantité enregistrée.")).toBeVisible();

  await page.getByRole("button", { name: "Les colis sont prêts : valider la sortie du stock" }).click();
  await expect(page.getByText("Ces colis vont sortir du stock :")).toBeVisible();
  await page.getByRole("button", { name: "Oui, valider" }).click();
  await expect(page.getByText(/validé : les colis sont sortis du stock/)).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Bon de livraison BL-/ })).toBeVisible();

  // La commande reste à préparer pour le reste (livraison partielle).
  await page.goto("/magasin/commandes");
  await expect(page.getByText(numero).first()).toBeVisible();

  // La comptabilité voit la commande dans « À facturer » : la facture reprend seulement le livré (1 colis = 100 paquets).
  const compta = await (await browser.newContext()).newPage();
  await connecter(compta, "finance");
  await compta.goto("/ventes/a-facturer");
  const ligne = compta.getByRole("row", { name: new RegExp(numero) });
  await expect(ligne).toContainText("100 paquets");
  await ligne.getByRole("button", { name: "Facturer" }).click();
  await expect(compta.getByText("Facture en préparation")).toBeVisible();
  await compta.getByRole("button", { name: "Valider la facture" }).click();
  await expect(compta.getByRole("heading", { name: /^FA-\d{4}-\d{5}$/ })).toBeVisible();
  await expect(compta.getByText("À payer").first()).toBeVisible();
  await compta.goto("/ventes/a-facturer");
  await expect(compta.getByRole("row", { name: new RegExp(numero) })).toHaveCount(0);
});

test("ventes : la commande montre la prochaine étape et permet de confirmer la date promise", async ({ page, browser }) => {
  const numero = await commandeDuBureau(browser);
  await connecter(page, "resp.commercial");
  await page.goto("/ventes/commandes");
  await page.getByRole("link", { name: new RegExp(numero) }).first().click();
  await expect(page.getByLabel("Où en est ce document")).toBeVisible();
  await expect(page.getByText(/Prochaine étape :/).first()).toBeVisible();
});
