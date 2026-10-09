import fs from "node:fs";
import { expect, type Page } from "@playwright/test";

export const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";
export const ADMIN = { email: "admin@uny.local", password: "AdminUny2026" };

export function uniqueStudent() {
  const n = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    first: "Mariama",
    last: `Diallo${n.slice(-5)}`,
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

/** Inscription complète ; le compte est ensuite validé (comme le ferait l'admin), sauf `pending: true`. */
export async function signUp(page: Page, s = uniqueStudent(), { pending = false } = {}) {
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
  if (!pending) {
    const res = await serviceRest(`profiles?email=eq.${encodeURIComponent(s.email)}`, {
      method: "PATCH",
      body: JSON.stringify({ account_status: "approved" }),
    });
    expect(res.ok).toBeTruthy();
    await page.reload();
  }
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

/** Crée un compte directement via l'API d'administration (comme un script ou un robot). */
export async function createAuthUser(body: Record<string, unknown>) {
  return serviceRest("../../auth/v1/admin/users", { method: "POST", body: JSON.stringify(body) });
}

/** Appel REST au Supabase local avec la clé de service (préparation de données de test). */
export async function serviceRest(path: string, init: RequestInit = {}) {
  const env = (key: string) =>
    fs
      .readFileSync(".env.local", "utf8")
      .split("\n")
      .find((l) => l.startsWith(`${key}=`))
      ?.slice(key.length + 1)
      .trim() ?? "";
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  return fetch(`${env("NEXT_PUBLIC_SUPABASE_URL")}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...init.headers },
  });
}

/** Rend l'admin local membre d'un partenaire de démo (pour parcourir l'espace partenaire). */
export async function adminAsPartnerMember() {
  const [admin] = await (await serviceRest(`profiles?email=eq.${ADMIN.email}&select=id`)).json();
  const [partner] = await (await serviceRest("partners?select=id&order=name&limit=1")).json();
  await serviceRest("partner_members", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates" },
    body: JSON.stringify({ partner_id: partner.id, user_id: admin.id }),
  });
  return partner.id as string;
}

/** Rend l'admin local membre d'une université partenaire (pour parcourir le portail université). */
export async function adminAsUniversityMember() {
  const [admin] = await (await serviceRest(`profiles?email=eq.${ADMIN.email}&select=id`)).json();
  const [uni] = await (await serviceRest("universities?select=id&partner_status=eq.partner&order=id&limit=1")).json();
  let id = uni?.id as number | undefined;
  if (!id) {
    const [any] = await (await serviceRest("universities?select=id&order=id&limit=1")).json();
    await serviceRest(`universities?id=eq.${any.id}`, { method: "PATCH", body: JSON.stringify({ partner_status: "partner" }) });
    id = any.id;
  }
  await serviceRest("university_members", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates" },
    body: JSON.stringify({ university_id: id, user_id: admin.id }),
  });
  return id;
}
