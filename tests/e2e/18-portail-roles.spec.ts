import { expect, test, type Page } from "@playwright/test";
import { createAuthUser, serviceRest } from "./helpers";

/** Portail établissement : ce que voient un établissement en attente et un membre « Annonces ». Données fictives. */
const run = `${Date.now()}`.slice(-7);
const password = "Portail2026x";

async function member(key: string, status: string, role: string) {
  const [u] = await (
    await serviceRest("universities", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        name: `Établissement fictif ${key} ${run}`,
        country_code: "GN",
        partner_status: status,
        is_active: false,
      }),
    })
  ).json();
  const email = `portail.${key}.${run}@uny.test`;
  const created = await (
    await createAuthUser({ email, password, email_confirm: true, user_metadata: { first_name: "Test", last_name: key } })
  ).json();
  await serviceRest(`profiles?id=eq.${created.id}`, {
    method: "PATCH",
    body: JSON.stringify({ role: "university", account_status: "approved" }),
  });
  await serviceRest("university_members", {
    method: "POST",
    body: JSON.stringify({ university_id: u.id, user_id: created.id, role }),
  });
  return { email, universityId: u.id as number, userId: created.id as string };
}

async function signIn(page: Page, email: string) {
  await page.goto("/connexion");
  await page.fill("#identifier", email);
  await page.fill("#password", password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(/\/universite/);
}

test("établissement en attente : espace à préparer, dossiers d'étudiants verrouillés", async ({ page }) => {
  const m = await member("attente", "pending", "admin");
  await signIn(page, m.email);
  await expect(page.getByText("En attente d'approbation Uny").first()).toBeAttached();
  await page.goto("/universite/etudiants");
  await expect(page.getByText("Disponible après l'approbation de l'établissement")).toBeVisible();
  await page.goto("/universite/demandes");
  await expect(page.getByText("Disponible après l'approbation de l'établissement")).toBeVisible();
  const csv = await page.request.get("/universite/etudiants/export");
  expect(csv.status()).toBe(403);
  // Préparation possible : fiche de l'établissement
  await page.goto("/universite/etablissement");
  await expect(page.getByRole("heading", { level: 2, name: "Fiche" })).toBeVisible();
  await serviceRest(`universities?id=eq.${m.universityId}`, { method: "DELETE" });
  await serviceRest(`../../auth/v1/admin/users/${m.userId}`, { method: "DELETE" });
});

test("rôle « Annonces » d'un établissement approuvé : annonces oui, dossiers non", async ({ page }) => {
  const m = await member("annonces", "partner", "announcer");
  await signIn(page, m.email);
  const nav = page.getByRole("navigation", { name: "Navigation université" });
  await expect(nav.getByRole("link", { name: "Annonces" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Étudiants" })).toHaveCount(0);
  await page.goto("/universite/etudiants");
  await expect(page.getByText("Accès non inclus dans votre rôle")).toBeVisible();
  expect((await page.request.get("/universite/etudiants/export")).status()).toBe(403);
  await serviceRest(`universities?id=eq.${m.universityId}`, { method: "DELETE" });
  await serviceRest(`../../auth/v1/admin/users/${m.userId}`, { method: "DELETE" });
});
