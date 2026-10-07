"use server";

import { resolveTxt } from "node:dns/promises";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureProAccount } from "@/lib/accounts";
import { sendEmail, universityAccessEmail } from "@/lib/email";
import { formValues, zodFieldErrors, type FormState } from "@/lib/actions/types";
import { CONNECTORS } from "@/lib/verification/connectors";
import { EMAIL_PROVIDERS, parseEmailSettings, type EmailStatus } from "@/lib/student-email";

async function audit(actor: string, action: string, details: Record<string, unknown>, universityId?: number, subject?: string) {
  await createAdminClient()
    .from("audit_log")
    .insert({
      actor_id: actor,
      action,
      details: details as never,
      university_id: universityId ?? null,
      subject_id: subject ?? null,
    });
}

// -----------------------------------------------------------------------------
// Universités
// -----------------------------------------------------------------------------
const universitySchema = z.object({
  name: z.string().trim().min(3, "Nom requis").max(200),
  short_name: z.string().trim().max(40).optional(),
  city_id: z.string().optional(),
});

export async function createUniversity(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = universitySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { error: "Vérifie les champs.", fieldErrors: zodFieldErrors(parsed.error.issues), values: formValues(formData) };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("universities")
    .insert({
      country_code: "GN",
      name: parsed.data.name,
      short_name: parsed.data.short_name || null,
      city_id: parsed.data.city_id ? Number(parsed.data.city_id) : null,
      partner_status: "pending",
      slug: "",
    })
    .select("id")
    .single();
  if (error)
    return {
      error: error.code === "23505" ? "Cet établissement existe déjà." : "Création impossible.",
      values: formValues(formData),
    };
  redirect(`/admin/universites/${data.id}`);
}

const STATUS_CHANGES = ["listed", "pending", "partner", "suspended"] as const;

export async function setUniversityStatus(id: number, status: (typeof STATUS_CHANGES)[number]) {
  const admin = await requireAdmin();
  if (!STATUS_CHANGES.includes(status)) return;
  const supabase = await createClient();
  await supabase
    .from("universities")
    .update({ partner_status: status, ...(status === "partner" ? { approved_at: new Date().toISOString() } : {}) })
    .eq("id", id);
  await audit(admin.id, `university.${status}`, {}, id);
  revalidatePath("/admin/universites", "layout");
}

const memberSchema = z.object({
  email: z.email("Email invalide").max(200),
  first_name: z.string().trim().min(1, "Prénom requis").max(60),
  last_name: z.string().trim().min(1, "Nom requis").max(60),
});

async function grantAccess(universityId: number, m: z.infer<typeof memberSchema>) {
  const admin = createAdminClient();
  const { data: uni } = await admin.from("universities").select("name, city_id").eq("id", universityId).single();
  if (!uni) return { error: "Établissement introuvable." };
  const account = await ensureProAccount(m, "university", uni.city_id);
  if ("error" in account) return { error: account.error };
  const { error } = await admin.from("university_members").upsert({ university_id: universityId, user_id: account.userId });
  if (error) return { error: "Impossible de relier le compte à l'établissement." };
  const email = m.email.toLowerCase();
  await sendEmail({
    to: email,
    ...universityAccessEmail({ firstName: account.firstName, university: uni.name, email, password: account.password }),
  });
  return {
    userId: account.userId,
    message: account.password
      ? `Compte université créé ✅ Identifiant : ${email} · Mot de passe provisoire : ${account.password} (il ne sera plus affiché).`
      : `Compte existant relié ✅ ${email} accède au portail avec son mot de passe habituel.`,
  };
}

export async function grantUniversityAccess(universityId: number, _prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = memberSchema.safeParse({
    email: String(formData.get("email") ?? "").trim(),
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
  });
  if (!parsed.success) return { error: "Vérifie les champs.", fieldErrors: zodFieldErrors(parsed.error.issues) };
  const r = await grantAccess(universityId, parsed.data);
  if ("error" in r) return { error: r.error };
  await audit(admin.id, "university.member_added", { email: parsed.data.email.toLowerCase() }, universityId, r.userId);
  return { ok: true, message: r.message };
}

