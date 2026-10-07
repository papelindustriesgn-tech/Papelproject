import { expect, test, type Page } from "@playwright/test";
import { ADMIN, login, logout, serviceRest, signUp } from "./helpers";

async function requestEnrollment(page: Page, university: string, matricule: string) {
  await page.goto("/profil/verification");
  await page.waitForLoadState("networkidle");
  await page.selectOption("#university_id", { label: university });
  await page.fill("#student_number", matricule);
  await page.fill("#faculty", "Faculté des Sciences");
  await page.getByRole("button", { name: "Faire confirmer mon inscription" }).click();
}

test("université : demande → portail → carte personnalisée → import → vérification automatique et manuelle", async ({ page }) => {
  test.setTimeout(180_000);
  const run = `${Date.now()}`.slice(-7);
  const uniName = `Institut Test ${run}`;
  const official = `Institut Supérieur de Test ${run}`;
  const email = `scolarite.${run}@example.com`;

  // 1. Demande publique d'ouverture du portail
  await page.goto("/universites");
  await page.waitForLoadState("networkidle");
  await page.fill("#university_name", uniName);
  await page.fill("#contact_name", "Kadiatou Sow");
  await page.fill("#contact_title", "Directrice de la scolarité");
  await page.fill("#phone", `62${run}`);
  await page.fill("#email", email);
  await page.check("input[name=has_api]");
  await page.getByRole("button", { name: "Demander l'ouverture du portail" }).click();
  await expect(page.getByText("Demande envoyée")).toBeVisible();

  // 2. Approbation par l'admin : établissement partenaire + compte du portail
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto("/admin/universites");
  const appCard = page
    .locator("div", { hasText: uniName })
    .filter({ has: page.getByRole("button", { name: /Approuver/ }) })
    .last();
  await appCard.getByRole("button", { name: /Approuver/ }).click();
  const msg = page.getByText(/Mot de passe provisoire/);
  await expect(msg).toBeVisible();
  const password = (await msg.textContent())!.match(/provisoire : (\S+)/)![1];
  await logout(page);

  // 3. Deux étudiants : A (correspond à la liste) et B (nom différent)
  const a = await signUp(page);
  await requestEnrollment(page, uniName, `M-${run}-1`);
  await expect(page.getByText(`Ta demande a été transmise à ${uniName}`)).toBeVisible();
  await logout(page);

  // 4. Le portail université : arrivée directe, carte personnalisée
  await login(page, email, password).catch(() => undefined);
  await page.goto("/accueil");
  await expect(page).toHaveURL(/\/universite$/);
  await expect(page.getByRole("heading", { name: /Bonjour Kadiatou/ })).toBeVisible();
  await expect(page.getByText("1 demande à traiter")).toBeVisible();

  await page.goto("/universite/carte");
  await page.waitForLoadState("networkidle");
  await page.fill("#official_name", official);
  await page.fill("#primary_color", "#0f5132");
  await page.fill("#secondary_color", "#198754");
  await page.getByText("Bandeau", { exact: true }).click();
  await page.fill("input[name=label_student_number]", "N° étudiant");
  await page.getByRole("button", { name: "Enregistrer et publier la carte" }).click();
  await expect(page.getByText(/Carte publiée ✅ \(version 1\)/)).toBeVisible();

  // 5. Import de la liste officielle : A est confirmé automatiquement
  await page.goto("/universite/imports");
  await page.waitForLoadState("networkidle");
  const csv = [
    "Matricule;Nom;Prénom(s);Date de naissance;Faculté;Filière;Niveau",
    `M-${run}-1;${a.last.toUpperCase()};${a.first};14/05/2003;Faculté des Sciences;Informatique;Licence 3`,
    `M-${run}-2;CAMARA;Mariama;14/05/2003;Faculté des Sciences;Informatique;Licence 3`,
    `;Sans matricule;X;;;;`,
  ].join("\n");
  await page.setInputFiles("#file", { name: "inscrits.csv", mimeType: "text/csv", buffer: Buffer.from(csv, "utf8") });
  await page.getByRole("button", { name: "Importer la liste" }).click();
  const report = page.getByTestId("import-report");
  await expect(report).toContainText("2 étudiants enregistrés");
  await expect(report).toContainText("1 confirmée automatiquement");
  // Aucune donnée personnelle en clair dans la base
  const [entry] = await (await serviceRest(`university_roster_entries?select=*&limit=1&order=id.desc`)).json();
  expect(JSON.stringify(entry)).not.toContain(a.last.toUpperCase());
  expect(entry.student_number_hash).toMatch(/^[0-9a-f]{64}$/);
  await logout(page);

  // 6. Étudiant B : matricule connu mais nom différent → « à examiner », puis refus motivé
  const b = await signUp(page);
  await requestEnrollment(page, uniName, `M-${run}-2`);
  await expect(page.getByText(`Ta demande a été transmise à ${uniName}`)).toBeVisible();
  await logout(page);

  await login(page, email, password).catch(() => undefined);
  await page.goto("/universite/demandes");
  const item = page.getByTestId("enrollment").filter({ hasText: b.last });
  await expect(item.getByText("À examiner")).toBeVisible();
  await expect(item.getByText("✗ Nom")).toBeVisible();
  await item.getByRole("button", { name: "Refuser" }).click();
  await item.getByLabel("Motif").fill("Nom différent de notre registre");
  await item.getByRole("button", { name: "Refuser" }).click();
  await expect(item).toHaveCount(0);

  // Étudiant A visible dans « Étudiants & cartes », confirmé via la liste
  await page.goto("/universite/etudiants");
  const rowA = page.getByTestId("enrollment").filter({ hasText: a.last });
  await expect(rowA.getByText("Confirmée")).toBeVisible();
  await expect(rowA.getByText("Liste importée")).toBeVisible();
  await logout(page);

  // 7. Carte de A aux couleurs de l'université, avec matricule
  await login(page, a.email, a.password);
  await page.goto("/carte");
  await expect(page.getByText(official).first()).toBeVisible();
  await expect(page.getByText("N° étudiant").first()).toBeVisible();
  await expect(page.getByText(`M-${run}-1`).first()).toBeVisible();
  await expect(page.getByText("Étudiant vérifié").first()).toBeVisible();
  await page.goto("/notifications");
  await expect(page.getByText("Inscription confirmée ✅")).toBeVisible();
  await logout(page);

  // B est notifié du refus avec le motif
  await login(page, b.email, b.password);
  await page.goto("/profil/verification");
  await expect(page.getByText("Nom différent de notre registre").first()).toBeVisible();
  await logout(page);

  // 8. L'université expire la carte de A : la carte n'est plus valable
  await login(page, email, password).catch(() => undefined);
  await page.goto("/universite/etudiants");
  const rowExpire = page.getByTestId("enrollment").filter({ hasText: a.last });
  await rowExpire.getByRole("button", { name: "Expirer la carte" }).click();
  await expect(rowExpire.getByText("Expirée", { exact: true })).toBeVisible();
  await logout(page);
  await login(page, a.email, a.password);
  await page.goto("/carte");
  await expect(page.getByText("Carte expirée").first()).toBeVisible();
});

