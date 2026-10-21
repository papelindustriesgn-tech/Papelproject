import { History } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChips, Pagination } from "@/components/ui/filters";
import { RestrictedNotice } from "@/components/university/restricted-notice";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AUDIT_ACTIONS, requireUniversity, universityCan } from "@/lib/university";
import { formatDate } from "@/lib/format";
import { param, type SearchParams } from "@/lib/url";

export const metadata = { title: "Historique" };

const PER_PAGE = 50;
const GROUPS = {
  decisions: ["enrollment.verified", "enrollment.rejected", "enrollment.expired", "enrollment.incomplete"],
  donnees: ["roster.imported", "roster.deleted", "students.exported"],
  acces: ["member.added", "member.role_changed", "member.removed"],
} as const;

/** Historique des opérations sensibles : qui, quoi, quand, et le motif des décisions. */
export default async function HistoryPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const { university } = await requireUniversity();
  if (!universityCan(university, "audit")) return <RestrictedNotice university={university} title="Historique" />;
  const page = Math.max(1, Number(param(sp, "page")) || 1);
  const group = param(sp, "type") as keyof typeof GROUPS | undefined;
  const supabase = await createClient();
  let query = supabase
    .from("audit_log")
    .select("id, action, created_at, actor_id, subject_id, details")
    .eq("university_id", university.id)
    .neq("action", "enrollment.submitted")
    .order("created_at", { ascending: false })
    .range((page - 1) * PER_PAGE, page * PER_PAGE);
  if (group && group in GROUPS) query = query.in("action", [...GROUPS[group]]);
  const { data } = await query;
  const rows = (data ?? []).slice(0, PER_PAGE);

  // Noms des responsables et des étudiants concernés (lecture serveur, après contrôle du rôle)
  const ids = [...new Set(rows.flatMap((r) => [r.actor_id, r.subject_id]).filter((v): v is string => !!v))];
  const { data: people } = ids.length
    ? await createAdminClient().from("profiles").select("id, first_name, last_name, role").in("id", ids)
    : { data: [] };
  const name = (id: string | null) => {
    if (!id) return "Système (vérification automatique)";
    const p = people?.find((x) => x.id === id);
    return p ? `${p.first_name} ${p.last_name}${p.role === "admin" ? " (Uny)" : ""}` : "Compte supprimé";
  };

  return (
    <div className="animate-fade-up space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Historique</h1>
        <p className="text-muted mt-1 text-sm">
          Décisions sur les inscriptions, imports, exports et changements d&apos;accès, avec le responsable et le motif.
        </p>
      </div>
      <FilterChips
        pathname="/universite/historique"
        searchParams={sp}
        name="type"
        allLabel="Tout"
        options={[
          { value: "decisions", label: "Décisions" },
          { value: "donnees", label: "Imports & exports" },
          { value: "acces", label: "Accès" },
        ]}
      />
      {rows.length === 0 ? (
        <EmptyState emoji="🗂️" title="Aucune opération" text="Les opérations sensibles apparaîtront ici." />
      ) : (
        <ul className="divide-line divide-y rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)]">
          {rows.map((r) => {
            const d = (r.details ?? {}) as Record<string, unknown>;
            return (
              <li key={r.id} className="flex gap-3 p-4 text-sm" data-testid="audit-row">
                <History className="text-brand-600 mt-0.5 size-4 shrink-0" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{AUDIT_ACTIONS[r.action] ?? r.action}</p>
                  <p className="text-muted text-xs">
                    {formatDate(r.created_at, { hour: "2-digit", minute: "2-digit" })} · par {name(r.actor_id)}
                    {r.subject_id && r.subject_id !== r.actor_id && <> · étudiant : {name(r.subject_id)}</>}
                  </p>
                  {typeof d.reason === "string" && <p className="mt-1">Motif : {d.reason}</p>}
                  {typeof d.rows === "number" && <p className="mt-1">{d.rows} lignes</p>}
                  {typeof d.role === "string" && <p className="mt-1">Rôle : {d.role}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Pagination pathname="/universite/historique" searchParams={sp} page={page} hasMore={(data?.length ?? 0) > PER_PAGE} />
    </div>
  );
}