export async function removeUniversityMember(universityId: number, userId: string) {
  const admin = await requireAdmin();
  if (!z.uuid().safeParse(userId).success) return;
  await createAdminClient().from("university_members").delete().eq("university_id", universityId).eq("user_id", userId);
  await audit(admin.id, "university.member_removed", {}, universityId, userId);
  revalidatePath(`/admin/universites/${universityId}`);
}

/** Demande « Université partenaire » acceptée : fiche (créée ou reliée) + accès au portail. */
export async function approveUniversityApplication(applicationId: string): Promise<FormState> {
  const adminUser = await requireAdmin();
  if (!z.uuid().safeParse(applicationId).success) return { error: "Demande invalide" };
  const admin = createAdminClient();
  const { data: app } = await admin.from("university_applications").select("*").eq("id", applicationId).single();
  if (!app || app.status !== "pending") return { error: "Demande déjà traitée." };

  let universityId = app.university_id;
  if (!universityId) {
    const { data: uni, error } = await admin
      .from("universities")
      .insert({ country_code: "GN", name: app.university_name, city_id: app.city_id, slug: "" })
      .select("id")
      .single();
    if (error || !uni) return { error: "Création de l'établissement impossible (nom déjà utilisé ?)." };
    universityId = uni.id;
  }
  await admin
    .from("universities")
    .update({ partner_status: "partner", approved_at: new Date().toISOString(), contact_email: app.email })
    .eq("id", universityId);

  const [first, ...rest] = app.contact_name.trim().split(/\s+/);
  const r = await grantAccess(universityId, { email: app.email, first_name: first, last_name: rest.join(" ") || first });
  if ("error" in r) return { error: r.error };
  await admin
    .from("university_applications")
    .update({ status: "approved", university_id: universityId, reviewed_at: new Date().toISOString() })
    .eq("id", applicationId);
  await audit(adminUser.id, "university.partner", { application: applicationId }, universityId);
  // Pas de revalidation : le mot de passe provisoire doit rester affiché
  return { ok: true, message: r.message };
}

export async function rejectUniversityApplication(applicationId: string) {
  await requireAdmin();
  if (!z.uuid().safeParse(applicationId).success) return;
  await createAdminClient()
    .from("university_applications")
    .update({ status: "rejected", reviewed_at: new Date().toISOString() })
    .eq("id", applicationId)
    .eq("status", "pending");
  revalidatePath("/admin/universites");
}

// -----------------------------------------------------------------------------
// Connecteur API (niveau 1)
// -----------------------------------------------------------------------------
const integrationSchema = z.object({
  status: z.enum(["not_configured", "testing", "active", "disabled"]),
  base_url: z
    .string()
    .trim()
    .max(300)
    .refine((v) => !v || /^https:\/\/\S+$/.test(v), "HTTPS obligatoire")
    .optional(),
  auth_type: z.enum(["bearer", "api_key_header"]),
  secret_ref: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => !v || /^UNIV_[A-Z0-9_]{2,60}$/.test(v), "Format : UNIV_SIGLE_API_KEY")
    .optional(),
  field_mapping: z
    .string()
    .trim()
    .max(2000)
    .refine((v) => {
      if (!v) return true;
      try {
        const o = JSON.parse(v);
        return o && typeof o === "object" && !Array.isArray(o) && Object.values(o).every((x) => typeof x === "string");
      } catch {
        return false;
      }
    }, 'JSON invalide : { "champ": "chemin.dans.la.reponse" }')
    .optional(),
  agreement_reference: z.string().trim().max(200).optional(),
  agreement_signed_at: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional(),
});

