import { expect, test, type Page } from "@playwright/test";
import { connecter } from "./aide";

/**
 * Parcours 1 : commande du commercial sur téléphone (écran 360 px), avec et sans réseau.
 * On vérifie aussi ce que voit le bureau : une seule commande reçue, date souhaitée, date confirmée.
 */

async function attendreSynchro(page: Page) {
  await expect(page.getByText(/dernière synchronisation/)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Tout est envoyé au bureau ✓")).toBeVisible({ timeout: 30_000 });
}

/** Commande d'un client déjà connu : 2 colis du premier produit ; renvoie le numéro donné par le téléphone. */
async function commander(page: Page, client: RegExp | string) {
  await page.getByRole("button", { name: "Prendre une commande" }).first().click();
  await expect(page.getByText("Étape 1 sur 3 : le client")).toBeVisible();
  await page.getByPlaceholder("Nom ou téléphone du client…").fill(typeof client === "string" ? client : "");
  await page.getByRole("button", { name: client }).first().click();
  await expect(page.getByText("Étape 2 sur 3 : les produits")).toBeVisible();
  const plus = page.getByRole("button", { name: /^Plus \(Colis/ }).first();
  await plus.click();
  await plus.click();
  await page.getByRole("button", { name: "Vérifier la commande" }).click();
  await expect(page.getByText("Étape 3 sur 3 : vérifier et envoyer")).toBeVisible();
  await expect(page.getByText("Total à payer").first()).toBeVisible();
  await page.getByRole("button", { name: "Envoyer la commande" }).click();
  const titre = page.getByRole("heading", { name: /^Commande CMD-\d{4}-C01-\d{5}$/ });
  await expect(titre).toBeVisible();
  return (await titre.innerText()).replace("Commande ", "");
}

test("commande sur téléphone : client créé sans quitter la commande, récapitulatif, date souhaitée, reçue par le bureau", async ({ page, browser }) => {
  test.setTimeout(120_000);
  await connecter(page, "commercial1");
  await expect(page).toHaveURL(/\/terrain/);
  await attendreSynchro(page);

  const nom = `Kiosque ${Date.now() % 100000}`;
  const debut = Date.now();
  await page.getByRole("button", { name: "Prendre une commande" }).first().click();
  await page.getByRole("button", { name: "+ Nouveau client" }).click();
  await page.getByLabel("Nom du client ou de la boutique").fill(nom);
  await page.getByLabel("Téléphone (facultatif)").fill("+224 622 33 44 55");
  await page.getByLabel("Type de client").selectOption({ label: "Détaillant" });
  await page.getByRole("button", { name: "Créer et continuer" }).click();
  await expect(page.getByText("Étape 2 sur 3 : les produits")).toBeVisible();
  // Produit, conditionnement, paquets par colis et prix par colis visibles avant de choisir.
  await expect(page.getByText(/^Colis de \d+ paquets$/).first()).toBeVisible();
  await expect(page.getByText(/le colis$/).first()).toBeVisible();
  const plus = page.getByRole("button", { name: /^Plus \(Colis/ }).first();
  await plus.click();
  await plus.click();
  await plus.click();
  await expect(page.getByLabel("Livraison souhaitée par le client")).not.toHaveValue("");
  await page.getByRole("button", { name: "Vérifier la commande" }).click();
  await expect(page.getByRole("heading", { name: "Commande à envoyer" })).toBeVisible();
  await expect(page.getByText(/Livraison souhaitée :/)).toBeVisible();
  await page.getByRole("button", { name: "Envoyer la commande" }).click();
  const titre = page.getByRole("heading", { name: /^Commande CMD-\d{4}-C01-\d{5}$/ });
  await expect(titre).toBeVisible();
  const numero = (await titre.innerText()).replace("Commande ", "");
  // Reçue par le bureau après l'envoi automatique : l'écran le dit, et la prochaine étape est annoncée.
  await expect(page.getByText("Reçue par l'usine")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Prochaine étape : Confirmer la date de livraison \(souhaitée/)).toBeVisible();
  const duree = (Date.now() - debut) / 1000;
  test.info().annotations.push({ type: "durée commande avec nouveau client (automate)", description: `${duree.toFixed(1)} s` });

  // Le bureau voit la commande une seule fois, avec la date souhaitée, et confirme la date promise.
  const bureau = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await connecter(bureau, "resp.commercial");
  await bureau.goto(`/ventes/pieces?type=commande&q=${numero}`);
  await expect(bureau.getByRole("link", { name: numero })).toHaveCount(1);
  await bureau.getByRole("link", { name: numero }).click();
  await expect(bureau.getByText("Reçue par l'usine")).toBeVisible();
  await expect(bureau.getByText(/Livraison souhaitée :/)).toBeVisible();
  const promise = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
  await bureau.getByLabel("Date de livraison promise").fill(promise);
  await bureau.getByRole("button", { name: "Confirmer la date" }).click();
  await expect(bureau.getByText(/Date de livraison confirmée/)).toBeVisible();
  await expect(bureau.getByText(/^Livraison prévue le /)).toBeVisible();

  // Le commercial voit la date promise après la synchronisation suivante.
  await page.getByRole("button", { name: "Retour" }).click();
  await page.getByRole("button", { name: "Accueil", exact: true }).click();
  await page.getByRole("button", { name: "Envoyer et recevoir maintenant" }).click();
  await attendreSynchro(page);
  await page.getByRole("button", { name: "Ventes", exact: true }).click();
  await page.getByRole("button", { name: new RegExp(numero) }).click();
  await expect(page.getByText(/^Livraison prévue le /)).toBeVisible();
});

test("sans réseau : commande gardée sur le téléphone, jamais comptée comme vente, envoyée une seule fois au retour du réseau", async ({ page, context, browser }) => {
  test.setTimeout(120_000);
  await connecter(page, "commercial1");
  await attendreSynchro(page);
  await page.evaluate(() => navigator.serviceWorker?.ready);

  await context.setOffline(true);
  await expect(page.getByText(/Pas de réseau — continuez à travailler/)).toBeVisible();
  const numero = await commander(page, /Bah|Diallo|Camara|Sylla|Barry|Kaba/);
  await expect(page.getByText(/enregistrée sur ce téléphone\. Elle n'est pas encore arrivée au bureau/)).toBeVisible();

  // Dans « Ventes » : rangée à part, pas dans les ventes confirmées.
  await page.getByRole("button", { name: "Ventes", exact: true }).click();
  const enAttente = page.locator("section", { hasText: "Pas encore envoyé au bureau" });
  await expect(enAttente).toContainText(numero);
  await expect(page.getByText(/Ce n'est pas encore une vente confirmée/)).toBeVisible();

  // Retour du réseau : envoi automatique, la commande devient « Reçue ».
  await context.setOffline(false);
  await expect(enAttente).toHaveCount(0, { timeout: 30_000 });
  await expect(page.getByRole("button", { name: new RegExp(numero) })).toContainText("Reçue ✓");

  // Nouvel envoi forcé : aucun doublon au bureau.
  await page.getByRole("button", { name: "Accueil", exact: true }).click();
  await page.getByRole("button", { name: "Envoyer et recevoir maintenant" }).click();
  await attendreSynchro(page);
  const bureau = await (await browser.newContext()).newPage();
  await connecter(bureau, "resp.commercial");
  await bureau.goto(`/ventes/pieces?type=commande&q=${numero}`);
  await expect(bureau.getByRole("link", { name: numero })).toHaveCount(1);
});

test("refus par le bureau : la commande reste visible « Refusée » avec un motif compréhensible", async ({ page }) => {
  test.setTimeout(120_000);
  await connecter(page, "commercial1");
  await attendreSynchro(page);
  // Prix modifié sur le téléphone (comme une grille périmée) : le serveur refuse un prix différent de la grille.
  await page.evaluate(async () => {
    const bases = await indexedDB.databases();
    const nom = bases.find((b) => b.name?.startsWith("papel-terrain-"))!.name!;
    await new Promise<void>((ok, ko) => {
      const r = indexedDB.open(nom);
      r.onerror = () => ko(r.error);
      r.onsuccess = () => {
        const tx = r.result.transaction("prix", "readwrite");
        const store = tx.objectStore("prix");
        const tous = store.getAll();
        tous.onsuccess = () => {
          for (const p of tous.result as { prixPaquetGnf: number }[]) store.put({ ...p, prixPaquetGnf: p.prixPaquetGnf - 100 });
        };
        tx.oncomplete = () => ok();
        tx.onerror = () => ko(tx.error);
      };
    });
  });
  const numero = await commander(page, /Bah|Diallo|Camara|Sylla|Barry|Kaba/);
  await expect(page.getByRole("alert").filter({ hasText: "Refusée par le bureau" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("alert").filter({ hasText: "Refusée par le bureau" })).not.toContainText(/violates|constraint|sqlstate|function/i);
  await page.getByRole("button", { name: "Retour" }).click();
  await expect(page.getByRole("button", { name: new RegExp(numero) })).toContainText("Refusée");
});
