import { expect, type Page } from "@playwright/test";

export const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";
export const ADMIN = { email: "admin@uny.local", password: "AdminUny2026" };

export function uniqueStudent() {
  const n = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    first: "Mariama",
    last: "Diallo",
    email: `e2e.${n}@example.com`,
    phone: `62${n.slice(-7)}`,
    password: "Etudiant2026",
  };
}

export async function latestMailLink(to: string, pattern = /href="([^"]*auth\/confirm[^"]*)"/) {
  for (let i = 0; i < 20; i++) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`);
    const list = await res.json();
    if (list.messages?.length) {
      const msg = await (await fetch(`${MAILPIT}/api/v1/message/${list.messages[0].ID}`)).json();
      const m = msg.HTML.match(pattern);
      if (m) return m[1].replace(/&amp;/g, "&");
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Aucun email trouvé pour ${to}`);
}

export async function signUp(page: Page, s = uniqueStudent()) {
  await page.goto("/inscription");
  await page.fill("#first_name", s.first);
  await page.fill("#last_name", s.last);
  await page.fill("#birth_date", "2003-05-14");
  await page.fill("#phone", s.phone);
  await page.fill("#email", s.email);
  await page.fill("#password", s.password);
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.selectOption("#university_id", { index: 1 });
  await page.fill("#field_of_study", "Informatique");
  await page.selectOption("#study_level", "Licence 3");
  await page.check("input[name=terms]");
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.waitForURL(/inscription\/confirmation/);
  const link = await latestMailLink(s.email);
  await page.goto(link);
  await page.waitForURL(/\/accueil/);
  return s;
}

export async function login(page: Page, identifier: string, password: string) {
  await page.goto("/connexion");
  await page.fill("#identifier", identifier);
  await page.fill("#password", password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(/\/(accueil|admin)/);
}

export async function logout(page: Page) {
  await page.context().clearCookies();
}

export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, `débordement horizontal sur ${page.url()}`).toBeLessThanOrEqual(0);
}
