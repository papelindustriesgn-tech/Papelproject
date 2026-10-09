/**
 * Test de charge — 1 000 utilisateurs SYNTHÉTIQUES (jamais présentés comme de vrais inscrits).
 * Pré-requis : create-test-users.mts exécuté, application démarrée (npm run build && npm start).
 *
 * Usage : npx tsx --env-file=.env.local scripts/load-test/run.mts [N=1000] [concurrence=50]
 */
import os from "node:os";
import fs from "node:fs";
import { ANON, APP_URL, SUPABASE_URL, TEST_PASSWORD, pool, ssrCookie, stats, testEmail } from "./common.mts";

const N = Number(process.argv[2] ?? 1000);
const C = Number(process.argv[3] ?? 50);
type Session = { access_token: string; refresh_token: string; user: { id: string } } & Record<string, unknown>;
const report: Record<string, unknown> = {
  date: new Date().toISOString(),
  users: N,
  concurrency: C,
  machine: { cpus: os.cpus().length, cpu: os.cpus()[0]?.model, memGB: Math.round(os.totalmem() / 1e9), node: process.version },
  target: { app: APP_URL, supabase: SUPABASE_URL },
  phases: {} as Record<string, unknown>,
};

async function timed<T>(fn: () => Promise<T>) {
  const t = performance.now();
  const r = await fn();
  return { r, ms: performance.now() - t };
}

async function phase(name: string, items: number[], fn: (i: number) => Promise<{ ok: boolean; ms: number }>, concurrency = C) {
  const t0 = performance.now();
  const res = await pool(items, concurrency, (i) => fn(i).catch(() => ({ ok: false, ms: 0 })));
  const wall = (performance.now() - t0) / 1000;
  const ok = res.filter((r) => r.ok);
  const out = {
    requests: res.length,
    errors: res.length - ok.length,
    errorRate: `${(((res.length - ok.length) / res.length) * 100).toFixed(2)} %`,
    durationS: +wall.toFixed(1),
    rps: +(res.length / wall).toFixed(1),
    latencyMs: stats(ok.map((r) => r.ms)),
  };
  (report.phases as Record<string, unknown>)[name] = out;
  console.log(`▶ ${name.padEnd(38)} ${String(out.requests).padStart(5)} req · ${out.errors} err · ${out.rps} req/s · p50 ${out.latencyMs.p50} ms · p95 ${out.latencyMs.p95} ms · p99 ${out.latencyMs.p99} ms`);
  return res;
}

const ids = Array.from({ length: N }, (_, i) => i + 1);
const sessions = new Map<number, Session>();

// 1) Connexion
await phase("1. Connexion (Supabase Auth)", ids, async (i) => {
  const { r, ms } = await timed(() =>
    fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: ANON, "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail(i), password: TEST_PASSWORD }),
    }),
  );
  if (!r.ok) return { ok: false, ms };
  sessions.set(i, (await r.json()) as Session);
  return { ok: true, ms };
});

const logged = ids.filter((i) => sessions.has(i));
const cookie = (i: number) => ssrCookie(sessions.get(i));

// 2) Dashboard SSR : on vérifie que chaque utilisateur voit SON prénom (isolation des sessions)
let wrongUser = 0;
await phase("2. Dashboard /accueil (SSR)", logged, async (i) => {
  const { r, ms } = await timed(() => fetch(`${APP_URL}/accueil`, { headers: { cookie: cookie(i) }, redirect: "manual" }));
  const html = await r.text();
  const ok = r.status === 200 && html.includes(`Test${i}<`);
  if (r.status === 200 && !ok) wrongUser++;
  return { ok, ms };
});
(report.phases as Record<string, unknown>)["sessionIsolation"] = { wrongUserRendered: wrongUser };

// 3) Carte digitale (QR généré côté serveur)
await phase("3. Carte digitale /carte", logged, async (i) => {
  const { r, ms } = await timed(() => fetch(`${APP_URL}/carte`, { headers: { cookie: cookie(i) }, redirect: "manual" }));
  const html = await r.text();
  return { ok: r.status === 200 && html.includes("GN-") && html.includes("<svg"), ms };
});

