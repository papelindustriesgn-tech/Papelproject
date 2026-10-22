import { expect, test } from "@playwright/test";
import { ADMIN, createAuthUser, serviceRest, userApi } from "./helpers";

/**
 * Vérifications renforcées, testées contre l'API de la base : justificatifs étudiants, confirmation par
 * l'établissement, approbation des établissements, prix étudiant calculé. Données 100 % fictives.
 */
test.describe.configure({ mode: "serial" });

const run = `${Date.now()}`.slice(-7);
const password = "Strict2026x";
const ret = { Prefer: "return=representation" };
const created: { users: string[]; universities: number[]; deals: string[] } = { users: [], universities: [], deals: [] };

async function user(key: string, role = "student", extra: Record<string, unknown> = {}) {
  const email = `strict.${key}.${run}@uny.test`;
  const u = await (
    await createAuthUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: "Test", last_name: `${key}${run}` },
    })
  ).json();
  await serviceRest(`profiles?id=eq.${u.id}`, {
    method: "PATCH",
    body: JSON.stringify({ role, account_status: "approved", ...extra }),
  });
  created.users.push(u.id);
  return { id: u.id as string, email };
}

async function university(status: string) {
  const [u] = await (
    await serviceRest("universities", {
      method: "POST",
      headers: ret,
      body: JSON.stringify({
        name: `Établissement strict ${status} ${run}-${created.universities.length}`,
        country_code: "GN",
        partner_status: status,
        is_active: false,
      }),
    })
  ).json();
  created.universities.push(u.id);
  return u.id as number;
}

async function verificationRow(userId: string, sha: string) {
  const [v] = await (
    await serviceRest("student_verifications", {
      method: "POST",
      headers: ret,
      body: JSON.stringify({
        user_id: userId,
        document_type: "student_card",
        document_path: `${userId}/doc.jpg`,
        file_sha256: sha,
      }),
    })
  ).json();
  return v.id as string;
}

const ALL_CHECKS = { identity: true, institution: true, academic_year: true, authentic: true };
let year: string;

test.beforeAll(async () => {
  const admin = await userApi(ADMIN.email, ADMIN.password);
  year = await (await admin.rpc("current_academic_year", {})).json();
});

test("justificatif : contrôles, matricule, année, doublons et établissement partenaire", async () => {
  const admin = await userApi(ADMIN.email, ADMIN.password);
  const sha = "a".repeat(56) + run.padStart(8, "0");
  const s1 = await user("doc1");
  const s2 = await user("doc2");
  const v1 = await verificationRow(s1.id, sha);
  const review = (id: string, extra: Record<string, unknown>) =>
    admin.rpc("review_verification", { p_verification_id: id, p_approve: true, ...extra });

  // Sans contrôles, sans matricule, mauvaise année : refusé
  expect((await (await review(v1, {})).json()).message).toContain("4 contrôles");
  expect((await (await review(v1, { p_checks: ALL_CHECKS })).json()).message).toContain("matricule");
  expect(
    (await (await review(v1, { p_checks: ALL_CHECKS, p_student_number: "M1", p_academic_year: "2019-2020" })).json()).message,
  ).toContain("année académique en cours");
  // Complet : validé
  const ok = await review(v1, { p_checks: ALL_CHECKS, p_student_number: `MAT-${run}`, p_academic_year: year });
  expect(ok.status).toBe(200);
  const [p1] = await (await serviceRest(`profiles?id=eq.${s1.id}&select=verification_status`)).json();
  expect(p1.verification_status).toBe("verified");

  // Même fichier envoyé par un autre compte : refusé
  const v2 = await verificationRow(s2.id, sha);
  const dup = await review(v2, { p_checks: ALL_CHECKS, p_student_number: `AUTRE-${run}`, p_academic_year: year });
  expect((await dup.json()).message).toContain("déjà été envoyé par un autre compte");
  // Même matricule pour un autre compte (autre fichier) : refusé
  await serviceRest(`student_verifications?id=eq.${v2}`, {
    method: "PATCH",
    body: JSON.stringify({ file_sha256: "b".repeat(56) + run.padStart(8, "0") }),
  });
  const dupNum = await review(v2, { p_checks: ALL_CHECKS, p_student_number: `mat ${run}`, p_academic_year: year });
  expect((await dupNum.json()).message).toContain("matricule est déjà vérifié");

  // Étudiant d'un établissement partenaire (avec portail) : confirmation par l'établissement uniquement
  const partner = await university("partner");
  const staff = await user("staff", "university");
  await serviceRest("university_members", {
    method: "POST",
    body: JSON.stringify({ university_id: partner, user_id: staff.id, role: "admin" }),
  });
  const s3 = await user("doc3", "student", { university_id: partner });
  const v3 = await verificationRow(s3.id, "c".repeat(56) + run.padStart(8, "0"));
  const viaDoc = await review(v3, { p_checks: ALL_CHECKS, p_student_number: `P-${run}`, p_academic_year: year });
  expect((await viaDoc.json()).message).toContain("confirmée par l'établissement");

  // Plus de « validation manuelle du statut » sans preuve
  const direct = await admin.rpc("admin_set_verification", { p_user_id: s3.id, p_status: "verified" });
  expect((await direct.json()).message).toContain("justificatif contrôlé");
});

