import { chromium } from "@playwright/test";
const BASE = "https://papel-erp.vercel.app";
const b = await chromium.launch();
async function session(id) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.route("**/*", async (route) => route.fulfill({ response: await route.fetch({ maxRedirects: 0 }) }));
  const p = await ctx.newPage();
  p.on("pageerror", (e) => console.log("  ERREUR JS", e.message.slice(0, 200)));
  p.on("response", (r) => { if (r.status() >= 500) console.log("  HTTP", r.status(), r.url()); });
  await p.goto(BASE + "/connexion");
  await p.locator('input[name="identifiant"]').fill(id);
  await p.locator('input[name="motDePasse"]').fill("Papel2026!");
  await p.locator('button[type="submit"]').click();
  await p.waitForURL((u) => !u.pathname.startsWith("/connexion"), { timeout: 20000 });
  return p;
}
for (const id of ["pdg", "admin"]) {
  const p = await session(id);
  await p.goto(BASE + "/admin", { waitUntil: "networkidle" });
  const menu = p.getByRole("link", { name: "Réglages des services" });
  console.log(id, "menu visible:", await menu.count());
  if (await menu.count()) { await menu.first().click(); await p.waitForURL((u) => u.pathname.startsWith("/admin/reglages") || u.pathname.startsWith("/acces"), { timeout: 15000 }).catch(() => console.log("  pas de navigation après clic")); }
  console.log(id, "après clic menu:", new URL(p.url()).pathname, (await p.locator("h1").first().innerText().catch(()=>"")).slice(0,60));
  for (const e of id === "pdg" ? ["magasin"] : []) {
    await p.goto(BASE + "/admin/reglages", { waitUntil: "networkidle" });
    const l = p.locator(`a[href="/admin/reglages/${e}"]`);
    if (!(await l.count())) { console.log(" ", e, "pas de lien"); continue; }
    await l.click();
    await p.waitForURL((u) => u.pathname !== "/admin/reglages", { timeout: 15000 }).catch(() => {});
    await p.waitForLoadState("networkidle");
    const t = await p.locator("body").innerText();
    console.log(" ", e, "→", new URL(p.url()).pathname, t.includes("Phrase d'accueil") ? "OK" : "PROBLÈME: " + t.slice(0, 150).replace(/\n/g, " "));
  }
  await p.unrouteAll({ behavior: "ignoreErrors" }); await p.context().close();
}
await b.close();