export async function saveIntegration(universityId: number, _prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = integrationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { error: "Vérifie les champs.", fieldErrors: zodFieldErrors(parsed.error.issues), values: formValues(formData) };
  const d = parsed.data;
  if (d.status === "active") {
    if (!d.agreement_signed_at || !d.agreement_reference)
      return { error: "Activation refusée : renseigne l'accord signé (référence et date).", values: formValues(formData) };
    if (!d.base_url || !d.secret_ref)
      return { error: "Activation refusée : URL et variable secrète requises.", values: formValues(formData) };
    const { data: uni } = await createAdminClient().from("universities").select("partner_status").eq("id", universityId).single();
    if (uni?.partner_status !== "partner") return { error: "Approuve d'abord l'établissement.", values: formValues(formData) };
    const { data: current } = await createAdminClient()
      .from("university_integrations")
      .select("last_test_ok")
      .eq("university_id", universityId)
      .maybeSingle();
    if (!current?.last_test_ok)
      return { error: "Activation refusée : le dernier test de connexion doit avoir réussi.", values: formValues(formData) };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("university_integrations").upsert({
    university_id: universityId,
    status: d.status,
    base_url: d.base_url || null,
    auth_type: d.auth_type,
    secret_ref: d.secret_ref || null,
    field_mapping: d.field_mapping ? JSON.parse(d.field_mapping) : {},
    agreement_reference: d.agreement_reference || null,
    agreement_signed_at: d.agreement_signed_at || null,
    updated_by: admin.id,
  });
  if (error) return { error: `Enregistrement impossible : ${error.message}`, values: formValues(formData) };
  await audit(
    admin.id,
    "integration.updated",
    { status: d.status, base_url: d.base_url, secret_ref: d.secret_ref },
    universityId,
  );
  revalidatePath(`/admin/universites/${universityId}`);
  return { ok: true, message: d.status === "active" ? "Connecteur activé ✅" : "Connecteur enregistré ✅" };
}

export async function testIntegration(universityId: number): Promise<FormState> {
  const admin = await requireAdmin();
  const db = createAdminClient();
  const { data: cfg } = await db.from("university_integrations").select("*").eq("university_id", universityId).maybeSingle();
  if (!cfg) return { error: "Enregistre d'abord la configuration." };
  const r = await CONNECTORS[cfg.provider].test(cfg);
  await db
    .from("university_integrations")
    .update({ last_test_at: new Date().toISOString(), last_test_ok: r.ok, last_test_message: r.message })
    .eq("university_id", universityId);
  await audit(admin.id, "integration.tested", { ok: r.ok, message: r.message }, universityId);
  revalidatePath(`/admin/universites/${universityId}`);
  return r.ok ? { ok: true, message: r.message } : { error: r.message };
}

export async function disableIntegration(universityId: number) {
  const admin = await requireAdmin();
  await createAdminClient().from("university_integrations").update({ status: "disabled" }).eq("university_id", universityId);
  await audit(admin.id, "integration.updated", { status: "disabled" }, universityId);
  revalidatePath(`/admin/universites/${universityId}`);
}

// -----------------------------------------------------------------------------
// BAC : vérification manuelle (aucune source officielle raccordée)
// -----------------------------------------------------------------------------
export async function reviewBac(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const adminUser = await requireAdmin();
  if (!z.uuid().safeParse(id).success) return { error: "Demande invalide" };
  const decision = formData.get("decision");
  const reason = String(formData.get("reason") ?? "")
    .trim()
    .slice(0, 500);
  const reference = String(formData.get("source_reference") ?? "")
    .trim()
    .slice(0, 120);
  if (decision !== "verify" && decision !== "reject") return { error: "Décision invalide" };
  if (decision === "reject" && reason.length < 3) return { error: "Indique le motif du refus." };

  const admin = createAdminClient();
  const { data: bac } = await admin.from("bac_verifications").select("*").eq("id", id).single();
  if (!bac || !["manual_review", "pending"].includes(bac.status)) return { error: "Demande déjà traitée." };
  const { error } = await admin
    .from("bac_verifications")
    .update({
      status: decision === "verify" ? "verified" : "rejected",
      result: decision === "verify" ? "admis" : null,
      rejection_reason: decision === "reject" ? reason : null,
      source_reference: reference || null,
      reviewed_by: adminUser.id,
      reviewed_at: new Date().toISOString(),
      document_path: null,
    })
    .eq("id", id);
  if (error)
    return {
      error:
        error.code === "23505" ? "Ce numéro de candidat est déjà vérifié pour un autre compte." : "Enregistrement impossible.",
    };
  // Preuve minimale : le relevé est supprimé dès la décision
  if (bac.document_path) await admin.storage.from("verification-docs").remove([bac.document_path]);
  await admin.from("notifications").insert({
    user_id: bac.user_id,
    type: decision === "verify" ? "verification_approved" : "verification_rejected",
    title: decision === "verify" ? "BAC vérifié ✅" : "BAC non vérifié",
    body:
      decision === "verify"
        ? `Ton baccalauréat ${bac.exam_year} est vérifié. Le relevé envoyé a été supprimé.`
        : `Motif : ${reason}. Tu peux envoyer un nouveau document.`,
    link: "/profil/verification",
  });
  await audit(
    adminUser.id,
    `bac.${decision === "verify" ? "verified" : "rejected"}`,
    { exam_year: bac.exam_year },
    undefined,
    bac.user_id,
  );
  revalidatePath("/admin/verifications");
  return { ok: true, message: decision === "verify" ? "BAC vérifié ✅ Relevé supprimé." : "Refus envoyé à l'étudiant." };
}

// -----------------------------------------------------------------------------
// Emails étudiants
// -----------------------------------------------------------------------------
const emailSettingsSchema = z.object({
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .refine((v) => !v || /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(v), "Domaine invalide")
    .optional(),
  provider: z.enum(Object.keys(EMAIL_PROVIDERS) as [keyof typeof EMAIL_PROVIDERS]),
  auto_allocate: z.string().optional(),
  expiry_policy: z.enum(["suspend", "alumni"]),
  grace_days: z.coerce.number().int().min(0).max(365),
});

export async function saveEmailSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = emailSettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { error: "Vérifie les champs.", fieldErrors: zodFieldErrors(parsed.error.issues), values: formValues(formData) };
  const value = {
    domain: parsed.data.domain || null,
    provider: parsed.data.provider,
    auto_allocate: parsed.data.auto_allocate === "on" && !!parsed.data.domain,
    expiry_policy: parsed.data.expiry_policy,
    grace_days: parsed.data.grace_days,
  };
  const supabase = await createClient();
  const { error } = await supabase
    .from("platform_settings")
    .update({ value, updated_by: admin.id, updated_at: new Date().toISOString() })
    .eq("key", "student_email");
  if (error) return { error: "Enregistrement impossible." };
  await audit(admin.id, "student_email.settings", value);
  revalidatePath("/admin/emails");
  return { ok: true, message: "Réglages enregistrés ✅" };
}

