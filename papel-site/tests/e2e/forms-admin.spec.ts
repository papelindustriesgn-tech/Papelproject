import { expect, test, type Page } from "@playwright/test";

const ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL ?? "admin@papel.local",
  password: process.env.E2E_ADMIN_PASSWORD ?? "AdminPapel2026!",
};
// Identifiant commun à toute l'exécution (le fichier peut être évalué plusieurs fois)
process.env.E2E_STAMP ??= Date.now().toString().slice(-6);
const stamp = process.env.E2E_STAMP;
const leadName = `Mariama Test ${stamp}`;

async function fillLogin(page: Page, email: string, password: string) {
  await page.goto("/admin/connexion");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
}

async function login(page: Page) {
  await fillLogin(page, ADMIN.email, ADMIN.password);
  await expect(page.getByRole("heading", { name: "Tableau de bord" })).toBeVisible();
}

test.describe.configure({ mode: "serial" });

test("formulaire professionnel : erreurs puis envoi réussi", async ({ page }) => {
  await page.goto("/professionnels?demande=devis&produit=Papel%20Doux%20%E2%80%94%20Soft%20Pack#demande");
  await expect(page.getByLabel("Votre demande")).toHaveValue("devis");
  await expect(page.getByRole("checkbox", { name: "Papel Doux — Soft Pack" })).toBeChecked();
  await page.getByLabel("Nom et prénom").click();
  await page.getByRole("button", { name: "Envoyer ma demande" }).click();
  await expect(page.getByText("Indiquez votre nom et prénom")).toBeVisible();
  await expect(page.getByText("Choisissez votre type d'activité")).toBeVisible();

  await page.getByLabel("Nom et prénom").fill(leadName);
  await page.getByLabel("Entreprise").fill("Boutique Test");
  await page.getByLabel("Ville / région").fill("Kindia");
  await page.getByLabel("Téléphone WhatsApp").fill("+224 620 11 22 33");
  await page.getByLabel("Type d'activité").selectOption("grossiste");
  await page.getByLabel("Volume d'achat estimé").selectOption({ index: 2 });
  await page.getByLabel("Message complémentaire").fill("=SOMME(A1) test automatisé");
  await page.waitForTimeout(2600);
  await page.getByRole("button", { name: "Envoyer ma demande" }).click();
  await expect(page.getByText("Merci, votre demande est bien enregistrée.")).toBeVisible();
});

test("formulaire de contact : envoi réussi", async ({ page }) => {
  await page.goto("/contact");
  await page.getByLabel("Nom et prénom").fill(`Contact ${stamp}`);
  await page.getByLabel("Adresse e-mail").fill("contact@example.com");
  await page.getByLabel("Objet").fill("Question produit");
  await page.getByLabel("Message").fill("Bonjour, où trouver vos produits à Labé ?");
  await page.waitForTimeout(2600);
  await page.getByRole("button", { name: "Envoyer le message" }).click();
  await expect(page.getByText("Merci, votre message est bien envoyé.")).toBeVisible();
});

test("administration protégée : redirection sans session, refus d'un compte non admin", async ({ page, request }) => {
  await page.goto("/admin/prospects");
  await expect(page).toHaveURL(/\/admin\/connexion/);
  const csv = await request.get("/admin/prospects/export", { maxRedirects: 0 });
  expect([302, 307, 308]).toContain(csv.status());
  await fillLogin(page, ADMIN.email, "mauvais-mot-de-passe");
  await expect(page.getByText("Identifiants incorrects.")).toBeVisible();
  await fillLogin(page, "lambda@papel.local", "LambdaUser2026!");
  await expect(page.getByText("Ce compte n'a pas accès à l'administration.")).toBeVisible();
  // la session du compte non autorisé est fermée : l'administration reste inaccessible
  await page.goto("/admin/prospects");
  await expect(page).toHaveURL(/\/admin\/connexion/);
});

