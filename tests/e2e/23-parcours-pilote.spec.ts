import { expect, test } from "@playwright/test";
import { ADMIN, adminAsPartnerMember, login, logout, serviceRest, signUp, uniqueDocument, userApi } from "./helpers";

/**
 * Parcours pilote complet avec des comptes fictifs (base locale) :
 * inscription → dossier → validation autorisée → carte vérifiée → offre → coupon → utilisation → historique,
 * plus la file de traitement de l'équipe et la « prochaine étape » côté étudiant.
 */
test("parcours pilote : inscription → justificatif contrôlé → carte → offre → coupon → utilisation → historique", async ({ page }) => {
  test.setTimeout(180_000);
  const run = `${Date.now()}`.slice(-7);
  await adminAsPartnerMember();

  // 1. Inscription puis justificatif ; la prochaine étape est explicite
  const s = await signUp(page);
  await page.goto("/profil/verification");
  await expect(page.getByTestId("next-step")).toContainText(/Prochaine étape/);
  await page.selectOption("#document_type", "student_card");
  await page.setInputFiles('[data-testid="doc-input"]', uniqueDocument());
  await page.getByRole("button", { name: "Envoyer mon justificatif" }).click();
  await expect(page.getByText(/a été envoyé à l'instant/)).toBeVisible();
  await expect(page.getByTestId("next-step")).toContainText("attendre le contrôle de ton justificatif");
  await expect(page.getByText(/un email/)).toHaveCount(0);
  await logout(page);

  // 2. L'équipe voit le dossier dans la file de traitement, puis le contrôle et le valide
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto("/admin/pilotage");
  await expect(page.getByTestId("queue-documents")).toContainText("Contrôler le document");
  await page.goto("/admin/verifications");
  const card = page.locator("li", { hasText: `${s.first} ${s.last}` }).first();
  for (const label of [
    "Nom et prénom identiques au profil",
    "Établissement identique au profil",
    "Document de l'année académique en cours",
    "Document lisible, original, sans retouche visible",
  ])
    await card.getByLabel(label).check();
  await card.getByLabel("Matricule lu sur le document").fill(`PIL${run}`);
  await card.getByRole("button", { name: "Valider" }).click();
  await expect(page.getByText(/Étudiant vérifié ✅/)).toBeVisible();

  // 3. Offre avec prix étudiant calculé
  await page.goto("/partenaire/offres/nouveau");
  await page.waitForLoadState("networkidle");
  await page.fill("#title", `Menu pilote ${run}`);
  await page.getByLabel("Prix normal (GNF)").fill("30000");
  await page.getByLabel("Réduction (%)").fill("10");
  await expect(page.getByTestId("student-price")).toContainText("27 000 GNF");
  await page.getByRole("button", { name: "Publier" }).click();
  await expect(page).toHaveURL(/partenaire\/offres\?enregistre=1/);
  await logout(page);

  // 4. Carte vérifiée, coupon
  await login(page, s.email, s.password);
  await page.goto("/carte");
  await expect(page.getByText("Étudiant vérifié").first()).toBeVisible();
  await page.goto(`/avantages?q=${run}&ville=toutes`);
  await page.getByText(`Menu pilote ${run}`).click();
  await page.getByRole("button", { name: "Obtenir mon code promo" }).click();
  const code = (await page.getByTestId("promo-code").textContent())!;
  expect(code).toMatch(/^UNY-/);
  await logout(page);

  // 5. Utilisation en caisse
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto("/partenaire/scanner");
  await page.waitForLoadState("networkidle");
  await page.fill("input[name=promo_code]", code);
  await page.getByRole("button", { name: "Vérifier le code" }).click();
  await expect(page.getByTestId("promo-result").getByText("Code valable")).toBeVisible();
  await page.getByRole("button", { name: /Confirmer l'utilisation/ }).click();
  await expect(page.getByTestId("promo-result").getByText("Code validé ✅")).toBeVisible();
  await logout(page);

  // 6. Historique côté étudiant et trace en base
  await login(page, s.email, s.password);
  await page.goto("/avantages/mes-codes");
  await expect(page.getByText(code)).toBeVisible();
  await expect(page.getByText("Utilisé", { exact: true })).toBeVisible();
  const [row] = await (await serviceRest(`promo_codes?code=eq.${code}&select=status,used_at`)).json();
  expect(row.status).toBe("used");
  const audit = await (await serviceRest(`audit_log?action=eq.verification.document_approved&order=created_at.desc&limit=1&select=details`)).json();
  expect(audit[0].details.checks).toMatchObject({ identity: true, institution: true, academic_year: true, authentic: true });
});

test("file de traitement : réservée à l'équipe ; étudiant d'un établissement partenaire orienté vers son établissement", async ({ page }) => {
  const s = await signUp(page);
  const api = await userApi(s.email, s.password);
  expect((await api.rpc("ops_queues", {})).status).toBe(403);
  // Étudiant rattaché à un établissement partenaire avec portail : pas de justificatif Uny
  const [demo] = await (await serviceRest("universities?partner_status=eq.partner&select=id,university_members(user_id)")).json().then(
    (rows: { id: number; university_members: unknown[] }[]) => rows.filter((r) => r.university_members.length > 0),
  );
  test.skip(!demo, "Aucun établissement partenaire avec portail dans la base locale");
  const [p] = await (await serviceRest(`profiles?email=eq.${encodeURIComponent(s.email)}&select=id`)).json();
  await serviceRest(`profiles?id=eq.${p.id}`, { method: "PATCH", body: JSON.stringify({ university_id: demo.id }) });
  await page.goto("/profil/verification");
  await expect(page.getByText(/Ton établissement est partenaire de Uny/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Envoyer mon justificatif" })).toHaveCount(0);
  await expect(page.getByTestId("next-step")).toContainText("demander la confirmation de ton inscription");
});