test("BAC : relevé contrôlé par Uny puis supprimé, preuve minimale conservée", async ({ page }) => {
  test.setTimeout(120_000);
  const s = await signUp(page);
  const candidate = `2022${Date.now()}`.slice(0, 13);
  await page.goto("/profil/verification");
  await page.waitForLoadState("networkidle");
  await page.fill("#exam_year", "2022");
  await page.fill("#candidate_number", candidate);
  await page.setInputFiles("[data-testid=bac-input]", {
    name: "releve.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n% releve de test\n"),
  });
  await page.getByRole("button", { name: "Envoyer pour vérification" }).click();
  await expect(page.getByText(/Relevé envoyé ✅|en cours de vérification par l'équipe Uny/)).toBeVisible();
  await logout(page);

  await login(page, ADMIN.email, ADMIN.password);
  await page.goto("/admin/verifications?type=bac");
  const card = page.locator("li", { hasText: `${s.first} ${s.last}` });
  await expect(card.getByText(`candidat ••••${candidate.slice(-4)}`)).toBeVisible();
  await card.getByRole("button", { name: "BAC vérifié" }).click();
  await expect(card).toHaveCount(0);

  const [row] = await (
    await serviceRest(
      `bac_verifications?select=*,profile:profiles!bac_verifications_user_id_fkey(email)&profile.email=eq.${s.email}&profile=not.is.null`,
    )
  ).json();
  expect(row.status).toBe("verified");
  expect(row.document_path).toBeNull();
  expect(row.candidate_ref).toBe(`••••${candidate.slice(-4)}`);
  expect(JSON.stringify(row)).not.toContain(candidate);

  await page.goto("/admin/verifications?type=registre");
  await expect(page.getByRole("cell", { name: `${s.first} ${s.last}` }).first()).toBeVisible();
});

test("emails étudiants : réservation prenom.nom avec gestion des homonymes", async ({ page }) => {
  // Deux étudiants vérifiés homonymes
  const run = `${Date.now()}`.slice(-6);
  const last = `Homonyme${run}`;
  const ids: string[] = [];
  for (const i of [1, 2]) {
    const s = await signUp(page, {
      first: "Mamadou",
      last,
      email: `homonyme${i}.${run}@example.com`,
      phone: `65${run}${i}`,
      password: "Etudiant2026",
    });
    await logout(page);
    const [p] = await (await serviceRest(`profiles?email=eq.${s.email}&select=id`)).json();
    await serviceRest(`profiles?id=eq.${p.id}`, { method: "PATCH", body: JSON.stringify({ verification_status: "verified" }) });
    ids.push(p.id);
  }

  await login(page, ADMIN.email, ADMIN.password);
  await page.goto("/admin/emails");
  await page.fill("#domain", "etu.uny.test");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Réglages enregistrés ✅")).toBeVisible();
  await page.getByRole("button", { name: "Réserver les adresses des étudiants vérifiés" }).click();
  await expect(page.getByText(/adresses? réservées? ✅/)).toBeVisible();

  const slug = last.toLowerCase();
  await page.goto("/admin/emails?statut=pending");
  await expect(page.getByText(`mamadou.${slug}@etu.uny.test`)).toBeVisible();
  await expect(page.getByText(`mamadou.${slug}2@etu.uny.test`)).toBeVisible();

  // Activation après création chez le fournisseur, puis suspension : l'adresse reste réservée
  const row = page.locator("tr", { hasText: `mamadou.${slug}@etu.uny.test` });
  await row.getByRole("button", { name: "Boîte créée → activer" }).click();
  await expect(row).toHaveCount(0);
  await page.goto("/admin/emails?statut=active");
  await expect(page.getByText(`mamadou.${slug}@etu.uny.test`)).toBeVisible();

  // Remise à zéro du domaine (les autres tests n'attribuent pas d'adresses)
  await page.goto("/admin/emails");
  await page.fill("#domain", "");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Réglages enregistrés ✅")).toBeVisible();
  expect(ids).toHaveLength(2);
});
