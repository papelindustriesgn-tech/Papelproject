import { expect, test } from "@playwright/test";
import { createAuthUser, serviceRest, userApi } from "./helpers";

/**
 * Cloisonnement des établissements, testé directement contre l'API de la base (pas seulement l'interface) :
 * extérieur, établissement en attente, établissement approuvé, membre d'un autre établissement, rôles.
 * Données 100 % fictives.
 */
test.describe.configure({ mode: "serial" });

const run = `${Date.now()}`.slice(-7);
const ret = { Prefer: "return=representation" };
const password = "Isolation2026x";
let approved: number;
let other: number;
let pendingUni: number;
let enrollmentId: string;
const users: Record<string, { email: string; id: string }> = {};

async function makeUser(key: string, role = "university") {
  const email = `iso.${key}.${run}@uny.test`;
  const res = await createAuthUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: "Test", last_name: `${key}${run}` },
  });
  const created = await res.json();
  await serviceRest(`profiles?id=eq.${created.id}`, {
    method: "PATCH",
    body: JSON.stringify({ role, account_status: "approved" }),
  });
  users[key] = { email, id: created.id };
}

async function makeUniversity(name: string, status: string) {
  const [u] = await (
    await serviceRest("universities", {
      method: "POST",
      headers: ret,
      body: JSON.stringify({ name: `${name} ${run}`, country_code: "GN", partner_status: status, is_active: false }),
    })
  ).json();
  return u.id as number;
}

test.beforeAll(async () => {
  approved = await makeUniversity("Université Fictive Approuvée", "partner");
  other = await makeUniversity("Institut Fictif Voisin", "partner");
  pendingUni = await makeUniversity("École Fictive En Attente", "pending");
  for (const k of ["outsider", "pendingAdmin", "admin", "validator", "viewer", "announcer", "otherAdmin"]) await makeUser(k);
  await makeUser("student", "student");
  const members = [
    { university_id: pendingUni, user_id: users.pendingAdmin.id, role: "admin" },
    { university_id: approved, user_id: users.admin.id, role: "admin" },
    { university_id: approved, user_id: users.validator.id, role: "validator" },
    { university_id: approved, user_id: users.viewer.id, role: "viewer" },
    { university_id: approved, user_id: users.announcer.id, role: "announcer" },
    { university_id: other, user_id: users.otherAdmin.id, role: "admin" },
  ];
  expect((await serviceRest("university_members", { method: "POST", body: JSON.stringify(members) })).ok).toBeTruthy();
  // Une demande d'inscription chez l'établissement approuvé, et une chez l'établissement en attente
  const [e] = await (
    await serviceRest("student_enrollments", {
      method: "POST",
      headers: ret,
      body: JSON.stringify({
        user_id: users.student.id,
        university_id: approved,
        academic_year: "2026-2027",
        student_number: `MAT${run}`,
        claimed_first_name: "Aïcha",
        claimed_last_name: "Fictive",
        status: "pending",
      }),
    })
  ).json();
  enrollmentId = e.id;
  await serviceRest("student_enrollments", {
    method: "POST",
    body: JSON.stringify({
      user_id: users.student.id,
      university_id: pendingUni,
      academic_year: "2025-2026",
      student_number: `OLD${run}`,
      claimed_first_name: "Aïcha",
      claimed_last_name: "Fictive",
      status: "pending",
    }),
  });
});

const listOf = async (key: string, uni: number) => {
  const api = await userApi(users[key].email, password);
  return api.rpc("university_enrollments", { p_university: uni });
};

test("utilisateur extérieur : aucune inscription, aucune liste, aucun historique", async () => {
  const api = await userApi(users.outsider.email, password);
  expect((await api.rpc("university_enrollments", { p_university: approved })).status).toBe(403);
  expect(await api.select(`student_enrollments?university_id=eq.${approved}&select=id`)).toEqual([]);
  expect(await api.select(`audit_log?university_id=eq.${approved}&select=id`)).toEqual([]);
  expect((await api.rpc("set_enrollment_status", { p_enrollment: enrollmentId, p_status: "verified" })).status).toBe(403);
});

