import { defineConfig, devices } from "@playwright/test";

/**
 * Parcours de bout en bout. Prérequis : Supabase local démarré et base réinitialisée
 * (`npx supabase db reset`), application lancée sur le port 3000 (`npm run build && npm start`).
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: process.env.E2E_URL ?? "http://127.0.0.1:3000",
    locale: "fr-FR",
    timezoneId: "Africa/Conakry",
    screenshot: "only-on-failure",
  },
  projects: [
    // Téléphone Android d'entrée de gamme.
    { name: "mobile", use: { ...devices["Galaxy S9+"], viewport: { width: 360, height: 740 } } },
  ],
});
