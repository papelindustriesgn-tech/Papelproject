import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { CONNECTORS } from "@/lib/verification/connectors";
import { hasMatchSecret, matchHash } from "@/lib/verification/hash";
import { decide, normalizeDate, normalizeName, normalizeNumber, type MatchCriteria } from "@/lib/verification/normalize";

/**
 * Moteur de vérification Uny. Pour une demande d'inscription, essaie dans l'ordre :
 *   1. l'API officielle de l'université (si un connecteur est actif, avec accord signé) ;
 *   2. la dernière liste importée par l'université (empreintes HMAC) ;
 *   3. à défaut, la demande reste « en attente » dans le portail de l'université.
 * Une correspondance partielle n'est jamais validée automatiquement : elle passe « à examiner ».
 */

type Admin = ReturnType<typeof createAdminClient>;
type Enrollment = {
  id: string;
  user_id: string;
  university_id: number;
  academic_year: string;
  student_number: string;
  claimed_first_name: string;
  claimed_last_name: string;
  claimed_birth_date: string | null;
  faculty: string | null;
  department: string | null;
  program: string | null;
  study_level: string | null;
  status: string;
};

export type EngineOutcome = { status: "verified" | "manual_review" | "pending"; method: "api" | "import" | null };

async function apply(
  admin: Admin,
  e: Enrollment,
  status: "verified" | "manual_review",
  method: "api" | "import",
  criteria: MatchCriteria,
  academic: { faculty?: string; department?: string; program?: string; study_level?: string },
  sourceRef: string | null,
) {
  // Les informations académiques de la source complètent (sans écraser) celles saisies par l'étudiant
  if (status === "verified") {
    const fill: Partial<Record<"faculty" | "department" | "program" | "study_level", string>> = {};
    for (const k of ["faculty", "department", "program", "study_level"] as const) {
      if (!e[k] && academic[k]) fill[k] = academic[k]!;
    }
    if (Object.keys(fill).length) await admin.from("student_enrollments").update(fill).eq("id", e.id);
  }
  const { error } = await admin.rpc("set_enrollment_status", {
    p_enrollment: e.id,
    p_status: status,
    p_method: method,
    p_details: { ...criteria, source: method },
    p_source_ref: sourceRef ?? undefined,
  });
  if (error) {
    // Matricule déjà validé pour un autre compte : examen humain obligatoire
    await admin.rpc("set_enrollment_status", {
      p_enrollment: e.id,
      p_status: "manual_review",
      p_method: method,
      p_details: { ...criteria, source: method, conflict: true },
    });
    return "manual_review" as const;
  }
  return status;
}

async function tryApi(admin: Admin, e: Enrollment): Promise<EngineOutcome | null> {
  const { data: cfg } = await admin
    .from("university_integrations")
    .select("*")
    .eq("university_id", e.university_id)
    .eq("status", "active")
    .maybeSingle();
  if (!cfg) return null;
  const connector = CONNECTORS[cfg.provider];
  const started = Date.now();
  const r = await connector.verify(cfg, {
    studentNumber: e.student_number,
    lastName: e.claimed_last_name,
    firstName: e.claimed_first_name,
    birthDate: e.claimed_birth_date,
    academicYear: e.academic_year,
  });
  await Promise.all([
    admin.from("university_integrations").update({ last_call_at: new Date().toISOString() }).eq("university_id", e.university_id),
    admin.from("audit_log").insert({
      university_id: e.university_id,
      subject_id: e.user_id,
      action: "connector.verify",
      details: {
        provider: cfg.provider,
        ms: Date.now() - started,
        outcome: r.kind === "error" ? "error" : r.found ? (r.enrolled ? "enrolled" : "not_enrolled") : "not_found",
        ...(r.kind === "error" ? { message: r.message } : {}),
      },
    }),
  ]);
  if (r.kind === "error" || !r.found) return null; // la liste importée ou le portail prennent le relais
  const status = r.enrolled ? decide(r.criteria) : "manual_review";
  return { status: await apply(admin, e, status, "api", r.criteria, r.academic, r.reference), method: "api" };
}

async function tryRoster(admin: Admin, e: Enrollment): Promise<EngineOutcome | null> {
  if (!hasMatchSecret()) return null;
  const { data: entries } = await admin
    .from("university_roster_entries")
    .select("id, last_name_hash, first_name_hash, birth_date_hash, faculty, department, program, study_level, import_id")
    .eq("university_id", e.university_id)
    .eq("academic_year", e.academic_year)
    .eq("student_number_hash", matchHash("student_number", normalizeNumber(e.student_number)))
    .order("id", { ascending: false })
    .limit(1);
  const entry = entries?.[0];
  if (!entry) return null;

  const birth = normalizeDate(e.claimed_birth_date);
  const criteria: MatchCriteria = {
    student_number: true,
    last_name: entry.last_name_hash === matchHash("last_name", normalizeName(e.claimed_last_name)),
    first_name: entry.first_name_hash
      ? entry.first_name_hash === matchHash("first_name", normalizeName(e.claimed_first_name))
      : null,
    birth_date: entry.birth_date_hash && birth ? entry.birth_date_hash === matchHash("birth_date", birth) : null,
  };
  const status = await apply(
    admin,
    e,
    decide(criteria),
    "import",
    criteria,
    {
      faculty: entry.faculty ?? undefined,
      department: entry.department ?? undefined,
      program: entry.program ?? undefined,
      study_level: entry.study_level ?? undefined,
    },
    `import:${entry.import_id}`,
  );
  if (status === "verified") {
    const { data: imp } = await admin.from("university_imports").select("matched_count").eq("id", entry.import_id).single();
    if (imp)
      await admin
        .from("university_imports")
        .update({ matched_count: imp.matched_count + 1 })
        .eq("id", entry.import_id);
  }
  return { status, method: "import" };
}

const COLUMNS =
  "id, user_id, university_id, academic_year, student_number, claimed_first_name, claimed_last_name, claimed_birth_date, faculty, department, program, study_level, status";

export async function runVerificationEngine(enrollmentId: string): Promise<EngineOutcome> {
  const admin = createAdminClient();
  const { data: e } = await admin.from("student_enrollments").select(COLUMNS).eq("id", enrollmentId).single();
  if (!e || e.status !== "pending") return { status: "pending", method: null };
  return (await tryApi(admin, e)) ?? (await tryRoster(admin, e)) ?? { status: "pending", method: null };
}

/** Après un import : rapproche les demandes encore en attente de cette université. */
export async function rematchPending(universityId: number, academicYear: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("student_enrollments")
    .select(COLUMNS)
    .eq("university_id", universityId)
    .eq("academic_year", academicYear)
    .eq("status", "pending")
    .limit(2000);
  let verified = 0;
  let review = 0;
  for (const e of data ?? []) {
    const r = await tryRoster(admin, e);
    if (r?.status === "verified") verified++;
    else if (r?.status === "manual_review") review++;
  }
  return { verified, review };
}
