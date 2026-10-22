import { expect, test } from "@playwright/test";
import { ADMIN, createAuthUser, envVar, serviceRest, userApi } from "./helpers";

/** Correctifs après revue : autorisation de publish_card_template (identités fictives, base locale). */
test.describe.configure({ mode: "serial" });

const run = `${Date.now()}`.slice(-7);
const password = "Revue2026x";
const ret = { Prefer: "return=representation" };
const users: string[] = [];
const unis: number[] = [];

async function uni(status: string) {
  const [u] = await (
    await serviceRest("universities", {
      method: "POST",
      headers: ret,
      body: JSON.stringify({ name: `Établissement revue ${status} ${run}-${unis.length}`, country_code: "GN", partner_status: status, is_active: false }),
    })
  ).json();
  unis.push(u.id);
  return u.id as number;
}
async function person(key: string, memberOf?: { uni: number; role: string }) {
  const email = `revue.${key}.${run}@uny.test`;
  const u = await (await createAuthUser({ email, password, email_confirm: true, user_metadata: { first_name: "Revue", last_name: key } })).json();
  users.push(u.id);
  await serviceRest(`profiles?id=eq.${u.id}`, { method: "PATCH", body: JSON.stringify({ role: memberOf ? "university" : "student", account_status: "approved" }) });
  if (memberOf)
    await serviceRest("university_members", { method: "POST", body: JSON.stringify({ university_id: memberOf.uni, user_id: u.id, role: memberOf.role }) });
  return email;
}

test("publish_card_template : seuls l'admin Uny et l'admin de l'établissement publient ; les refus ne modifient rien", async () => {
  const target = await uni("partner");
  const pending = await uni("pending");
  const other = await uni("partner");
  const args = (u: number) => ({ p_university: u, p_layout: "classic", p_fields: ["student_number"], p_labels: {} });
  const templates = async (u: number) =>
    (await (await serviceRest(`university_card_templates?university_id=eq.${u}&select=version,is_active&order=version`)).json()) as {
      version: number;
      is_active: boolean;
    }[];

  // Référence : l'admin de l'établissement publie la version 1
  const owner = await userApi(await person("owner", { uni: target, role: "admin" }), password);
  expect((await owner.rpc("publish_card_template", args(target))).status).toBe(200);
  const before = await templates(target);
  expect(before).toEqual([{ version: 1, is_active: true }]);

  // Refusés : extérieur, admin d'un autre établissement, rôles insuffisants, anonyme
  const refused: [string, () => Promise<Response>][] = [
    ["extérieur", async () => (await userApi(await person("outsider"), password)).rpc("publish_card_template", args(target))],
    ["admin d'un autre établissement", async () => (await userApi(await person("otheradmin", { uni: other, role: "admin" }), password)).rpc("publish_card_template", args(target))],
    ["validation", async () => (await userApi(await person("validator", { uni: target, role: "validator" }), password)).rpc("publish_card_template", args(target))],
    ["consultation", async () => (await userApi(await person("viewer", { uni: target, role: "viewer" }), password)).rpc("publish_card_template", args(target))],
    ["annonces", async () => (await userApi(await person("announcer", { uni: target, role: "announcer" }), password)).rpc("publish_card_template", args(target))],
    [
      "anonyme",
      () =>
        fetch(`${envVar("NEXT_PUBLIC_SUPABASE_URL")}/rest/v1/rpc/publish_card_template`, {
          method: "POST",
          headers: { apikey: envVar("NEXT_PUBLIC_SUPABASE_ANON_KEY"), "Content-Type": "application/json" },
          body: JSON.stringify(args(target)),
        }),
    ],
  ];
  for (const [who, call] of refused) {
    const res = await call();
    expect([401, 403], `${who} doit être refusé`).toContain(res.status);
  }
  // Aucune nouvelle version, la version active est inchangée
  expect(await templates(target)).toEqual(before);

  // Autorisés : admin de l'espace d'un établissement en attente (préparation) et administrateur Uny
  const pendingOwner = await userApi(await person("pendingowner", { uni: pending, role: "admin" }), password);
  expect((await pendingOwner.rpc("publish_card_template", args(pending))).status).toBe(200);
  const admin = await userApi(ADMIN.email, ADMIN.password);
  expect((await admin.rpc("publish_card_template", args(target))).status).toBe(200);
  expect(await templates(target)).toEqual([
    { version: 1, is_active: false },
    { version: 2, is_active: true },
  ]);
});

test.afterAll(async () => {
  for (const id of unis) await serviceRest(`universities?id=eq.${id}`, { method: "DELETE" });
  for (const id of users) await serviceRest(`../../auth/v1/admin/users/${id}`, { method: "DELETE" });
});
