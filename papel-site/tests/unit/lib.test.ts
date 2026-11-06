import { test } from "node:test";
import assert from "node:assert/strict";
import { toCsv } from "../../src/lib/csv.ts";
import { slugify } from "../../src/lib/slug.ts";
import { contactSchema, isLikelyBot, leadSchema } from "../../src/lib/validation.ts";
import { telLink, whatsappLink } from "../../src/lib/whatsapp.ts";

test("whatsappLink : numéro absent → null, message contextuel encodé", () => {
  assert.equal(whatsappLink("", "information"), null);
  assert.equal(whatsappLink("12", "information"), null);
  const link = whatsappLink("+224 620 00 00 00", "distributeur");
  assert.ok(link?.startsWith("https://wa.me/224620000000?text="));
  assert.match(decodeURIComponent(link!.split("text=")[1]), /devenir distributeur/);
  assert.match(decodeURIComponent(whatsappLink("224620000000", "devis", "Produit : X.")!), /devis.*Produit : X\./);
});

test("telLink", () => {
  assert.equal(telLink("+224 620 00 00 00"), "tel:+224620000000");
  assert.equal(telLink(""), null);
});

test("slugify gère accents et apostrophes", () => {
  assert.equal(slugify("Papel Doux — Soft Pack"), "papel-doux-soft-pack");
  assert.equal(slugify("L'hygiène à Coyah !"), "l-hygiene-a-coyah");
});

test("toCsv : BOM, séparateur, échappement et neutralisation des formules", () => {
  const csv = toCsv(["a", "b"], [["=SUM(A1)", 'dit "bonjour"; ok']]);
  assert.ok(csv.startsWith("﻿"));
  assert.match(csv, /'=SUM\(A1\)/);
  assert.match(csv, /"dit ""bonjour""; ok"/);
});

test("leadSchema : normalise le téléphone et valide l'activité", () => {
  const ok = leadSchema.safeParse({
    full_name: "Aïssatou Diallo",
    city: "Conakry",
    whatsapp: "+224 620-00-00-00",
    activity_type: "grossiste",
    email: "",
  });
  assert.ok(ok.success);
  assert.equal(ok.data.whatsapp, "+224620000000");
  assert.equal(ok.data.email, undefined);
  assert.deepEqual(ok.data.products_wanted, []);
  assert.equal(ok.data.request_type, "partenariat");
  const bad = leadSchema.safeParse({ full_name: "A", city: "", whatsapp: "abc", activity_type: "pirate" });
  assert.ok(!bad.success);
  const fields = new Set(bad.error.issues.map((i) => i.path[0]));
  for (const f of ["full_name", "city", "whatsapp", "activity_type"]) assert.ok(fields.has(f), f);
});

test("contactSchema : exige un téléphone ou un e-mail", () => {
  const none = contactSchema.safeParse({ full_name: "Jean", subject: "Question", message: "Bonjour, une question." });
  assert.ok(!none.success);
  const withMail = contactSchema.safeParse({
    full_name: "Jean",
    email: "Jean@Exemple.com",
    subject: "Question",
    message: "Bonjour, une question.",
  });
  assert.ok(withMail.success);
  assert.equal(withMail.data.email, "jean@exemple.com");
});

test("isLikelyBot : leurre rempli, envoi trop rapide ou sans interaction", () => {
  const now = 1_000_000;
  assert.equal(isLikelyBot({ website: "http://spam", startedAt: now - 60_000 }, now), true);
  assert.equal(isLikelyBot({ startedAt: now - 1000 }, now), true);
  assert.equal(isLikelyBot({}, now), true);
  assert.equal(isLikelyBot({ website: "", startedAt: now - 30_000 }, now), false);
});
