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

test("support : transfert, file de l'équipe, réponse notifiée au bon utilisateur, sans doublon ni perte", async ({ page }) => {
  const { execSync } = await import("node:child_process");
  const sql = (q: string) => {
    // Base locale uniquement (garde-fou des tests) : simulation d'une panne de notification
    execSync(`psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -q -c "${q}"`);
  };
  const aEmail = await person("supporta");
  const bEmail = await person("supportb");
  const [a] = await (await serviceRest(`profiles?email=eq.${encodeURIComponent(aEmail)}&select=id`)).json();
  const [b] = await (await serviceRest(`profiles?email=eq.${encodeURIComponent(bEmail)}&select=id`)).json();

  // A demande un humain depuis Aide
  await page.goto("/connexion");
  await page.fill("#identifier", aEmail);
  await page.fill("#password", password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(/\/accueil/);
  await page.goto("/aide");
  await page.getByRole("button", { name: "Parler à une personne de l'équipe" }).click();
  await expect(page.getByTestId("support-status")).toContainText("entre les mains de l'équipe Uny");
  await expect(page.getByText(/dans tes notifications/).first()).toBeVisible();
  await expect(page.getByText(/email/)).toHaveCount(0);
  // Un message après transfert n'obtient aucune réponse automatique
  await page.getByLabel("Écrire à l'équipe Uny").fill("Précision : ma carte affiche une erreur");
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.getByText("Précision : ma carte affiche une erreur")).toBeVisible();
  const [conv] = await (await serviceRest(`ai_conversations?user_id=eq.${a.id}&select=id,status`)).json();
  expect(conv.status).toBe("handed_off");
  const msgs = await (await serviceRest(`ai_messages?conversation_id=eq.${conv.id}&select=role`)).json();
  expect(msgs.filter((m: { role: string }) => m.role === "assistant")).toHaveLength(0);

  // B ne voit pas la conversation de A et ne peut pas répondre
  const apiB = await userApi(bEmail, password);
  expect(await apiB.select(`ai_messages?conversation_id=eq.${conv.id}&select=id`)).toEqual([]);
  expect((await apiB.rpc("support_answer", { p_conversation: conv.id, p_answer: "x", p_request_id: crypto.randomUUID() })).status).toBe(403);

  // L'équipe répond : notification à A seulement ; une nouvelle tentative ne crée pas de doublon
  const admin = await userApi(ADMIN.email, ADMIN.password);
  const req = crypto.randomUUID();
  const first = await (await admin.rpc("support_answer", { p_conversation: conv.id, p_answer: "Bonjour, nous corrigeons ta carte.", p_request_id: req })).json();
  expect(first).toMatchObject({ duplicate: false, notified: true });
  const again = await (await admin.rpc("support_answer", { p_conversation: conv.id, p_answer: "Bonjour, nous corrigeons ta carte.", p_request_id: req })).json();
  expect(again.duplicate).toBe(true);
  const notifA = await (await serviceRest(`notifications?user_id=eq.${a.id}&type=eq.support_reply&select=link`)).json();
  expect(notifA).toEqual([{ link: "/aide" }]);
  expect(await (await serviceRest(`notifications?user_id=eq.${b.id}&type=eq.support_reply&select=id`)).json()).toEqual([]);
  expect((await (await serviceRest(`ai_messages?conversation_id=eq.${conv.id}&role=eq.staff&select=id`)).json()).length).toBe(1);
  await page.goto("/aide");
  await expect(page.getByText("Bonjour, nous corrigeons ta carte.")).toBeVisible();
  await expect(page.getByTestId("support-status")).toContainText("t'a répondu");

  // Panne de notification : la réponse est conservée, la notification est renvoyée ensuite
  await page.getByLabel("Écrire à l'équipe Uny").fill("Merci, et pour mon code promo ?");
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.getByTestId("support-status")).toContainText("entre les mains");
  sql("alter table public.notifications add constraint test_panne check (type <> 'support_reply') not valid");
  try {
    const failed = await (await admin.rpc("support_answer", { p_conversation: conv.id, p_answer: "Ton code est réactivé.", p_request_id: crypto.randomUUID() })).json();
    expect(failed).toMatchObject({ duplicate: false, notified: false });
  } finally {
    sql("alter table public.notifications drop constraint test_panne");
  }
  const [state] = await (await serviceRest(`ai_conversations?id=eq.${conv.id}&select=status,notify_error`)).json();
  expect(state.status).toBe("answered");
  expect(state.notify_error).toBeTruthy();
  expect((await (await serviceRest(`ai_messages?conversation_id=eq.${conv.id}&role=eq.staff&select=id`)).json()).length).toBe(2);
  expect(await (await admin.rpc("support_retry_notification", { p_conversation: conv.id })).json()).toBe(true);
  expect(await (await admin.rpc("support_retry_notification", { p_conversation: conv.id })).json()).toBe(true);
  expect((await (await serviceRest(`notifications?user_id=eq.${a.id}&type=eq.support_reply&select=id`)).json()).length).toBe(2);
});
