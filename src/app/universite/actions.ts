"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formValues, zodFieldErrors, type FormState } from "@/lib/actions/types";
import { canManageUniversity, requireUniversity, UNIVERSITY_COOKIE } from "@/lib/university";
import { CARD_FIELDS, HEX_COLOR, isCardField, isCardLayout } from "@/lib/card-template";
import { parseRoster, ROSTER_COLUMNS } from "@/lib/verification/roster";
import { hasMatchSecret, matchHash } from "@/lib/verification/hash";
import { normalizeName, normalizeNumber } from "@/lib/verification/normalize";
import { rematchPending } from "@/lib/verification/engine";
import { internalEmail, sendEmail } from "@/lib/email";
import { SUPPORT_EMAIL } from "@/lib/constants";

const DECISIONS = {
  verify: { status: "verified", done: "Inscription confirmée ✅ La carte de l'étudiant est activée." },
  reject: { status: "rejected", done: "Demande refusée. L'étudiant a été notifié avec le motif." },
  expire: { status: "expired", done: "Carte expirée. L'étudiant a été notifié." },
  revoke: { status: "rejected", done: "Carte révoquée. L'étudiant a été notifié avec le motif." },
  reactivate: { status: "verified", done: "Carte réactivée ✅" },
} as const;
export type Decision = keyof typeof DECISIONS;

/** Décision sur une inscription (confirmer, refuser, révoquer, expirer, réactiver). */
export async function decideEnrollment(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const decision = String(formData.get("decision")) as Decision;
  if (!z.uuid().safeParse(id).success || !(decision in DECISIONS)) return { error: "Demande invalide" };
  // Droits vérifiés par la base : membre de l'université concernée ou administrateur Uny
  const reason = String(formData.get("reason") ?? "")
    .trim()
    .slice(0, 500);
  if ((decision === "reject" || decision === "revoke") && reason.length < 3)
    return { error: "Indiquez le motif (visible par l'étudiant)." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_enrollment_status", {
    p_enrollment: id,
    p_status: DECISIONS[decision].status,
    p_reason: reason || undefined,
  });
  if (error) return { error: error.code === "P0001" ? error.message : "Action impossible. Réessayez." };
  revalidatePath("/universite", "layout");
  revalidatePath("/admin/verifications");
  return { ok: true, message: DECISIONS[decision].done };
}

// -----------------------------------------------------------------------------
// Identité visuelle + template de carte
// -----------------------------------------------------------------------------
const brandingSchema = z.object({
  official_name: z.string().trim().min(2, "Nom officiel requis").max(200),
  logo_url: z
    .string()
    .trim()
    .max(500)
    .refine(
      (v) => !v || /^https?:\/\/[^/]+\/storage\/v1\/object\/public\/(marketplace|content)\//.test(v),
      "Logo invalide : utilise le bouton d'envoi",
    )
    .optional(),
  primary_color: z.string().regex(HEX_COLOR, "Couleur invalide"),
  secondary_color: z.string().regex(HEX_COLOR, "Couleur invalide"),
  accent_color: z.string().regex(HEX_COLOR, "Couleur invalide"),
  motto: z.string().trim().max(120).optional(),
});

