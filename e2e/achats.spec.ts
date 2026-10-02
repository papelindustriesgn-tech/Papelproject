import { expect, test } from "@playwright/test";
import { connecter } from "./aide";

const ARTICLE_BOBINE = "Bobine jumbo 13 g/m² – 3 plis (kg)";

test.describe("achats", () => {
  test("de la demande du magasin à la réception des bobines au coût de revient complet", async ({ browser }) => {
    const suffixe = `${Date.now() % 1000000}`;
    const motif = `Couverture faible E2E ${suffixe}`;
    const reference = `E2EU${suffixe.padStart(7, "0")}`;
    const lot = `E2E-CT-${suffixe}`;

    // 1. Le magasin signale un besoin.
    const magasin = await (await browser.newContext()).newPage();
    await connecter(magasin, "magasin");
    await magasin.goto("/magasin/demandes");
    await magasin.getByLabel("Article", { exact: true }).selectOption({ label: ARTICLE_BOBINE });
    await magasin.getByLabel("Quantité (dans l'unité de l'article)").fill("20 000");
    await magasin.getByLabel("Motif").fill(motif);
    await magasin.getByRole("button", { name: "Envoyer la demande" }).click();
    const confirmation = magasin.getByText(/Demande DA-[\d-]+ transmise au service achats/);
    await expect(confirmation).toBeVisible();
    const numero = (await confirmation.textContent())!.match(/DA-[\d-]+/)![0];
    await expect(magasin.getByRole("row", { name: new RegExp(motif) })).toContainText("À traiter");

    // 2. Les achats approuvent, commandent en USD à la tonne, envoient le bon.
    const achats = await (await browser.newContext()).newPage();
    await connecter(achats, "achats");
    await achats.goto("/achats/demandes");
    const ligne = achats.getByRole("row", { name: new RegExp(motif) });
    await ligne.getByRole("button", { name: "Approuver" }).click();
    await expect(ligne).toContainText("Approuvée");

    await achats.goto("/achats/commandes/nouveau");
    await achats.getByLabel("Fournisseur").selectOption({ label: "Fournisseur pâte A (démo)" });
    await achats.getByLabel("Frais d'approche estimés (GNF)").fill("10 000 000");
    await achats.getByRole("checkbox", { name: new RegExp(numero) }).check();
    await achats.getByRole("button", { name: "Créer et ajouter les lignes" }).click();
    await achats.waitForURL(/\/achats\/commandes\/[0-9a-f-]{36}/);

    await achats.getByLabel("Article", { exact: true }).selectOption({ label: ARTICLE_BOBINE });
    await achats.getByLabel("Quantité (t)").fill("20");
    await achats.getByLabel("Prix (USD / t)").fill("950");
    await achats.getByRole("button", { name: "Ajouter", exact: true }).click();
    await expect(achats.getByText("Ligne ajoutée.")).toBeVisible();
    await expect(achats.getByText("20 000 kg").first()).toBeVisible();

    await achats.getByRole("button", { name: "Valider et envoyer au fournisseur" }).click();
    await expect(achats.getByText(/Bon de commande BC-\d+ envoyé/)).toBeVisible();

    // 3. Conteneur : déclaration, frais d'approche, suivi jusqu'à la livraison.
    await achats.getByLabel("Référence du conteneur").fill(reference);
    await achats.getByLabel("Poids net déclaré (kg)").fill("20 000");
    await achats.getByRole("button", { name: "Ajouter le conteneur" }).click();
    await achats.waitForURL(/\/achats\/conteneurs\/[0-9a-f-]{36}/);
    await expect(achats.getByRole("heading", { name: `Conteneur ${reference}` })).toBeVisible();

    await achats.getByLabel("Type de frais").selectOption({ index: 1 });
    await achats.getByLabel("Montant", { exact: true }).fill("10 000 000");
    await achats.getByRole("button", { name: "Ajouter", exact: true }).click();
    await expect(achats.getByText("Frais ajouté : le coût de revient est recalculé.")).toBeVisible();

    const jour = new Date().toISOString().slice(0, 10);
    for (const etape of ["Embarquement", "Arrivée au port", "Dédouanement", "Livraison à l'usine"]) {
      await achats.getByLabel(`${etape} — réelle`).fill(jour);
    }
    await achats.getByRole("button", { name: "Enregistrer le suivi" }).click();
    await expect(achats.getByText(/Suivi enregistré/)).toBeVisible();

    // 4. Le magasin réceptionne une bobine du conteneur : coût repris du conteneur.
    await magasin.goto("/magasin/bobines");
    const choixConteneur = magasin.getByLabel("Conteneur", { exact: true });
    await choixConteneur.selectOption((await choixConteneur.locator("option", { hasText: reference }).getAttribute("value"))!);
    await magasin.getByLabel("Article", { exact: true }).selectOption({ label: "Bobine jumbo 13 g/m² – 3 plis" });
    await magasin.getByLabel("N° de lot").fill(lot);
    await magasin.getByLabel("Poids net (kg)").fill("1 000");
    await magasin.getByRole("button", { name: "Réceptionner la bobine" }).click();
    await expect(magasin.getByText(`Bobine ${lot} réceptionnée`)).toBeVisible();

    await achats.reload();
    await expect(achats.getByText("Bobines reçues (1)")).toBeVisible();
    await expect(achats.getByRole("row", { name: new RegExp(lot) })).toBeVisible();
  });

  test("le tableau de bord achats affiche le transit et les coûts des conteneurs", async ({ page }) => {
    await connecter(page, "achats");
    await page.goto("/achats");
    await expect(page.getByText(/en transit/i).first()).toBeVisible();
    await page.goto("/achats/conteneurs");
    await expect(page.getByRole("link", { name: /^[A-Z]{4}\d{7}$/ }).first()).toBeVisible();
  });
});
