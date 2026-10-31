import { expect, test } from "@playwright/test";
import { connecter } from "./aide";

test("coller depuis Excel : aperçu des erreurs, création des lignes prêtes, recoller sans doublon", async ({ page }) => {
  await connecter(page, "pdg");
  await page.goto("/rh/employes");
  await page.getByRole("link", { name: "Coller depuis Excel" }).click();
  await expect(page.getByRole("heading", { name: "Ajouter plusieurs employés" })).toBeVisible();

  const suffixe = String(Date.now() % 100000);
  const texte = [
    "Nom\tPrénom\tDate d'embauche\tSalaire de base (GNF)\tFonction",
    `Import${suffixe}\tAwa\t01/11/2026\t1 500 000 GNF\tConducteur de ligne`,
    `Import${suffixe}\tBinta\t31/02/2026\t\t`,
  ].join("\n");
  const zone = page.getByLabel(/Collez vos lignes ici/);
  await zone.fill(texte);
  await expect(page.getByText("1 ligne(s) prête(s)")).toBeVisible();
  await expect(page.getByText(/date illisible « 31\/02\/2026 »/)).toBeVisible();
  await page.getByRole("button", { name: "Créer 1 employé" }).click();
  await expect(page.getByText("1 employé(s) créé(s), avec leur matricule. 1 ligne(s) en erreur non créée(s).")).toBeVisible();

  // Recoller la même liste : la personne déjà créée est reconnue, rien n'est créé deux fois.
  await zone.fill(texte);
  await expect(page.getByText("Existe déjà dans l'ERP.")).toBeVisible();
  await expect(page.getByText("0 ligne(s) prête(s)")).toBeVisible();
});
