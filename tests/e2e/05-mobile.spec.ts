import { expect, test } from "@playwright/test";
import { ADMIN, adminAsPartnerMember, adminAsUniversityMember, expectNoHorizontalOverflow, login, signUp } from "./helpers";

const VIEWPORTS = [
  { name: "Android 360", width: 360, height: 780 },
  { name: "iPhone / Android 390", width: 390, height: 844 },
  { name: "Android 412", width: 412, height: 915 },
  { name: "iPhone SE 375", width: 375, height: 667 },
  { name: "Desktop 1280", width: 1280, height: 800 },
];

const PUBLIC = [
  "/",
  "/connexion",
  "/inscription",
  "/mot-de-passe-oublie",
  "/conditions",
  "/confidentialite",
  "/partenaires",
  "/universites",
];
const APP = [
  "/accueil",
  "/carte",
  "/avantages",
  "/jobs",
  "/logement",
  "/marketplace",
  "/marketplace/nouveau",
  "/marketplace/mes-annonces",
  "/profil",
  "/profil/modifier",
  "/profil/verification",
  "/profil/parametres",
  "/profil/securite",
  "/favoris",
  "/notifications",
  "/avis",
];
const ADMIN_PAGES = [
  "/admin",
  "/admin/verifications",
  "/admin/utilisateurs",
  "/admin/avantages",
  "/admin/avantages/nouveau",
  "/admin/logements",
  "/admin/marketplace",
  "/admin/statistiques",
  "/admin/avis",
  "/admin/contacts",
  "/admin/demandes-partenaires",
  "/admin/universites",
  "/admin/verifications?type=universites",
  "/admin/verifications?type=bac",
  "/admin/verifications?type=registre",
  "/admin/emails",
];
const UNIVERSITY_PAGES = [
  "/universite",
  "/universite/demandes",
  "/universite/etudiants",
  "/universite/imports",
  "/universite/carte",
  "/universite/etablissement",
];
const PARTNER_PAGES = [
  "/partenaire",
  "/partenaire/scanner",
  "/partenaire/offres",
  "/partenaire/offres/nouveau",
  "/partenaire/boutique",
  "/partenaire/boutique/nouveau",
  "/partenaire/logements",
  "/partenaire/logements/nouveau",
  "/partenaire/jobs",
  "/partenaire/jobs/nouveau",
  "/partenaire/publier",
  "/partenaire/profil",
];

test.beforeAll(async () => {
  await adminAsPartnerMember();
  await adminAsUniversityMember();
});

for (const vp of VIEWPORTS) {
  test(`aucun débordement horizontal — ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    for (const url of PUBLIC) {
      await page.goto(url);
      await expectNoHorizontalOverflow(page);
    }
    await signUp(page);
    for (const url of APP) {
      await page.goto(url);
      await expectNoHorizontalOverflow(page);
    }
    // Pages de détail
    for (const list of ["/avantages", "/jobs", "/logement", "/marketplace"]) {
      await page.goto(list);
      const href = await page
        .locator(`main a[href^="${list}/"]:not([href$="nouveau"]):not([href$="mes-annonces"])`)
        .first()
        .getAttribute("href");
      await page.goto(href!);
      await expectNoHorizontalOverflow(page);
    }
    if (vp.width < 1024) {
      // Navigation basse visible et complète sur mobile
      const nav = page.getByRole("navigation", { name: "Navigation principale" });
      await expect(nav).toBeVisible();
      for (const l of ["Accueil", "Avantages", "Jobs", "Marketplace", "Profil"])
        await expect(nav.getByRole("link", { name: l })).toBeVisible();
      await expect(page.getByRole("link", { name: "Ma carte" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Logement" }).first()).toBeVisible();
    }
    await page.context().clearCookies();
    await login(page, ADMIN.email, ADMIN.password);
    for (const url of ADMIN_PAGES) {
      await page.goto(url);
      await expectNoHorizontalOverflow(page);
    }
    for (const url of PARTNER_PAGES) {
      await page.goto(url);
      await expect(page).toHaveURL(new RegExp(`${url}$`));
      await expectNoHorizontalOverflow(page);
    }
    if (vp.width < 1024) {
      const nav = page.getByRole("navigation", { name: "Navigation partenaire" });
      for (const l of ["Accueil", "Offres", "Scanner", "Publier", "Fiche"])
        await expect(nav.getByRole("link", { name: l })).toBeVisible();
    }
    for (const url of UNIVERSITY_PAGES) {
      await page.goto(url);
      await expect(page).toHaveURL(new RegExp(`${url}$`));
      await expectNoHorizontalOverflow(page);
    }
    if (vp.width < 1024) {
      const nav = page.getByRole("navigation", { name: "Navigation université" });
      for (const l of ["Accueil", "Demandes", "Étudiants", "Listes", "Carte"])
        await expect(nav.getByRole("link", { name: l })).toBeVisible();
    }
  });
}
