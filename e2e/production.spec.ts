import { expect, test } from "@playwright/test";
import { connecter } from "./aide";

test.describe("production", () => {
  test.beforeEach(async ({ page }) => {
    await connecter(page, "production");
  });

  test("tableau de bord : rendement réel vs théorique, TRS, graphiques", async ({ page }) => {
    await expect(page).toHaveURL(/\/production$/);
    await expect(page.getByText("Rendement réel / théorique").first()).toBeVisible();
    await expect(page.getByText("TRS (OEE)")).toBeVisible();
    await expect(page.getByRole("cell", { name: "10 175 paquets/t" })).toBeVisible();
    await expect(page.locator(".recharts-surface").first()).toBeVisible();
  });

  test("fiche de nuit complète : production en colis, bobine, arrêt, opérateurs, validation", async ({ page }) => {
    // Fiche de nuit d'hier (la démo ne contient que des postes de matin et d'après-midi).
    const hier = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    await page.goto("/production/fiches/nouvelle");
    await page.getByLabel("Date").fill(hier);
    await page.getByLabel("Poste").selectOption({ label: "Nuit (22:00 – 06:00)" });
    await page.getByLabel("Équipe").selectOption({ label: "Équipe A" });
    await page.getByRole("button", { name: "Ouvrir la fiche" }).click();
    await expect(page.getByText(/durée 8 h 00/)).toBeVisible();

    // Production : 90 colis de 50 + 20 paquets en vrac = 4 520 paquets, 15 kg de rebuts
    await page.getByLabel("Produit et colis").selectOption({ label: "Petit 100 – Colis de 50" });
    await page.getByLabel("Colis complets").fill("90");
    await page.getByLabel("Paquets en vrac").fill("20");
    await page.getByLabel("Rebuts (kg)").fill("15");
    await page.getByRole("button", { name: "Ajouter" }).first().click();
    await expect(page.getByText("Production ajoutée : 4 520 paquets.")).toBeVisible();

    // Bobine consommée : 460 kg sur la première bobine disponible
    await page.getByLabel("Bobine", { exact: true }).selectOption({ index: 1 });
    await page.getByLabel("Quantité (kg)").fill("460");
    await page.getByRole("button", { name: "Ajouter" }).nth(1).click();
    await expect(page.getByText("Consommation ajoutée.")).toBeVisible();

    // Arrêt non planifié de 45 min → alerte (> 30 min)
    await page.getByLabel("Cause").selectOption({ label: "Panne mécanique" });
    await page.getByLabel("Durée (min)").fill("45");
    await page.getByRole("button", { name: "Ajouter" }).nth(2).click();
    await expect(page.getByText("Arrêt ajouté.")).toBeVisible();
    await expect(page.getByText("⚠ Arrêt de 45 min").first()).toBeVisible();

    // Rendement : 4 520 paquets / 0,46 t = 9 826 paquets/t → 96,6 % du théorique
    await expect(page.getByText("96,6 %")).toBeVisible();

    await page.getByLabel(/Mohamed Camara/).check();
    await page.getByRole("button", { name: "Enregistrer les présences" }).click();
    await expect(page.getByText("1 opérateur(s) présent(s).")).toBeVisible();

    await page.getByRole("button", { name: "Valider la fiche" }).click();
    await page.getByRole("button", { name: "Oui, valider définitivement" }).click();
    // La page se recharge en lecture seule : le badge « Validée » remplace le bouton.
    await expect(page.getByText(/^Validée le /)).toBeVisible();
    await expect(page.getByText(/GNF \/ paquet/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Ajouter" })).toHaveCount(0);
  });

  test("une deuxième fiche pour le même jour et le même poste est refusée", async ({ page }) => {
    const hier = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    await page.goto("/production/fiches/nouvelle");
    await page.getByLabel("Date").fill(hier);
    await page.getByLabel("Poste").selectOption({ label: "Matin (06:00 – 14:00)" });
    await page.getByRole("button", { name: "Ouvrir la fiche" }).click();
    await expect(page.getByText(/Une fiche existe déjà pour ce jour/)).toBeVisible();
  });

  test("ordre de fabrication : création", async ({ page }) => {
    await page.goto("/production/ordres");
    await page.getByLabel("Produit et colis").selectOption({ label: "Petit 100 – Colis de 80" });
    await page.getByLabel("Quantité visée (colis)").fill("500");
    await page.getByRole("button", { name: "Créer l'ordre" }).click();
    await expect(page.getByText(/Ordre OF-\d{4}-\d{4} créé\./)).toBeVisible();
  });

  test("les cadences nominales se modifient dans les listes de référence", async ({ page }) => {
    await page.goto("/production/listes/cadences");
    await expect(page.getByRole("heading", { name: "Cadences nominales" })).toBeVisible();
    const premiere = page.locator("li form").first();
    await premiere.getByLabel("Paquets / minute").fill("13,5");
    await premiere.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText("Enregistré.")).toBeVisible();
  });
});

test("le magasin voit les produits finis valorisés au coût de revient", async ({ page }) => {
  await connecter(page, "magasin");
  await page.goto("/magasin/articles?famille=produit_fini");
  const petit = page.getByRole("row", { name: /PETIT100-C50/ });
  await expect(petit).toBeVisible();
  await expect(petit).not.toContainText(/\b0 GNF/);
});
