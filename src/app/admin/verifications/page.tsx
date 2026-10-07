import Link from "next/link";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChips } from "@/components/ui/filters";
import { EnrollmentItem, type EnrollmentRow } from "@/components/university/enrollment-item";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { ENROLLMENT_STATUS, VERIFICATION_METHODS } from "@/lib/university";
import { BAC_METHODS, officialBacProvider } from "@/lib/verification/bac";
import { DOCUMENT_TYPES } from "@/lib/constants";
import { param, withParams, type SearchParams } from "@/lib/url";
import { DocumentsTab } from "./documents-tab";
import { BacReviewForm } from "./bac-review-form";

export const metadata = { title: "Vérifications" };

const TABS = [
  { value: undefined, label: "Justificatifs" },
  { value: "universites", label: "Universités" },
  { value: "bac", label: "BAC" },
  { value: "registre", label: "Registre" },
] as const;

export default async function VerificationsAdmin({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const sp = await searchParams;
  const type = param(sp, "type");
  const supabase = await createClient();
  const [{ count: docs }, { count: enr }, { count: bac }] = await Promise.all([
    supabase.from("student_verifications").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("student_enrollments").select("id", { count: "exact", head: true }).in("status", ["pending", "manual_review"]),
    supabase.from("bac_verifications").select("id", { count: "exact", head: true }).in("status", ["pending", "manual_review"]),
  ]);
  const counts: Record<string, number> = { "": docs ?? 0, universites: enr ?? 0, bac: bac ?? 0 };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold tracking-tight">Vérifications</h1>
      <nav aria-label="Type de vérification" className="border-line flex gap-1 overflow-x-auto border-b">
        {TABS.map((t) => {
          const active = (t.value ?? "") === (type ?? "");
          const n = counts[t.value ?? ""] ?? 0;
          return (
            <Link
              key={t.label}
              href={withParams("/admin/verifications", {}, { type: t.value ?? null })}
              aria-current={active ? "page" : undefined}
              className={cn(
                "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-semibold whitespace-nowrap",
                active ? "border-ink text-ink" : "text-muted hover:text-ink border-transparent",
              )}
            >
              {t.label}
              {n > 0 && <span className="bg-coral-500 rounded-full px-1.5 text-xs font-bold text-white">{n}</span>}
            </Link>
          );
        })}
      </nav>
      {type === "universites" ? (
        <EnrollmentsTab sp={sp} />
      ) : type === "bac" ? (
        <BacTab sp={sp} />
      ) : type === "registre" ? (
        <RegistryTab />
      ) : (
        <DocumentsTab sp={sp} />
      )}
    </div>
  );
}

const ENROLLMENT_FILTERS = { confirmees: ["verified"], refusees: ["rejected"], expirees: ["expired"] } as const;