test("établissement en attente : prépare son espace mais ne voit aucun dossier", async () => {
  const api = await userApi(users.pendingAdmin.email, password);
  expect((await api.rpc("university_enrollments", { p_university: pendingUni })).status).toBe(403);
  expect(await api.select(`student_enrollments?university_id=eq.${pendingUni}&select=id`)).toEqual([]);
  expect(await api.select(`audit_log?university_id=eq.${pendingUni}&select=id`)).toEqual([]);
  const declared = await api.rpc("university_declared_students", { p_university: pendingUni });
  expect(await declared.json()).toEqual([]);
  // Totaux sans nom : autorisés
  expect((await api.rpc("university_declared_count", { p_university: pendingUni })).status).toBe(200);
  // Préparation de l'espace : fiche et carte
  const patch = await api.patch(`universities?id=eq.${pendingUni}`, { website: "https://ecole-fictive.example" });
  expect(patch.status).toBeLessThan(300);
  const card = await api.rpc("publish_card_template", { p_university: pendingUni, p_layout: "classic", p_fields: [] });
  expect(card.status).toBe(200);
  // Aucune décision, aucune annonce
  const [pe] = await (await serviceRest(`student_enrollments?university_id=eq.${pendingUni}&select=id`)).json();
  const decide = await api.rpc("set_enrollment_status", { p_enrollment: pe.id, p_status: "verified" });
  expect(decide.status).toBe(400);
  expect((await decide.json()).message).toContain("approuvé");
  const ann = await api.rpc("university_send_announcement", {
    p_university: pendingUni,
    p_title: "Test",
    p_body: "Message fictif",
    p_audience: "all",
  });
  expect(ann.status).toBe(400);
});

test("établissement approuvé : voit ses dossiers ; un autre établissement ne les voit pas", async () => {
  const mine = await listOf("admin", approved);
  expect(mine.status).toBe(200);
  expect((await mine.json()).map((r: { id: string }) => r.id)).toContain(enrollmentId);

  const api = await userApi(users.otherAdmin.email, password);
  expect((await api.rpc("university_enrollments", { p_university: approved })).status).toBe(403);
  expect(await api.select(`student_enrollments?university_id=eq.${approved}&select=id`)).toEqual([]);
  expect(await api.select(`audit_log?university_id=eq.${approved}&select=id`)).toEqual([]);
  expect((await api.rpc("set_enrollment_status", { p_enrollment: enrollmentId, p_status: "verified" })).status).toBe(403);
  expect((await (await api.rpc("university_declared_students", { p_university: approved })).json()).length).toBe(0);
});

test("rôles : consultation, validation, annonces", async () => {
  // Consultation : lit, ne décide pas
  expect((await listOf("viewer", approved)).status).toBe(200);
  const viewer = await userApi(users.viewer.email, password);
  expect((await viewer.rpc("set_enrollment_status", { p_enrollment: enrollmentId, p_status: "verified" })).status).toBe(403);
  // Annonces : pas d'accès aux dossiers
  expect((await listOf("announcer", approved)).status).toBe(403);
  const announcer = await userApi(users.announcer.email, password);
  expect(await announcer.select(`student_enrollments?university_id=eq.${approved}&select=id`)).toEqual([]);
  // Validation : demande un complément (motif obligatoire), puis l'historique garde le responsable et le motif
  const validator = await userApi(users.validator.email, password);
  const noReason = await validator.rpc("set_enrollment_status", { p_enrollment: enrollmentId, p_status: "incomplete" });
  expect(noReason.status).toBe(400);
  const ok = await validator.rpc("set_enrollment_status", {
    p_enrollment: enrollmentId,
    p_status: "incomplete",
    p_reason: "Matricule incomplet",
  });
  expect(ok.status).toBe(200);
  const audit = await validator.select(
    `audit_log?university_id=eq.${approved}&action=eq.enrollment.incomplete&select=actor_id,details`,
  );
  expect(audit[0].actor_id).toBe(users.validator.id);
  expect(audit[0].details.reason).toBe("Matricule incomplet");
  // L'administrateur de l'établissement ne peut pas modifier un autre établissement
  const admin = await userApi(users.admin.email, password);
  await admin.patch(`universities?id=eq.${other}`, { website: "https://pirate.example" });
  const [o] = await (await serviceRest(`universities?id=eq.${other}&select=website`)).json();
  expect(o.website).toBeNull();
});

test.afterAll(async () => {
  for (const id of [approved, other, pendingUni]) {
    await serviceRest(`student_enrollments?university_id=eq.${id}`, { method: "DELETE" });
    await serviceRest(`universities?id=eq.${id}`, { method: "DELETE" });
  }
  for (const u of Object.values(users)) await serviceRest(`../../auth/v1/admin/users/${u.id}`, { method: "DELETE" });
});
