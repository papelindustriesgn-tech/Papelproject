import { execSync } from "node:child_process";
import { createServer, type Server } from "node:http";
import { expect, test, type Page } from "@playwright/test";
import { ADMIN, serviceRest, signUp, userApi } from "./helpers";

/**
 * Contrôle des coûts IA avec un fournisseur SIMULÉ (http://127.0.0.1:4010 ; application lancée avec
 * ANTHROPIC_BASE_URL vers ce bouchon et AI_TIMEOUT_MS=3000). Aucun appel payant, base locale uniquement.
 */
test.describe.configure({ mode: "serial" });

let stub: Server;
let mode: "ok" | "slow" | "error" | "other-model" = "ok";
const bodies: string[] = [];
const sql = (q: string) => execSync(`psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -q -c "${q}"`);

test.beforeAll(async () => {
  stub = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", async () => {
      bodies.push(body);
      if (mode === "slow") await new Promise((r) => setTimeout(r, 5000));
      if (mode === "error") {
        res.writeHead(529, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ type: "error", error: { type: "overloaded_error", message: "Overloaded" } }));
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          id: "msg_stub",
          type: "message",
          role: "assistant",
          model: mode === "other-model" ? "claude-fable-5-1" : "claude-opus-5-5",
          content: [{ type: "text", text: "Réponse simulée." }],
          stop_reason: "end_turn",
          stop_sequence: null,
          // Usage « réaliste haut » : autant de jetons que de caractères envoyés
          usage: { input_tokens: body.length, output_tokens: 300 },
        }),
      );
    });
  });
  await new Promise<void>((r) => stub.listen(4010, "127.0.0.1", r));
  await serviceRest("platform_settings?key=eq.ai", { method: "PATCH", body: JSON.stringify({ value: { enabled: true, monthly_budget_usd: 1000 } }) });
  await serviceRest("ai_agents?id=eq.support", {
    method: "PATCH",
    body: JSON.stringify({ enabled: true, monthly_budget_usd: 100, max_runs_per_user_day: 50, max_runs_per_day: 500 }),
  });
});

test.afterAll(async () => {
  mode = "ok";
  stub.closeAllConnections();
  await new Promise<void>((r) => stub.close(() => r()));
  await serviceRest("ai_agents?id=eq.support", { method: "PATCH", body: JSON.stringify({ enabled: false, monthly_budget_usd: 0 }) });
  await serviceRest("platform_settings?key=eq.ai", { method: "PATCH", body: JSON.stringify({ value: { enabled: false, monthly_budget_usd: 0 } }) });
});

async function ask(page: Page, text: string) {
  await page.goto("/aide");
  const before = await page.getByTestId("msg-assistant").count();
  await page.getByLabel("Ta question").fill(text);
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.getByTestId("msg-assistant")).toHaveCount(before + 1, { timeout: 20_000 });
}
const lastRun = async () =>
  (await (await serviceRest("ai_runs?agent_id=eq.support&order=created_at.desc&limit=1&select=id,status,estimated_cost_usd,cost_usd,model,error")).json())[0];

test("réservation au coût maximal, sans modèle de remplacement ni relance ; entrée difficile à estimer couverte", async ({ page }) => {
  await signUp(page);
  bodies.length = 0;
  await ask(page, "😀🎓📚 ".repeat(150) + "عربي 中文"); // emojis et écritures non latines
  expect(bodies).toHaveLength(1); // aucune relance
  const sent = JSON.parse(bodies[0]);
  expect(sent.fallbacks).toBeUndefined();
  expect(sent.model).toBe("claude-opus-5-5");
  const run = await lastRun();
  expect(run.status).toBe("succeeded");
  expect(Number(run.cost_usd)).toBeGreaterThan(0);
  expect(Number(run.estimated_cost_usd)).toBeGreaterThanOrEqual(Number(run.cost_usd));
});

test("modèle inattendu dans la réponse → à rapprocher, coût maximal conservé", async ({ page }) => {
  await signUp(page);
  mode = "other-model";
  await ask(page, "Comment vérifier mon statut étudiant ?");
  mode = "ok";
  const run = await lastRun();
  expect(run.status).toBe("to_reconcile");
  expect(run.cost_usd).toBeNull();
  expect(run.error).toContain("Modèle inattendu");
});

test("délai dépassé → à rapprocher ; erreur renvoyée par le fournisseur → échec à coût nul", async ({ page }) => {
  await signUp(page);
  mode = "slow";
  await ask(page, "Comment utiliser un code promo ?");
  let run = await lastRun();
  expect(run.status).toBe("to_reconcile");
  expect(run.cost_usd).toBeNull();
  mode = "error";
  await ask(page, "Comment utiliser un code promo ?");
  mode = "ok";
  run = await lastRun();
  expect(run.status).toBe("failed");
  expect(Number(run.cost_usd)).toBe(0);
});

test("échec d'enregistrement du coût : rien n'est libéré, reprise contrôlée sans double comptage", async ({ page }) => {
  await signUp(page);
  sql("revoke execute on function public.ai_close(uuid, text, text, integer, integer, numeric, text) from service_role");
  try {
    await ask(page, "Comment supprimer mon compte ?");
  } finally {
    sql("grant execute on function public.ai_close(uuid, text, text, integer, integer, numeric, text) to service_role");
  }
  let run = await lastRun();
  expect(run.status).toBe("running"); // coût maximal toujours réservé
  await serviceRest("rpc/ai_mark_stale", { method: "POST", body: JSON.stringify({ p_minutes: 0 }) });
  run = await lastRun();
  expect(run.status).toBe("to_reconcile");
  // Une clôture tardive ne recompte rien
  const late = await (
    await serviceRest("rpc/ai_close", {
      method: "POST",
      body: JSON.stringify({ p_run: run.id, p_outcome: "succeeded", p_model: "claude-opus-5-5", p_input: 1, p_output: 1, p_cost: 0.01 }),
    })
  ).json();
  expect(late).toBe(false);
  // Rapprochement par l'administrateur (source obligatoire), une seule fois
  const admin = await userApi(ADMIN.email, ADMIN.password);
  expect((await (await admin.rpc("ai_reconcile", { p_run: run.id, p_cost: 0.012, p_note: "" })).json()).message).toContain("source");
  expect([200, 204]).toContain((await admin.rpc("ai_reconcile", { p_run: run.id, p_cost: 0.012, p_note: "Console fournisseur (test)" })).status);
  expect((await admin.rpc("ai_reconcile", { p_run: run.id, p_cost: 0.5, p_note: "Doublon" })).status).toBeGreaterThanOrEqual(400);
  run = await lastRun();
  expect(run).toMatchObject({ status: "succeeded", cost_usd: 0.012 });

  // Tableau de bord : les quatre montants sont distingués
  await page.context().clearCookies();
  await page.goto("/connexion");
  await page.fill("#identifier", ADMIN.email);
  await page.fill("#password", ADMIN.password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(/\/(accueil|admin)/);
  await page.goto("/admin/ia");
  for (const label of ["Coût estimé (mois)", "Réservé (en cours)", "Coût enregistré (mois)", "À rapprocher"])
    await expect(page.getByTestId("ai-costs")).toContainText(label);
});