/** Réserve une adresse pour chaque étudiant vérifié qui n'en a pas (par lots de 200). */
export async function allocateMissingEmails(): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const { data: s } = await supabase.from("platform_settings").select("value").eq("key", "student_email").single();
  if (!parseEmailSettings(s?.value).domain) return { error: "Configure d'abord le domaine des emails étudiants." };
  const { data: students } = await supabase
    .from("profiles")
    .select("id, student_email_accounts!student_email_accounts_user_id_fkey(id, status)")
    .eq("role", "student")
    .eq("verification_status", "verified")
    .eq("is_test_account", false)
    .limit(1000);
  const todo = (students ?? []).filter((p) => !p.student_email_accounts.some((a) => a.status !== "disabled")).slice(0, 200);
  let created = 0;
  for (const p of todo) {
    const { error } = await supabase.rpc("allocate_student_email", { p_user: p.id });
    if (!error) created++;
  }
  revalidatePath("/admin/emails");
  return { ok: true, message: `${created} adresse${created > 1 ? "s" : ""} réservée${created > 1 ? "s" : ""} ✅` };
}

export async function allocateEmailFor(userId: string): Promise<FormState> {
  await requireAdmin();
  if (!z.uuid().safeParse(userId).success) return { error: "Étudiant invalide" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("allocate_student_email", { p_user: userId });
  if (error) return { error: error.code === "P0001" ? error.message : "Attribution impossible." };
  revalidatePath("/admin/emails");
  revalidatePath(`/admin/utilisateurs/${userId}`);
  return { ok: true, message: `Adresse réservée : ${data.address}` };
}

const EMAIL_TRANSITIONS: Record<string, EmailStatus[]> = {
  pending: ["active", "disabled"],
  active: ["suspended", "alumni", "disabled"],
  suspended: ["active", "alumni", "disabled"],
  alumni: ["active", "suspended", "disabled"],
  disabled: [],
};

export async function setEmailStatus(id: string, status: EmailStatus, providerRef?: string) {
  const admin = await requireAdmin();
  if (!z.uuid().safeParse(id).success) return;
  const supabase = await createClient();
  const { data: row } = await supabase.from("student_email_accounts").select("status, address, user_id").eq("id", id).single();
  if (!row || !EMAIL_TRANSITIONS[row.status].includes(status)) return;
  await supabase
    .from("student_email_accounts")
    .update({
      status,
      // Création manuelle chez le fournisseur : l'admin confirme que la boîte existe et est synchronisée
      last_synced_at: new Date().toISOString(),
      ...(providerRef ? { provider_account_ref: providerRef.slice(0, 200) } : {}),
    })
    .eq("id", id);
  await audit(admin.id, `student_email.${status}`, { address: row.address }, undefined, row.user_id ?? undefined);
  revalidatePath("/admin/emails");
}

export async function markEmailSynced(id: string) {
  await requireAdmin();
  if (!z.uuid().safeParse(id).success) return;
  const supabase = await createClient();
  await supabase.from("student_email_accounts").update({ last_synced_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/admin/emails");
}

export async function applyEmailPolicy(): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("apply_student_email_policy");
  if (error) return { error: "Action impossible." };
  revalidatePath("/admin/emails");
  return { ok: true, message: `${data} adresse${data > 1 ? "s" : ""} mise${data > 1 ? "s" : ""} à jour selon la politique.` };
}

export type DnsCheck = { label: string; ok: boolean; detail: string }[];

/** Contrôle DNS du domaine étudiant : SPF, DKIM (sélecteur du fournisseur) et DMARC. */
export async function checkEmailDns(): Promise<{ checks?: DnsCheck; error?: string }> {
  await requireAdmin();
  const supabase = await createClient();
  const { data: s } = await supabase.from("platform_settings").select("value").eq("key", "student_email").single();
  const settings = parseEmailSettings(s?.value);
  if (!settings.domain) return { error: "Aucun domaine configuré." };
  const txt = async (name: string) => {
    try {
      return (await resolveTxt(name)).map((r) => r.join(""));
    } catch {
      return [];
    }
  };
  const selector = EMAIL_PROVIDERS[settings.provider].dkimSelector;
  const [spf, dmarc, dkim] = await Promise.all([
    txt(settings.domain),
    txt(`_dmarc.${settings.domain}`),
    selector ? txt(`${selector}._domainkey.${settings.domain}`) : Promise.resolve([]),
  ]);
  const spfRecord = spf.find((r) => r.startsWith("v=spf1"));
  const dmarcRecord = dmarc.find((r) => r.startsWith("v=DMARC1"));
  return {
    checks: [
      { label: "SPF", ok: !!spfRecord, detail: spfRecord ?? `Aucun enregistrement TXT « v=spf1 » sur ${settings.domain}` },
      {
        label: "DKIM",
        ok: dkim.some((r) => r.includes("p=")),
        detail: selector
          ? (dkim[0]?.slice(0, 80) ?? `Aucune clé sur ${selector}._domainkey.${settings.domain}`)
          : "Choisis le fournisseur pour connaître le sélecteur DKIM",
      },
      {
        label: "DMARC",
        ok: !!dmarcRecord && !/p=none/.test(dmarcRecord),
        detail: dmarcRecord ?? `Aucun enregistrement sur _dmarc.${settings.domain}`,
      },
    ],
  };
}
