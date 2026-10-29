import { expect, test } from "@playwright/test";
import { login, logout, serviceRest, signUp, userApi } from "./helpers";

/** Démos de la vitrine : exclusivités et offres à distance fictives, marquées « Démo », sans aucun contact réel. */
test("démos : exclusivités et offres à distance visibles, jamais de contact ni de commande", async ({ page }) => {
  test.setTimeout(120_000);
  const [demo] = await (
    await serviceRest("deals?is_demo=eq.true&channel=eq.online&title=eq.Livraison%20de%20repas%20%C3%A0%20-25%20%25&select=id")
  ).json();
  expect(demo?.id).toBeTruthy();
  expect(await (await serviceRest(`deal_online_access?deal_id=eq.${demo.id}`)).json()).toEqual([]);

  // Étudiant vérifié (données fictives)
  const student = await signUp(page);
  await page.goto("/carte");
  const unyId = (await page.locator("body").textContent())!.match(/UNY-GN-\d{4}-[0-9A-Z]{6}/)![0];
  await serviceRest(`profiles?uny_id=eq.${unyId}`, { method: "PATCH", body: JSON.stringify({ verification_status: "verified" }) });

  // La base refuse d'ouvrir une offre de démonstration
  const api = await userApi(student.email, student.password);
  const res = await api.rpc("open_online_offer", { p_deal: demo.id });
  expect(res.ok).toBeFalsy();
  expect((await res.json()).message).toContain("démonstration");

  // Vitrine : exclusivités et offres à distance de démonstration, badge « Démo »
  await page.goto("/avantages?ville=toutes");
  await expect(page.getByTestId("rail-exclusives").getByText("Démo").first()).toBeVisible();
  await expect(page.getByTestId("rail-online").getByText("Livraison de repas à -25 %")).toBeVisible();

  // Fiche : explication, aucun bouton de commande
  await page.goto(`/avantages/${demo.id}`);
  await expect(page.getByTestId("online-panel-demo")).toBeVisible();
  await expect(page.getByRole("button", { name: "Obtenir mon code et le contact" })).toHaveCount(0);
  await logout(page);
  expect(await (await serviceRest(`deal_clicks?deal_id=eq.${demo.id}`)).json()).toEqual([]);
  await login(page, student.email, student.password);
  await logout(page);
});
