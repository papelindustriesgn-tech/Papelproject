import { expect, test } from "@playwright/test";
import { serviceRest, signUp } from "./helpers";

test("parcours : une seule action principale, profil complété à la vérification, rubrique Avantages", async ({ page }) => {
  const s = await signUp(page);
  const email = encodeURIComponent(s.email);

  // Accueil : promesse claire, une seule action principale, pas de barre de progression
  await page.goto("/accueil");
  await expect(page.getByText(/Ta carte Uny prouve que tu es étudiant/)).toBeVisible();
  const next = page.getByTestId("next-step");
  await expect(next).toContainText("Fais vérifier ton statut étudiant");
  await expect(page.getByRole("navigation", { name: "Raccourcis" })).toHaveCount(0);
  await expect(page.getByRole("list", { name: "Ton parcours Uny" })).toHaveCount(0);

  // Profil incomplet (inscription en 5 champs) : la vérification commence par le compléter
  await serviceRest(`profiles?email=eq.${email}`, {
    method: "PATCH",
    body: JSON.stringify({ phone: null, birth_date: null, field_of_study: null, study_level: null }),
  });
  await page.goto("/accueil");
  await expect(next).toContainText("complète ton profil");
  await next.click();
  await expect(page).toHaveURL(/profil\/verification/);
  await expect(page.getByRole("heading", { name: "1. Complète ton profil" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /justificatif/ })).toHaveCount(0);
  await page.fill("#phone", s.phone);
  await page.fill("#birth_date", "2004-02-10");
  await page.fill("#field_of_study", "Économie");
  await page.selectOption("#study_level", "Licence 2");
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page.getByText(/Profil complété ✅/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "1. Complète ton profil" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /justificatif/ })).toBeVisible();
  const [p] = await (await serviceRest(`profiles?email=eq.${email}&select=phone,study_level`)).json();
  expect(p).toEqual({ phone: `+224${s.phone}`, study_level: "Licence 2" });

  // Rubrique Avantages : offres, codes et fidélité ; la marketplace est dans Opportunités
  await page.goto("/avantages");
  await page.getByRole("navigation", { name: "Rubrique avantages" }).getByRole("link", { name: "Codes" }).click();
  await expect(page).toHaveURL(/\/avantages\/mes-codes/);
  await expect(page.getByRole("link", { name: "Avantages" }).first()).toHaveAttribute("aria-current", "page");
  await page.goto("/marketplace");
  await expect(page.getByRole("link", { name: "Opportunités" }).first()).toHaveAttribute("aria-current", "page");

  // Étudiant vérifié : l'action suivante est le premier code promo
  await serviceRest(`profiles?email=eq.${email}`, { method: "PATCH", body: JSON.stringify({ verification_status: "verified" }) });
  await page.goto("/accueil");
  await expect(next).toContainText("Obtiens ton premier code promo");
});

test("rétention : une nouvelle offre réelle prévient les étudiants, pas une offre de démo", async ({ page }) => {
  const s = await signUp(page);
  const [student] = await (await serviceRest(`profiles?email=eq.${encodeURIComponent(s.email)}&select=id`)).json();
  const run = `${Date.now()}`.slice(-7);
  const ret = { Prefer: "return=representation" };
  const [real] = await (
    await serviceRest("partners", {
      method: "POST",
      headers: ret,
      body: JSON.stringify({ name: `Café ${run}`, category: "restauration" }),
    })
  ).json();
  const [demo] = await (
    await serviceRest("partners", {
      method: "POST",
      headers: ret,
      body: JSON.stringify({ name: `Démo ${run}`, category: "restauration", is_demo: true }),
    })
  ).json();
  const notifs = async () =>
    (await (await serviceRest(`notifications?user_id=eq.${student.id}&type=eq.new_deal&select=title,link`)).json()) as {
      title: string;
      link: string;
    }[];

  await serviceRest("deals", {
    method: "POST",
    body: JSON.stringify({ partner_id: demo.id, title: `Offre démo ${run}`, discount_label: "-10 %", category: "restauration" }),
  });
  expect(await notifs()).toHaveLength(0);

  // Offre réelle publiée inactive puis activée : une seule alerte
  const [deal] = await (
    await serviceRest("deals", {
      method: "POST",
      headers: ret,
      body: JSON.stringify({
        partner_id: real.id,
        title: `Thé offert ${run}`,
        discount_label: "-15 %",
        category: "restauration",
        is_active: false,
      }),
    })
  ).json();
  expect(await notifs()).toHaveLength(0);
  await serviceRest(`deals?id=eq.${deal.id}`, { method: "PATCH", body: JSON.stringify({ is_active: true }) });
  await serviceRest(`deals?id=eq.${deal.id}`, { method: "PATCH", body: JSON.stringify({ is_active: false }) });
  await serviceRest(`deals?id=eq.${deal.id}`, { method: "PATCH", body: JSON.stringify({ is_active: true }) });
  const got = await notifs();
  expect(got).toHaveLength(1);
  expect(got[0]).toEqual({ title: `Nouvelle offre : Café ${run} 🔥`, link: `/avantages/${deal.id}` });

  await page.goto("/notifications");
  await expect(page.getByText(`Nouvelle offre : Café ${run} 🔥`)).toBeVisible();

  // Nettoyage : les exemples de démo restent affichés pour les autres tests
  await serviceRest(`partners?id=in.(${real.id},${demo.id})`, { method: "DELETE" });
});
