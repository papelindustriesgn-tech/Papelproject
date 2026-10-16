import type { Page } from "@playwright/test";

export const MOT_DE_PASSE = "Papel2026!";

/** Connexion d'un compte de démonstration ; attend l'arrivée dans son espace. */
export async function connecter(page: Page, identifiant: string, motDePasse = MOT_DE_PASSE, attendre = true) {
  await page.goto("/connexion");
  await page.getByLabel("Identifiant").fill(identifiant);
  await page.getByLabel("Mot de passe").fill(motDePasse);
  await page.getByRole("button", { name: "Se connecter" }).click();
  if (attendre) await page.waitForURL((url) => !url.pathname.startsWith("/connexion"));
}
