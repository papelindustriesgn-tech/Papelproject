import { expect, test } from "@playwright/test";
import { connecter } from "./aide";

test.describe("production", () => {
  test.beforeEach(async ({ page }) => {
    await connecter(page, "production");
  });

  test("tableau de bord : rendement réel vs théorique, TRS, graphiques", async ({ page }) => {
    await expect(page).toHaveURL(/\/production$/);
    await expect(page.getByText("Rendement", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Efficacité des machines").first()).toBeVisible();
    await expect(page.getByText("Seuil d'alerte : 95 %")).toBeVisible();
    await expect(page.locator(".recharts-surface").first()).toBeVisible();
  });

  test("fiche de nuit complète : production en colis, bobine, arrêt, opérateurs, validation", async ({ page }) => {
    // Fiche de nuit d'hier (la démo ne contient que des postes de matin et d'après-midi).
    const hier = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    await page.goto("/production/fiches/nouvelle");
    await page.getByLabel("Jour").fill(hier);
    await page.getByLabel("Poste (horaire)").selectOption({ label: "Nuit (22:00 – 06:00)" });
    await page.getByLabel("Équipe (facultatif)").selectOption({ label: "Équipe A" });
    await page.getByRole("button", { name: "Commencer la saisie" }).click();
    await expect(page.getByRole("heading", { name: /^Nuit du / })).toBeVisible();

    // Production : 90 colis de 50 + 20 paquets en vrac = 4 520 paquets, 15 kg de rebuts
    await page.getByLabel("Produit et format de colis").selectOption({ label: "Petit 100 – Colis de 50" });
    await page.getByLabel("Colis fermés").fill("90");
    await page.getByLabel("Paquets hors colis").fill("20");
    await page.getByLabel("Déchets (kg)").fill("15");
    await page.getByRole("button", { name: "Ajouter cette production" }).click();
    await expect(page.getByText("Production ajoutée : 4 520 paquets.")).toBeVisible();

    // Bobine consommée : 460 kg sur la première bobine disponible
    await page.getByLabel("Numéro de la bobine").selectOption({ index: 1 });
    await page.getByLabel("Quantité utilisée (kg)").fill("460");
    await page.getByRole("button", { name: "Ajouter", exact: true }).click();
    await expect(page.getByText("Consommation ajoutée.")).toBeVisible();

    // Arrêt non planifié de 45 min → alerte (> 30 min)
    await page.getByLabel("Pourquoi ?").selectOption({ label: "Panne mécanique" });
    await page.getByLabel("Combien de minutes ?").fill("45");
    await page.getByRole("button", { name: "Ajouter cet arrêt" }).click();
    await expect(page.getByText("Arrêt ajouté.")).toBeVisible();
    await expect(page.getByText("⚠ Arrêt de 45 min").first()).toBeVisible();

    // Rendement : 4 520 paquets / 0,46 t = 9 826 paquets/t → 94,6 % du théorique (10 389 paquets/t)
    await expect(page.getByText("94,6 %", { exact: true })).toBeVisible();

    await page.getByLabel(/Mohamed Camara/).check();
    await page.getByRole("button", { name: "Enregistrer les présents" }).click();
    await expect(page.getByText("1 opérateur(s) présent(s).")).toBeVisible();

    await page.getByRole("button", { name: "Terminer et valider" }).click();
    await page.getByRole("button", { name: "Oui, c'est juste : valider" }).click();
    await expect(page.getByText(/Fiche validée : bobines sorties du stock/)).toBeVisible();
    await expect(page.getByText(/^Validée le /)).toBeVisible();
    await expect(page.getByText(/GNF \/ paquet/)).toBeVisible();
    await expect(page.getByRole("button", { name: /^Ajouter/ })).toHaveCount(0);
  });

  test("une deuxième fiche pour le même jour et le même poste est refusée", async ({ page }) => {
    const hier = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    await page.goto("/production/fiches/nouvelle");
    await page.getByLabel("Jour").fill(hier);
    await page.getByLabel("Poste (horaire)").selectOption({ label: "Matin (06:00 – 14:00)" });
    await page.getByRole("button", { name: "Commencer la saisie" }).click();
    await expect(page.getByText(/Une fiche existe déjà pour ce jour/)).toBeVisible();
  });

  test("ordre de fabrication : création", async ({ page }) => {
    await page.goto("/production/ordres");
    await page.getByLabel("Produit et format de colis").selectOption({ label: "Petit 100 – Colis de 80" });
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