// 4) Navigation mixte : avantages, jobs, logement, marketplace
const PAGES = ["/avantages", "/avantages?categorie=restauration", "/jobs", "/logement?budget=2000000", "/marketplace", "/marketplace?categorie=informatique"];
const mixed = logged.flatMap((i) => [i, i, i]);
await phase("4. Consultation offres/jobs/logement/market", mixed, async (i) => {
  const url = PAGES[Math.floor(Math.random() * PAGES.length)];
  const { r, ms } = await timed(() => fetch(`${APP_URL}${url}`, { headers: { cookie: cookie(i) }, redirect: "manual" }));
  await r.arrayBuffer();
  return { ok: r.status === 200, ms };
});

// 5) Base de données directe (API REST + RLS) avec le jeton de chaque utilisateur
const rest = (i: number, path: string, init: RequestInit = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: ANON, Authorization: `Bearer ${sessions.get(i)!.access_token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
await phase("5. Lecture BDD (profil + carte + deals)", logged, async (i) => {
  const { r, ms } = await timed(async () => {
    const [a, b, c] = await Promise.all([
      rest(i, "profiles?select=id,first_name,uny_id&limit=1"),
      rest(i, "student_cards?select=uny_id,qr_token"),
      rest(i, "deals?select=id,title,discount_label&is_active=eq.true&limit=20"),
    ]);
    const ok = a.ok && b.ok && c.ok && ((await a.json()) as unknown[]).length === 1;
    return ok;
  });
  return { ok: r, ms };
});

// 6) Écritures : favoris + annonce marketplace (puis nettoyage)
const { r: dealsRes } = await timed(() => fetch(`${SUPABASE_URL}/rest/v1/deals?select=id&limit=5`, { headers: { apikey: ANON } }));
const dealIds = ((await dealsRes.json()) as { id: string }[]).map((d) => d.id);
await phase("6a. Écriture favoris (RLS)", logged, async (i) => {
  const { r, ms } = await timed(() =>
    rest(i, "deal_favorites", {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates" },
      body: JSON.stringify({ user_id: sessions.get(i)!.user.id, deal_id: dealIds[i % dealIds.length] }),
    }),
  );
  return { ok: r.ok, ms };
});
const sellers = logged.slice(0, Math.min(200, logged.length));
await phase("6b. Publication marketplace (200 annonces)", sellers, async (i) => {
  const { r, ms } = await timed(() =>
    rest(i, "marketplace_items", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ seller_id: sessions.get(i)!.user.id, title: `Annonce test de charge ${i}`, category: "autres", price_gnf: 1000 * i, status: "hidden" }),
    }),
  );
  return { ok: r.status === 201, ms };
});

// 7) Sécurité sous charge : un utilisateur ne peut pas lire le profil d'un autre
let leaks = 0;
await pool(logged.slice(0, 100), 20, async (i) => {
  const other = sessions.get(logged[(logged.indexOf(i) + 1) % logged.length])!.user.id;
  const r = await rest(i, `profiles?select=id&id=eq.${other}`);
  if (((await r.json()) as unknown[]).length > 0) leaks++;
});
(report.phases as Record<string, unknown>)["rlsIsolation"] = { crossUserProfileReads: leaks, checked: Math.min(100, logged.length) };
console.log(`▶ Isolation RLS : ${leaks} fuite(s) sur ${Math.min(100, logged.length)} tentatives · rendu du mauvais utilisateur : ${wrongUser}`);

// Nettoyage des écritures de test
await pool(logged, C, async (i) => {
  await rest(i, `deal_favorites?user_id=eq.${sessions.get(i)!.user.id}`, { method: "DELETE" });
  await rest(i, `marketplace_items?seller_id=eq.${sessions.get(i)!.user.id}`, { method: "DELETE" });
});

const file = `scripts/load-test/results/load-test-${N}u-${Date.now()}.json`;
fs.writeFileSync(file, JSON.stringify(report, null, 2));
console.log(`\n📄 Rapport : ${file}`);
