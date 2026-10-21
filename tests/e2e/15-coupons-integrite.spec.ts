import { expect, test } from "@playwright/test";
import { createAuthUser, serviceRest, userApi } from "./helpers";

/**
 * Intégrité des codes promo, testée contre l'API de la base : demandes et validations simultanées,
 * carte révoquée, offre expirée ou retirée, droits du caissier. Données 100 % fictives.
 */
test.describe.configure({ mode: "serial" });

const run = `${Date.now()}`.slice(-7);
const ret = { Prefer: "return=representation" };
const password = "Coupons2026x";
let partner: string;
let deal: string;
let flash: string;
const people: Record<string, { email: string; id: string }> = {};

async function person(key: string, role: string, verified = false) {
  const email = `cpn.${key}.${run}@uny.test`;
  const created = await (
    await createAuthUser({ email, password, email_confirm: true, user_metadata: { first_name: "Test", last_name: key } })
  ).json();
  await serviceRest(`profiles?id=eq.${created.id}`, {
    method: "PATCH",
    body: JSON.stringify({ role, account_status: "approved", ...(verified ? { verification_status: "verified" } : {}) }),
  });
  people[key] = { email, id: created.id };
}

test.beforeAll(async () => {
  [{ id: partner }] = await (
    await serviceRest("partners", {
      method: "POST",
      headers: ret,
      body: JSON.stringify({ name: `Café Fictif ${run}`, category: "restauration" }),
    })
  ).json();
  await person("manager", "partner");
  await person("cashier", "partner");
  for (let i = 0; i < 6; i++) await person(`s${i}`, "student", true);
  await serviceRest("partner_members", {
    method: "POST",
    body: JSON.stringify([
      { partner_id: partner, user_id: people.manager.id, role: "manager" },
      { partner_id: partner, user_id: people.cashier.id, role: "cashier" },
    ]),
  });
  const deals = await (
    await serviceRest("deals", {
      method: "POST",
      headers: ret,
      body: JSON.stringify([
        {
          partner_id: partner,
          title: "Menu étudiant fictif",
          discount_label: "-20 %",
          category: "restauration",
          requires_verification: true,
          flash_hours: null,
          flash_quantity: null,
        },
        {
          partner_id: partner,
          title: "Offre flash fictive",
          discount_label: "-50 %",
          category: "restauration",
          requires_verification: true,
          flash_hours: 2,
          flash_quantity: 1,
        },
      ]),
    })
  ).json();
  expect(Array.isArray(deals), JSON.stringify(deals)).toBeTruthy();
  deal = deals[0].id;
  flash = deals[1].id;
});

const claim = async (key: string, dealId: string) =>
  (await userApi(people[key].email, password)).rpc("claim_promo_code", { p_deal: dealId });

test("offre flash à 1 place : 5 demandes simultanées, un seul code", async () => {
  const results = await Promise.all(["s0", "s1", "s2", "s3", "s4"].map((k) => claim(k, flash)));
  const ok = results.filter((r) => r.status === 200);
  expect(ok.length).toBe(1);
  const [{ count }] = await (await serviceRest(`promo_codes?deal_id=eq.${flash}&select=count`)).json();
  expect(count).toBe(1);
});

test("même étudiant, demandes simultanées : un seul code actif", async () => {
  const results = await Promise.all([claim("s5", deal), claim("s5", deal), claim("s5", deal)]);
  const codes = new Set(await Promise.all(results.map(async (r) => (await r.json()).code)));
  expect(codes.size).toBe(1);
});

test("double validation simultanée en caisse : une seule utilisation", async () => {
  const { code } = await (await claim("s0", deal)).json();
  const cashier = await userApi(people.cashier.email, password);
  const redeem = () =>
    cashier.rpc("partner_redeem_promo_code", { p_partner: partner, p_code: code, p_redeem: true, p_payment_method: "cash" });
  const states = await Promise.all([redeem(), redeem(), redeem()].map(async (p) => (await (await p).json()).state));
  expect(states.filter((s) => s === "redeemed").length).toBe(1);
  expect(states.filter((s) => s === "used").length).toBe(2);
  const [row] = await (await serviceRest(`promo_codes?code=eq.${code}&select=status`)).json();
  expect(row.status).toBe("used");
});

test("carte révoquée : la réduction ne s'applique plus, même avec un code obtenu avant", async () => {
  const { code } = await (await claim("s1", deal)).json();
  await serviceRest(`student_cards?user_id=eq.${people.s1.id}`, { method: "PATCH", body: JSON.stringify({ status: "revoked" }) });
  const cashier = await userApi(people.cashier.email, password);
  const r = await (await cashier.rpc("partner_redeem_promo_code", { p_partner: partner, p_code: code, p_redeem: true })).json();
  expect(r.state).toBe("blocked");
  expect(r.reason).toContain("révoquée");
  const [row] = await (await serviceRest(`promo_codes?code=eq.${code}&select=status`)).json();
  expect(row.status).toBe("active");
});

test("offre expirée ou retirée : refus à la demande et à l'utilisation", async () => {
  const { code } = await (await claim("s2", deal)).json();
  await serviceRest(`deals?id=eq.${deal}`, {
    method: "PATCH",
    body: JSON.stringify({ valid_until: "2020-01-01", valid_from: "2019-01-01" }),
  });
  const cashier = await userApi(people.cashier.email, password);
  const r = await (await cashier.rpc("partner_redeem_promo_code", { p_partner: partner, p_code: code, p_redeem: true })).json();
  expect(r.state).toBe("blocked");
  expect(r.reason).toContain("expiré");
  const late = await claim("s3", deal);
  expect(late.status).toBe(400);
  // Vérification de carte pour une offre expirée : refusée
  const v = await cashier.rpc("partner_validate_card", { p_partner: partner, p_uny_id: "UNY-GN-0000-000000", p_deal: deal });
  expect(v.status).toBe(400);
});

test("caissier : valide en caisse mais ne publie pas d'offre ni n'offre de cadeau", async () => {
  const cashier = await userApi(people.cashier.email, password);
  const insert = await cashier.insert("deals", {
    partner_id: partner,
    title: "Offre pirate",
    discount_label: "-90 %",
    category: "restauration",
  });
  expect(insert.status).toBeGreaterThanOrEqual(400);
  const top = await cashier.rpc("partner_top_customers", { p_partner: partner });
  expect(top.status).toBe(403);
  const manager = await userApi(people.manager.email, password);
  const ok = await manager.insert("deals", {
    partner_id: partner,
    title: "Nouvelle offre",
    discount_label: "-10 %",
    category: "restauration",
  });
  expect(ok.status).toBe(201);
});

test.afterAll(async () => {
  await serviceRest(`partners?id=eq.${partner}`, { method: "DELETE" });
  for (const u of Object.values(people)) await serviceRest(`../../auth/v1/admin/users/${u.id}`, { method: "DELETE" });
});