export async function saveCardDesign(universityId: number, _prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await canManageUniversity(universityId);
  if (!actor) return { error: "Accès refusé." };
  const university = { id: universityId };
  const parsed = brandingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return {
      error: "Vérifiez les champs indiqués.",
      fieldErrors: zodFieldErrors(parsed.error.issues),
      values: formValues(formData),
    };
  const layout = String(formData.get("layout") ?? "classic");
  if (!isCardLayout(layout)) return { error: "Modèle de carte inconnu." };
  const fields = formData.getAll("fields").map(String).filter(isCardField);
  const labels: Record<string, string> = {};
  for (const f of CARD_FIELDS) {
    const v = String(formData.get(`label_${f}`) ?? "").trim();
    if (v) labels[f] = v.slice(0, 30);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("university_branding").upsert({
    university_id: university.id,
    official_name: parsed.data.official_name,
    logo_url: parsed.data.logo_url || null,
    primary_color: parsed.data.primary_color.toLowerCase(),
    secondary_color: parsed.data.secondary_color.toLowerCase(),
    accent_color: parsed.data.accent_color.toLowerCase(),
    motto: parsed.data.motto || null,
    updated_by: actor.id,
  });
  if (error) return { error: "Enregistrement impossible.", values: formValues(formData) };
  const { data: tpl, error: tplError } = await supabase.rpc("publish_card_template", {
    p_university: university.id,
    p_layout: layout,
    p_fields: fields,
    p_labels: labels,
  });
  if (tplError) return { error: tplError.code === "P0001" ? tplError.message : "Publication impossible." };
  revalidatePath("/universite", "layout");
  revalidatePath(`/admin/universites/${universityId}`);
  revalidatePath("/admin/cartes");
  revalidatePath("/carte");
  return { ok: true, message: `Carte publiée ✅ (version ${tpl.version}). Elle s'affiche déjà chez vos étudiants confirmés.` };
}

// -----------------------------------------------------------------------------
// Import d'une liste d'étudiants (niveau 2) : seules des empreintes sont enregistrées
// -----------------------------------------------------------------------------
export type ImportState = FormState & {
  report?: {
    rows: number;
    skipped: number;
    duplicates: number;
    verified: number;
    review: number;
    columns: string[];
    missing: string[];
  };
};

export async function importRoster(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const { profile, university } = await requireUniversity();
  if (university.partner_status !== "partner")
    return { error: "Les imports seront disponibles dès que Uny aura approuvé votre établissement." };
  if (!hasMatchSecret()) return { error: "Import momentanément indisponible (configuration serveur). Contactez Uny." };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choisissez un fichier .xlsx ou .csv." };
  if (file.size > 8 * 1024 * 1024) return { error: "Fichier trop lourd (8 Mo maximum)." };
  const year = String(formData.get("academic_year") ?? "");
  if (!/^\d{4}-\d{4}$/.test(year) || Number(year.slice(5)) !== Number(year.slice(0, 4)) + 1)
    return { error: "Année universitaire invalide." };

  const parsed = await parseRoster(file);
  if (parsed.error) return { error: parsed.error };
  if (!parsed.rows.length) return { error: "Aucune ligne exploitable (matricule et nom requis)." };

  const seen = new Set<string>();
  let duplicates = 0;
  const entries = [];
  for (const r of parsed.rows) {
    const num = normalizeNumber(r.student_number);
    const last = normalizeName(r.last_name);
    if (!num || !last) continue;
    const h = matchHash("student_number", num);
    if (seen.has(h)) {
      duplicates++;
      continue;
    }
    seen.add(h);
    const first = normalizeName(r.first_name);
    entries.push({
      university_id: university.id,
      academic_year: year,
      student_number_hash: h,
      last_name_hash: matchHash("last_name", last),
      first_name_hash: first ? matchHash("first_name", first) : null,
      birth_date_hash: r.birth_date ? matchHash("birth_date", r.birth_date) : null,
      faculty: r.faculty ?? null,
      department: r.department ?? null,
      program: r.program ?? null,
      study_level: r.study_level ?? null,
    });
  }

  const admin = createAdminClient();
  const { data: imp, error } = await admin
    .from("university_imports")
    .insert({
      university_id: university.id,
      academic_year: year,
      file_name: file.name.slice(0, 200),
      row_count: entries.length,
      skipped_count: parsed.skipped + duplicates,
      imported_by: profile.id,
      purge_after: `${year.slice(5)}-10-31`,
    })
    .select("id")
    .single();
  if (error || !imp) return { error: "Import impossible. Réessayez." };
  for (let i = 0; i < entries.length; i += 1000) {
    const { error: e } = await admin
      .from("university_roster_entries")
      .insert(entries.slice(i, i + 1000).map((x) => ({ ...x, import_id: imp.id })));
    if (e) {
      await admin.from("university_imports").delete().eq("id", imp.id);
      return { error: "Import interrompu (données invalides). Aucune ligne n'a été conservée." };
    }
  }
  // Purge des listes dont l'année universitaire est terminée (toutes universités)
  await admin.from("university_imports").delete().lt("purge_after", new Date().toISOString().slice(0, 10));
  // La liste précédente de la même année est remplacée
  await admin.from("university_imports").delete().eq("university_id", university.id).eq("academic_year", year).neq("id", imp.id);
  await admin.from("audit_log").insert({
    actor_id: profile.id,
    university_id: university.id,
    action: "roster.imported",
    details: { import: imp.id, rows: entries.length, year },
  });

  const { verified, review } = await rematchPending(university.id, year);
  revalidatePath("/universite", "layout");
  return {
    ok: true,
    message: "Liste importée ✅",
    report: {
      rows: entries.length,
      skipped: parsed.skipped,
      duplicates,
      verified,
      review,
      columns: Object.keys(parsed.columns).map((c) => ROSTER_COLUMNS[c as keyof typeof ROSTER_COLUMNS].label),
      missing: parsed.missing.map((c) => ROSTER_COLUMNS[c].label),
    },
  };
}

export async function deleteImport(id: string) {
  if (!z.uuid().safeParse(id).success) return;
  const { profile, university } = await requireUniversity();
  const admin = createAdminClient();
  const { data } = await admin.from("university_imports").delete().eq("id", id).eq("university_id", university.id).select("id");
  if (data?.length)
    await admin
      .from("audit_log")
      .insert({ actor_id: profile.id, university_id: university.id, action: "roster.deleted", details: { import: id } });
  revalidatePath("/universite/imports");
}

// -----------------------------------------------------------------------------
// Fiche établissement
// -----------------------------------------------------------------------------
const profileSchema = z.object({
  short_name: z.string().trim().max(40).optional(),
  website: z
    .string()
    .trim()
    .max(200)
    .refine((v) => !v || /^https?:\/\/\S+$/.test(v), "Adresse invalide (https://…)")
    .optional(),
  contact_email: z.union([z.literal(""), z.email("Email invalide").max(200)]).optional(),
  city_id: z.string().optional(),
  faculties: z.string().max(4000).optional(),
});

export async function updateUniversityProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const { university } = await requireUniversity();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return {
      error: "Vérifiez les champs indiqués.",
      fieldErrors: zodFieldErrors(parsed.error.issues),
      values: formValues(formData),
    };
  const d = parsed.data;
  const faculties = [
    ...new Set(
      (d.faculties ?? "")
        .split("\n")
        .map((l) => l.trim().slice(0, 120))
        .filter(Boolean),
    ),
  ].slice(0, 60);
  const supabase = await createClient();
  const { error } = await supabase
    .from("universities")
    .update({
      short_name: d.short_name || null,
      website: d.website || null,
      contact_email: d.contact_email || null,
      city_id: d.city_id ? Number(d.city_id) : null,
      faculties,
    })
    .eq("id", university.id);
  if (error) return { error: "Enregistrement impossible.", values: formValues(formData) };
  revalidatePath("/universite", "layout");
  return { ok: true, message: "Fiche mise à jour ✅" };
}

