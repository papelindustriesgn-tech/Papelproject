import { defineConfig } from "@playwright/test";

/**
 * Tests de bout en bout. Pré-requis : Supabase local démarré (npx supabase start)
 * et l'application lancée sur http://localhost:3000 (npm run build && npm start).
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    viewport: { width: 390, height: 844 },
    locale: "fr-FR",
    timezoneId: "Africa/Conakry",
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : undefined,
  },
});