test("établissement : confirmation manuelle = référence du registre + 4 critères", async () => {
  const uni = await university("partner");
  const validator = await user("valid", "university");
  await serviceRest("university_members", {
    method: "POST",
    body: JSON.stringify({ university_id: uni, user_id: validator.id, role: "validator" }),
  });
  const st = await user("etu");
  const [e] = await (
    await serviceRest("student_enrollments", {
      method: "POST",
      headers: ret,
      body: JSON.stringify({
        user_id: st.id,
        university_id: uni,
        academic_year: year,
        student_number: `REG${run}`,
        claimed_first_name: "Fatou",
        claimed_last_name: "Fictive",
        status: "pending",
      }),
    })
  ).json();
  const api = await userApi(validator.email, password);
  const confirm = (extra: Record<string, unknown>) =>
    api.rpc("set_enrollment_status", { p_enrollment: e.id, p_status: "verified", ...extra });

  expect((await (await confirm({})).json()).message).toContain("référence du registre");
  expect((await (await confirm({ p_source_ref: "Dossier 2026/123" })).json()).message).toContain("Cochez les 4 informations");
  const ok = await confirm({
    p_source_ref: "Dossier 2026/123",
    p_details: { checked: { student_number: true, last_name: true, first_name: true, birth_date: true } },
  });
  expect(ok.status).toBe(200);
  const [after] = await (await serviceRest(`student_enrollments?id=eq.${e.id}&select=status,source_ref,match_details`)).json();
  expect(after.status).toBe("verified");
  expect(after.source_ref).toBe("Dossier 2026/123");
  await serviceRest(`student_enrollments?id=eq.${e.id}`, { method: "DELETE" });
});

