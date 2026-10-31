import { expect, test } from "@playwright/test";
import { connecter } from "./aide";

test.describe("magasin", () => {
  test.beforeEach(async ({ page }) => {
    await connecter(page, "magasin");
  });

  test("tableau de bord : tonnes disponibles, couverture, produits finis en paquets et colis", async ({ page }) => {
    await page.goto("/magasin");
    await expect(page.getByText("Matière première disponible")).toBeVisible();
    await expect(page.getByText(/\d+,\d+ t/).first()).toBeVisible();
    await expect(page.getByText(/Jours de stock de matière/)).toBeVisible();
    await expect(page.getByText(/paquets \(\d+ colis/).first()).toBeVisible();
  });

  test("réception d'une bobine jumbo puis consommation partielle", async ({ page }) => {
    const lot = `E2E-${Date.now() % 1000000}`;
    await page.goto("/magasin/bobines");
    await page.getByLabel("N° de lot").fill(lot);
    await page.getByLabel("Poids net (kg)").fill("1 050,5");
    await page.getByLabel(/Coût réel rendu usine/).fill("13 800");
    await page.getByRole("button", { name: "Réceptionner la bobine" }).click();
    await expect(page.getByText(`Bobine ${lot} réceptionnée`)).toBeVisible();
    await expect(page.getByRole("row", { name: new RegExp(lot) })).toContainText("1 050,5 kg");

    // Consommation de 300 kg sur cette bobine
    await page.goto("/magasin/mouvements/nouveau");
    await page.getByLabel(/Sortie pour l'usine/).check();
    await page.getByLabel("2. Quel article ?").selectOption({ label: "MP-BOB – Bobine jumbo pâte vierge 13 g/m²" });
    await page.getByLabel("Bobine (n° de lot)").selectOption({ label: `${lot} — reste 1050.5 kg` });
    await page.getByLabel(/Combien/).fill("300");
    await page.getByRole("button", { name: /(Ajouter au|Retirer du) stock/ }).click();
    await expect(page.getByText("C'est enregistré (sortie pour l'usine). Le stock est à jour.")).toBeVisible();

    await page.goto(`/magasin/bobines?q=${lot}`);
    await expect(page.getByRole("row", { name: new RegExp(lot) })).toContainText("750,5 kg");
  });

  test("une sortie supérieure au stock est refusée avec un message clair", async ({ page }) => {
    await page.goto("/magasin/mouvements/nouveau");
    await page.getByLabel(/Autre sortie/).check();
    await page.getByLabel("2. Quel article ?").selectOption({ label: "EMB-ENCRE – Encre d'impression" });
    await page.getByLabel(/Combien/).fill("100000");
    await page.getByLabel("Pourquoi ?").fill("Test");
    await page.getByRole("button", { name: /(Ajouter au|Retirer du) stock/ }).click();
    await expect(page.getByText(/Stock insuffisant pour « Encre d'impression »/)).toBeVisible();
  });

  test("un ajustement sans motif est refusé", async ({ page }) => {
    await page.goto("/magasin/mouvements/nouveau");
    await page.getByLabel(/^Correction/).check();
    await page.getByLabel("Il y en a en plus").check();
    await page.getByLabel("2. Quel article ?").selectOption({ label: "EMB-SAC – Sac de colis" });
    await page.getByLabel(/Combien/).fill("5");
    await page.getByRole("button", { name: /(Ajouter au|Retirer du) stock/ }).click();
    await expect(page.getByText(/Dites en quelques mots pourquoi/)).toBeVisible();
  });

  test("création d'un article, puis entrée en stock", async ({ page }) => {
    const code = `EMB-ETQ-${Date.now() % 100000}`;
    await page.goto("/magasin/articles/nouveau");
    await page.getByLabel("Code").fill(code);
    await page.getByLabel("Libellé").fill("Étiquettes colis");
    await page.getByLabel("Famille").selectOption("emballage");
    await page.getByLabel(/Unité de stock/).selectOption("unite");
    await page.getByLabel(/Seuil d'alerte/).fill("200");
    await page.getByRole("button", { name: "Créer l'article" }).click();
    await expect(page.getByRole("heading", { name: "Étiquettes colis" })).toBeVisible();

    await page.getByRole("link", { name: "+ Mouvement" }).click();
    await page.getByLabel(/Arrivée de marchandise/).check();
    await page.getByLabel(/Combien/).fill("500");
    await page.getByLabel(/Prix payé par/).fill("250");
    await page.getByRole("button", { name: /(Ajouter au|Retirer du) stock/ }).click();
    await expect(page.getByText("C'est enregistré (arrivée de marchandise). Le stock est à jour.")).toBeVisible();
    await page.goto(`/magasin/articles?q=${code}`);
    await expect(page.getByRole("row", { name: new RegExp(code) })).toContainText("500 unités");
  });

  test("inventaire des emballages : comptage, écart, validation", async ({ page }) => {
    await page.goto("/magasin/inventaires");
    await page.getByLabel("Nom de l'inventaire").fill("Inventaire test e2e");
    await page.getByLabel("Quoi compter ?").selectOption("emballage");
    await page.getByRole("button", { name: "Préparer la feuille de comptage" }).click();
    await expect(page.getByRole("heading", { name: "Inventaire test e2e" })).toBeVisible();

    // Recopie le théorique partout, sauf pour l'encre : 58 litres comptés.
    const cases = page.getByPlaceholder("Compté");
    const n = await cases.count();
    for (let i = 0; i < n; i++) {
      const ligne = cases.nth(i).locator("xpath=ancestor::li");
      const texte = (await ligne.innerText()).replace(/ | /g, " ");
      const theorique = /Dans l'ERP : ([\d ,]+)/.exec(texte)![1].replace(/ /g, "");
      await cases.nth(i).fill(texte.includes("Encre d'impression") ? "58" : theorique);
    }
    await page.getByRole("button", { name: "Enregistrer et continuer plus tard" }).click();
    await expect(page.getByText("Comptages enregistrés.")).toBeVisible();
    await page.getByRole("button", { name: "Valider l'inventaire" }).click();
    await page.getByRole("button", { name: "Oui, valider" }).click();
    await expect(page.getByText(/Inventaire validé : 1 article/)).toBeVisible();
  });

  test("le magasinier enrichit une liste de référence", async ({ page }) => {
    await page.goto("/magasin/listes/categories-articles");
    const ajout = page.locator("form").filter({ has: page.getByRole("button", { name: "Ajouter" }) });
    await ajout.getByLabel("Famille").selectOption("emballage");
    await ajout.getByLabel("Libellé").fill("Étiquettes");
    await ajout.getByRole("button", { name: "Ajouter" }).click();
    await expect(page.getByText("Ajouté.")).toBeVisible();
  });
});

test("l'administrateur ajoute un niveau de prix B2B", async ({ page }) => {
  await connecter(page, "admin");
  await page.goto("/admin/listes/niveaux-prix");
  const ajout = page.locator("form").filter({ has: page.getByRole("button", { name: "Ajouter" }) });
  await ajout.getByLabel("Code").fill("b2b");
  await ajout.getByLabel("Libellé").fill("Prix B2B");
  await ajout.getByRole("button", { name: "Ajouter" }).click();
  await expect(page.getByText("Ajouté.")).toBeVisible();
  await page.goto("/admin/produits");
  await expect(page.getByLabel("Niveau").first().locator("option", { hasText: "Prix B2B" })).toHaveCount(1);
});

test("un commercial n'accède pas au magasin", async ({ page }) => {
  await connecter(page, "commercial1");
  await page.goto("/magasin/mouvements");
  await expect(page).toHaveURL(/acces-refuse/);
});