async function EnrollmentsTab({ sp }: { sp: SearchParams }) {
  const filter = param(sp, "statut") as keyof typeof ENROLLMENT_FILTERS | undefined;
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_enrollments")
    .select(
      "*, profile:profiles!student_enrollments_user_id_fkey(uny_id, avatar_url), university:universities(name), card:student_cards!student_cards_enrollment_id_fkey(status)",
    )
    .in("status", filter && filter in ENROLLMENT_FILTERS ? [...ENROLLMENT_FILTERS[filter]] : ["pending", "manual_review"])
    .order("created_at", { ascending: false })
    .limit(60);
  const rows = data ?? [];
  return (
    <div className="space-y-4">
      <p className="text-muted text-sm">
        Demandes de confirmation d&apos;inscription adressées aux universités partenaires. L&apos;université décide depuis son
        portail ; l&apos;administrateur Uny peut aussi trancher (méthode « Manuelle »).
      </p>
      <FilterChips
        pathname="/admin/verifications"
        searchParams={{ type: "universites", statut: filter }}
        name="statut"
        allLabel="À traiter"
        options={[
          { value: "confirmees", label: "Confirmées" },
          { value: "refusees", label: "Refusées" },
          { value: "expirees", label: "Expirées" },
        ]}
      />
      {rows.length === 0 ? (
        <EmptyState emoji="🎉" title="Rien à afficher" />
      ) : (
        <ul className="grid gap-4 xl:grid-cols-2">
          {rows.map((r) => {
            const e: EnrollmentRow = {
              id: r.id,
              user_id: r.user_id,
              uny_id: r.profile?.uny_id ?? "",
              first_name: r.claimed_first_name,
              last_name: r.claimed_last_name,
              birth_date: r.claimed_birth_date ?? "",
              avatar_url: r.profile?.avatar_url ?? "",
              student_number: r.student_number,
              faculty: r.faculty ?? "",
              department: r.department ?? "",
              program: r.program ?? "",
              study_level: r.study_level ?? "",
              academic_year: r.academic_year,
              status: r.status,
              method: r.method!,
              match_details: r.match_details,
              rejection_reason: r.rejection_reason ?? "",
              created_at: r.created_at,
              decided_at: r.decided_at ?? "",
              expires_at: r.expires_at ?? "",
              card_status: r.card[0]?.status ?? "active",
              total: 0,
            };
            return (
              <div key={r.id}>
                <p className="text-muted mb-1 text-xs font-semibold">{r.university?.name}</p>
                <EnrollmentItem e={e} canDecide />
              </div>
            );
          })}
        </ul>
      )}
    </div>
  );
}