/** Demande de raccordement API : transmise à l'équipe Uny (aucune clé n'est saisie dans le portail). */
export async function requestApiConnection(_prev: FormState, formData: FormData): Promise<FormState> {
  const { profile, university } = await requireUniversity();
  const schema = z.object({
    tech_name: z.string().trim().min(2, "Nom requis").max(120),
    tech_email: z.email("Email invalide").max(200),
    system: z.string().trim().max(200).optional(),
    notes: z.string().trim().max(1000).optional(),
  });
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return {
      error: "Vérifiez les champs indiqués.",
      fieldErrors: zodFieldErrors(parsed.error.issues),
      values: formValues(formData),
    };
  const admin = createAdminClient();
  await admin.from("audit_log").insert({
    actor_id: profile.id,
    university_id: university.id,
    action: "integration.requested",
    details: parsed.data,
  });
  await sendEmail({
    to: SUPPORT_EMAIL,
    ...internalEmail(`Raccordement API — ${university.name}`, [
      `${university.name} demande le raccordement de son système d'information.`,
      `Contact technique : ${parsed.data.tech_name} <${parsed.data.tech_email}>`,
      `Système : ${parsed.data.system || "—"}`,
      `Notes : ${parsed.data.notes || "—"}`,
      `Demandé par : ${profile.first_name} ${profile.last_name} (${profile.email})`,
    ]),
  });
  return { ok: true, message: "Demande envoyée ✅ L'équipe Uny vous recontacte pour l'accord et les tests." };
}

export async function switchUniversity(id: number) {
  if (!Number.isInteger(id)) return;
  (await cookies()).set(UNIVERSITY_COOKIE, String(id), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/universite", "layout");
}
