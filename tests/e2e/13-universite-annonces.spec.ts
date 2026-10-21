import { expect, test } from "@playwright/test";
import { ADMIN, adminAsUniversityMember, login, logout, serviceRest, signUp } from "./helpers";

test("université : étudiants déjà sur Uny, demande de matricule, annonce ciblée et export", async ({ page }) => {
  test.setTimeout(120_000);
  const uniId = await adminAsUniversityMember();
  const run = `${Date.now()}`.slice(-7);

  // Un étudiant qui a choisi cet établissement à l'inscription, sans demande de confirmation
  const s = await signUp(page);
  const email = encodeURIComponent(s.email);
  await serviceRest(`profiles?email=eq.${email}`, {
    method: "PATCH",
    body: JSON.stringify({ university_id: uniId, university_other: null, study_level: "Licence 2" }),
  });
  const [st] = await (await serviceRest(`profiles?email=eq.${email}&select=id`)).json();
  await logout(page);

  await login(page, ADMIN.email, ADMIN.password);
  // L'admin local peut être membre de plusieurs établissements (données de démo) : on choisit celui du test
  await page.context().addCookies([{ name: "uny_university", value: String(uniId), url: "http://localhost:3000" }]);
  await page.goto("/universite");
  const block = page.getByTestId("declared-students");
  await expect(block).toContainText("déjà sur Uny");
  await block.getByRole("button", { name: "Leur demander leur matricule" }).click();
  await expect(block.getByText(/reçu la demande/)).toBeVisible();
  const invites = await (await serviceRest(`notifications?user_id=eq.${st.id}&type=eq.university_invite&select=link`)).json();
  expect(invites).toEqual([{ link: "/profil/verification" }]);

  // Annonce aux étudiants de Licence 2
  await page.goto("/universite/annonces");
  await page.fill("#title", `Examens ${run}`);
  await page.fill("#body", "Les examens du premier semestre commencent lundi.");
  await page.selectOption("#study_level", "Licence 2");
  await page.getByRole("button", { name: "Envoyer l'annonce" }).click();
  await expect(page.getByText(/Annonce envoyée à \d+ étudiant/)).toBeVisible();
  await expect(page.getByTestId("announcement").filter({ hasText: `Examens ${run}` })).toContainText("Licence 2");
  const notes = await (
    await serviceRest(`notifications?user_id=eq.${st.id}&type=eq.university_announcement&select=title,body`)
  ).json();
  expect(notes.some((n: { title: string }) => n.title.includes(`Examens ${run}`))).toBeTruthy();

  // Une annonce aux seules inscriptions confirmées ne lui parvient pas
  await page.fill("#title", `Réservé ${run}`);
  await page.fill("#body", "Message aux inscriptions confirmées uniquement.");
  await page.selectOption("#audience", "verified");
  await page.getByRole("button", { name: "Envoyer l'annonce" }).click();
  await expect(page.getByTestId("announcement").filter({ hasText: `Réservé ${run}` })).toBeVisible();
  const after = await (
    await serviceRest(
      `notifications?user_id=eq.${st.id}&type=eq.university_announcement&title=like.*R%C3%A9serv%C3%A9*&select=id`,
    )
  ).json();
  expect(after).toHaveLength(0);

  // Export Excel des inscriptions
  const csv = await page.request.get("/universite/etudiants/export");
  expect(csv.ok()).toBeTruthy();
  expect(csv.headers()["content-type"]).toContain("text/csv");
  expect((await csv.text()).replace(/^﻿/, "").startsWith("Nom;Prénom;Matricule")).toBeTruthy();
  await logout(page);

  // L'étudiant voit l'annonce dans ses notifications
  await login(page, s.email, s.password);
  await page.goto("/notifications");
  await expect(page.getByText(`Examens ${run}`, { exact: false }).first()).toBeVisible();
});