async function BacTab({ sp }: { sp: SearchParams }) {
  const done = param(sp, "statut") === "traitees";
  const supabase = await createClient();
  const { data } = await supabase
    .from("bac_verifications")
    .select("*, profile:profiles!bac_verifications_user_id_fkey(id, first_name, last_name, birth_date, uny_id)")
    .in("status", done ? ["verified", "rejected", "expired"] : ["pending", "manual_review"])
    .order("created_at", { ascending: !done })
    .limit(50);
  const rows = data ?? [];
  const paths = rows.map((r) => r.document_path).filter((p): p is string => !!p);
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data: urls } = await supabase.storage.from("verification-docs").createSignedUrls(paths, 300);
    urls?.forEach((u) => u.path && u.signedUrl && signed.set(u.path, u.signedUrl));
  }
  return (
    <div className="space-y-4">
      <div className="bg-brand-50 text-brand-800 rounded-2xl p-4 text-sm">
        <strong>Source officielle : {officialBacProvider.isConnected() ? "connectée" : "non connectée"}.</strong> Recherche le
        numéro de PV dans les résultats officiels du BAC de l&apos;année indiquée et vérifie que le nom correspond et que le
        candidat est admis. À la décision, le numéro complet est effacé ; seule la preuve (année, numéro masqué, méthode, date)
        est gardée.
      </div>
      <FilterChips
        pathname="/admin/verifications"
        searchParams={{ type: "bac", statut: done ? "traitees" : undefined }}
        name="statut"
        allLabel="À traiter"
        options={[{ value: "traitees", label: "Traitées" }]}
      />
      {rows.length === 0 ? (
        <EmptyState emoji="🎓" title="Rien à afficher" />
      ) : (
        <ul className="grid gap-4 xl:grid-cols-2">
          {rows.map((r) => {
            const url = r.document_path ? signed.get(r.document_path) : null;
            return (
              <li key={r.id} className="space-y-3 rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-card)]">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link href={`/admin/utilisateurs/${r.profile?.id}`} className="font-bold hover:underline">
                      {r.profile?.first_name} {r.profile?.last_name}
                    </Link>
                    <p className="text-muted text-sm">
                      Né(e) le {formatDate(r.profile?.birth_date)} · <span className="font-mono">{r.profile?.uny_id}</span>
                    </p>
                    <p className="text-sm">
                      BAC {r.exam_year} · PV{" "}
                      <span className="bg-canvas rounded px-1.5 py-0.5 font-mono font-bold">
                        {r.candidate_number ?? r.candidate_ref}
                      </span>
                    </p>
                  </div>
                  <Badge tone={ENROLLMENT_STATUS[r.status].tone}>{ENROLLMENT_STATUS[r.status].label}</Badge>
                </div>
                {url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-600 inline-flex items-center gap-1 text-sm font-semibold"
                  >
                    <FileText className="size-4" /> Ancien relevé envoyé (lien valable 5 min)
                  </a>
                )}
                {done ? (
                  <p className="text-muted text-xs">
                    {BAC_METHODS[r.method as keyof typeof BAC_METHODS]} · {formatDate(r.reviewed_at)}
                    {r.source_reference && <> · réf. {r.source_reference}</>}
                    {r.rejection_reason && <> · motif : {r.rejection_reason}</>}
                  </p>
                ) : (
                  <BacReviewForm id={r.id} />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Registre unifié des dernières décisions (toutes méthodes). */
async function RegistryTab() {
  const supabase = await createClient();
  const [{ data: enr }, { data: bac }, { data: docs }] = await Promise.all([
    supabase
      .from("student_enrollments")
      .select("id, status, method, decided_at, created_at, claimed_first_name, claimed_last_name, university:universities(name)")
      .order("updated_at", { ascending: false })
      .limit(40),
    supabase
      .from("bac_verifications")
      .select(
        "id, status, method, provider, reviewed_at, created_at, exam_year, profile:profiles!bac_verifications_user_id_fkey(first_name, last_name)",
      )
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("student_verifications")
      .select(
        "id, status, document_type, reviewed_at, created_at, profile:profiles!student_verifications_user_id_fkey(first_name, last_name)",
      )
      .order("created_at", { ascending: false })
      .limit(40),
  ]);
  const DOC_STATUS = { pending: "pending", approved: "verified", rejected: "rejected" } as const;
  const rows = [
    ...(enr ?? []).map((e) => ({
      id: e.id,
      type: "Université",
      who: `${e.claimed_first_name} ${e.claimed_last_name}`,
      source: e.university?.name ?? "—",
      method: e.method ? VERIFICATION_METHODS[e.method] : "—",
      status: e.status,
      date: e.decided_at ?? e.created_at,
    })),
    ...(bac ?? []).map((b) => ({
      id: b.id,
      type: "BAC",
      who: `${b.profile?.first_name} ${b.profile?.last_name}`,
      source: b.provider === "official_api" ? "Source officielle" : `Relevé ${b.exam_year}`,
      method: BAC_METHODS[b.method as keyof typeof BAC_METHODS],
      status: b.status,
      date: b.reviewed_at ?? b.created_at,
    })),
    ...(docs ?? []).map((d) => ({
      id: d.id,
      type: "Justificatif",
      who: `${d.profile?.first_name} ${d.profile?.last_name}`,
      source: DOCUMENT_TYPES[d.document_type],
      method: VERIFICATION_METHODS.document,
      status: DOC_STATUS[d.status],
      date: d.reviewed_at ?? d.created_at,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)]">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="text-muted border-line border-b text-xs uppercase">
          <tr>
            <th className="p-3">Type</th>
            <th className="p-3">Étudiant</th>
            <th className="p-3">Source</th>
            <th className="p-3">Méthode</th>
            <th className="p-3">Statut</th>
            <th className="p-3">Date</th>
          </tr>
        </thead>
        <tbody className="divide-line divide-y">
          {rows.slice(0, 80).map((r) => (
            <tr key={`${r.type}-${r.id}`}>
              <td className="p-3 font-semibold">{r.type}</td>
              <td className="p-3">{r.who}</td>
              <td className="p-3">{r.source}</td>
              <td className="text-muted p-3">{r.method}</td>
              <td className="p-3">
                <Badge tone={ENROLLMENT_STATUS[r.status].tone}>{ENROLLMENT_STATUS[r.status].label}</Badge>
              </td>
              <td className="text-muted p-3 whitespace-nowrap">{formatDate(r.date, { month: "short" })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