test("approbation d'un établissement : dossier complet et contrôles obligatoires, aucune autre voie", async () => {
  const uni = await university("pending");
  const owner = await user("owner", "university");
  await serviceRest("university_members", {
    method: "POST",
    body: JSON.stringify({ university_id: uni, user_id: owner.id, role: "admin" }),
  });
  const admin = await userApi(ADMIN.email, ADMIN.password);
  const establishment = await userApi(owner.email, password);

  // Passage direct en « partenaire » par l'application : refusé (admin comme établissement)
  await admin.patch(`universities?id=eq.${uni}`, { partner_status: "partner" });
  await establishment.patch(`universities?id=eq.${uni}`, { partner_status: "partner" });
  let [u] = await (await serviceRest(`universities?id=eq.${uni}&select=partner_status`)).json();
  expect(u.partner_status).toBe("pending");

  const approve = (extra: Record<string, unknown> = {}) =>
    admin.rpc("approve_university", {
      p_university: uni,
      p_accreditation_source: "Liste officielle (test)",
      p_callback_phone: "+224 621 11 11 11",
      p_callback_source: "Annuaire officiel (test)",
      p_callback_person: "Secrétariat (test)",
      p_mandate_checked: true,
      ...extra,
    });
  // Sans dossier : refusé
  expect((await (await approve()).json()).message).toContain("Dossier incomplet");

  // L'établissement dépose son dossier ; il ne peut pas s'approuver lui-même
  const sub = await establishment.rpc("university_submit_vetting", {
    p_university: uni,
    p_legal_name: "Établissement fictif de test",
    p_accreditation_ref: `Arrêté ${run}`,
    p_accreditation_date: null,
    p_signatory_name: "Directeur Fictif",
    p_signatory_title: "Directeur général",
    p_official_phone: "+224 620 00 00 00",
    p_official_email: null,
    p_document_path: `universities/${uni}/lettre.pdf`,
  });
  expect(sub.status).toBeLessThan(300);
  expect(
    (
      await establishment.rpc("approve_university", {
        p_university: uni,
        p_accreditation_source: "x",
        p_callback_phone: "x",
        p_callback_source: "x",
        p_callback_person: "x",
        p_mandate_checked: true,
      })
    ).status,
  ).toBe(403);
  // Chemin de document d'un autre établissement : refusé
  const other = await establishment.rpc("university_submit_vetting", {
    p_university: uni,
    p_legal_name: "X fictif",
    p_accreditation_ref: "A123",
    p_accreditation_date: null,
    p_signatory_name: "Nom Fictif",
    p_signatory_title: "DG",
    p_official_phone: "+224620000000",
    p_official_email: null,
    p_document_path: "universities/999999/lettre.pdf",
  });
  expect(other.status).toBeGreaterThanOrEqual(400);

  // Contrôles incomplets : refusés
  expect((await (await approve({ p_callback_phone: "" })).json()).message).toContain("Rappel obligatoire");
  expect((await (await approve({ p_mandate_checked: false })).json()).message).toContain("signataire est habilité");
  // Complet : approuvé et journalisé
  expect([200, 204]).toContain((await approve()).status);
  [u] = await (await serviceRest(`universities?id=eq.${uni}&select=partner_status`)).json();
  expect(u.partner_status).toBe("partner");
  const audit = await (
    await serviceRest(`audit_log?university_id=eq.${uni}&action=eq.university.approved&select=details`)
  ).json();
  expect(audit[0].details.callback_source).toBe("Annuaire officiel (test)");
});

test("prix étudiant : calculé par la base à partir du prix normal et de la réduction", async () => {
  const [partner] = await (
    await serviceRest("partners", {
      method: "POST",
      headers: ret,
      body: JSON.stringify({ name: `Prix fictif ${run}`, category: "restauration" }),
    })
  ).json();
  const mk = async (body: Record<string, unknown>) =>
    serviceRest("deals", {
      method: "POST",
      headers: ret,
      body: JSON.stringify({
        partner_id: partner.id,
        title: `Offre prix ${run}`,
        discount_label: "libre",
        category: "restauration",
        ...body,
      }),
    });
  const [pct] = await (await mk({ price_gnf: 25000, discount_kind: "percent", discount_value: 15, promo_price_gnf: 1 })).json();
  expect(pct.promo_price_gnf).toBe(21200); // 21 250 arrondi à la centaine inférieure
  expect(pct.discount_label).toBe("-15 %");
  const [amt] = await (await mk({ price_gnf: 50000, discount_kind: "amount", discount_value: 7500 })).json();
  expect(amt.promo_price_gnf).toBe(42500);
  expect(amt.discount_label).toBe("-7 500 GNF");
  // Réduction supérieure au prix, réduction sans prix, offre ouverte aux non-vérifiés : refusées
  expect((await mk({ price_gnf: 5000, discount_kind: "amount", discount_value: 6000 })).status).toBeGreaterThanOrEqual(400);
  expect((await mk({ discount_kind: "percent", discount_value: 10 })).status).toBeGreaterThanOrEqual(400);
  expect((await mk({ requires_verification: false })).status).toBeGreaterThanOrEqual(400);
  await serviceRest(`partners?id=eq.${partner.id}`, { method: "DELETE" });
});

test.afterAll(async () => {
  for (const id of created.universities) {
    await serviceRest(`student_enrollments?university_id=eq.${id}`, { method: "DELETE" });
    await serviceRest(`universities?id=eq.${id}`, { method: "DELETE" });
  }
  for (const id of created.users) await serviceRest(`../../auth/v1/admin/users/${id}`, { method: "DELETE" });
});