test("admin : prospect, statut, notes et export CSV", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("heading", { name: "Tableau de bord" })).toBeVisible();
  await page.getByRole("link", { name: "Prospects" }).first().click();
  await page.getByPlaceholder("Nom, entreprise, ville, téléphone…").fill(leadName);
  await page.getByRole("button", { name: "Filtrer" }).click();
  await page.getByRole("link", { name: leadName }).click();
  await expect(page.getByText("+224620112233")).toBeVisible();
  await page.getByLabel("Statut").selectOption("en_discussion");
  await page.getByLabel("Notes internes").fill("Rappeler lundi");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Prospect mis à jour.")).toBeVisible();

  await page.goto("/admin/prospects?statut=en_discussion");
  await expect(page.getByRole("link", { name: leadName })).toBeVisible();
  const download = await page.request.get(`/admin/prospects/export?q=${encodeURIComponent(leadName)}`);
  expect(download.headers()["content-type"]).toContain("text/csv");
  const body = await download.text();
  expect(body).toContain(leadName);
  expect(body).toContain("En discussion");
  expect(body).toContain("'=SOMME"); // injection de formule neutralisée
});

test("admin : messages de contact", async ({ page }) => {
  await login(page);
  await page.goto("/admin/messages");
  await expect(page.getByText(`Contact ${stamp}`)).toBeVisible();
});

test("admin : coordonnées WhatsApp → boutons publics contextuels", async ({ page }) => {
  await login(page);
  await page.goto("/admin/entreprise");
  await page.getByLabel("Numéro WhatsApp").fill("+224 600 00 00 01");
  await page.getByLabel("Page Facebook").fill("http://facebook.com/papel");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("URL https:// attendue")).toBeVisible();
  await page.getByLabel("Page Facebook").fill("");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Informations de l'entreprise enregistrées.")).toBeVisible();

  await page.goto("/professionnels");
  const fab = page.getByRole("link", { name: "Écrire à Papel Industries sur WhatsApp" });
  await expect(fab).toHaveAttribute("href", /wa\.me\/224600000001\?text=.*distributeur/);
  await page.goto("/produits/papel-doux-soft-pack");
  await expect(page.getByRole("link", { name: "Demander par WhatsApp" })).toHaveAttribute("href", /devis.*Soft%20Pack/);
  // événement de clic enregistré (204)
  const ev = await page.request.post("/api/evenement", { data: { type: "whatsapp_click", label: "test", path: "/" } });
  expect(ev.status()).toBe(204);
});

test("admin : modifier un produit et publier une actualité", async ({ page }) => {
  await login(page);
  await page.goto("/admin/produits");
  await page.getByRole("link", { name: "Papel Doux — Soft Pack" }).click();
  await page.getByLabel("Nombre de plis").fill("");
  await page.getByLabel("Accroche (carte produit)").fill(`Accroche mise à jour ${stamp}`);
  await page.getByRole("button", { name: "Enregistrer le produit" }).click();
  await expect(page.getByText("Modifications enregistrées.")).toBeVisible();
  await page.goto("/produits/papel-doux-soft-pack");
  await expect(page.getByText(`Accroche mise à jour ${stamp}`)).toBeVisible();

  await page.goto("/admin/actualites/nouveau");
  await page.getByLabel("Titre", { exact: true }).fill(`Visite de partenaires ${stamp}`);
  await page.getByLabel("Contenu de l'article").fill("Premier paragraphe.\n\n## Intertitre\n\n- point un\n- point deux");
  await page.getByLabel("Catégorie").selectOption("partenariats");
  await page.getByLabel("Statut", { exact: true }).selectOption("published");
  await page.getByRole("button", { name: "Enregistrer l'actualité" }).click();
  await expect(page.getByText("Modifications enregistrées.")).toBeVisible();
  await page.goto("/actualites");
  await page.getByRole("link", { name: new RegExp(`Visite de partenaires ${stamp}`) }).click();
  await expect(page.getByRole("heading", { name: "Intertitre" })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "point deux" })).toBeVisible();
});
