import { notFound } from "next/navigation";
import { History } from "lucide-react";
import { BackLink } from "@/components/ui/back-link";
import { Badge } from "@/components/ui/badge";
import { DecisionForm } from "@/components/university/decision-form";
import { RestrictedNotice } from "@/components/university/restricted-notice";
import { decideEnrollment } from "@/app/universite/actions";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AUDIT_ACTIONS, ENROLLMENT_STATUS, VERIFICATION_METHODS, requireUniversity, universityCan } from "@/lib/university";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Fiche étudiant" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Fiche d'un étudiant pour l'établissement : demandes successives et historique des décisions.
 * Lecture sous RLS (rôle « read » de l'établissement courant) : la demande d'un autre établissement est introuvable.
 */
export default async function StudentFilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { university } = await requireUniversity();
  if (!universityCan(university, "read")) return <RestrictedNotice university={university} title="Fiche étudiant" />;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const { data: e } = await supabase
    .from("student_enrollments")
    .select("*")
    .eq("id", id)
    .eq("university_id", university.id)
    .maybeSingle();
  if (!e) notFound();

  const canAudit = universityCan(university, "audit");
  const [{ data: others }, { data: audit }] = await Promise.all([
    supabase
      .from("student_enrollments")
      .select("id, academic_year, status, created_at")
      .eq("university_id", university.id)
      .eq("user_id", e.user_id)
      .order("created_at", { ascending: false })
      .limit(20),
    canAudit
      ? supabase
          .from("audit_log")
          .select("id, action, created_at, actor_id, details")
          .eq("university_id", university.id)
          .eq("subject_id", e.user_id)
          .order("created_at", { ascending: false })
          .limit(50)
      : Promise.resolve({ data: [] as { id: number; action: string; created_at: string; actor_id: string | null; details: unknown }[] }),
  ]);

  // Noms des responsables (lecture serveur, après le contrôle d'accès ci-dessus)
  const actorIds = [...new Set((audit ?? []).map((a) => a.actor_id).filter((v): v is string => !!v))];
  const { data: actors } = actorIds.length
    ? await createAdminClient().from("profiles").select("id, first_name, last_name, role").in("id", actorIds)
    : { data: [] };
  const actorName = (aid: string | null) => {
    if (!aid) return "Système (vérification automatique)";
    const p = actors?.find((x) => x.id === aid);
    return p ? `${p.first_name} ${p.last_name}${p.role === "admin" ? " (Uny)" : ""}` : "Compte supprimé";
  };

  const st = ENROLLMENT_STATUS[e.status];
  const decisions =
    e.status === "pending" || e.status === "manual_review"
      ? (["verify", "incomplete", "reject"] as const)
      : e.status === "verified"
        ? (["expire", "revoke"] as const)
        : e.status === "incomplete"
          ? ([] as const)
          : (["reactivate"] as const);

  return (
    <div className="animate-fade-up space-y-5">
      <BackLink href="/universite/etudiants" label="Étudiants & cartes" />
      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-extrabold">
            {e.claimed_first_name} <span className="uppercase">{e.claimed_last_name}</span>
          </h1>
          <Badge tone={st.tone}>{st.label}</Badge>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted text-xs">Matricule</dt>
            <dd className="font-mono font-semibold">{e.student_number}</dd>
          </div>
          <div>
            <dt className="text-muted text-xs">Naissance (déclarée)</dt>
            <dd className="font-semibold">{formatDate(e.claimed_birth_date)}</dd>
          </div>
          <div>
            <dt className="text-muted text-xs">Année</dt>
            <dd className="font-semibold">{e.academic_year}</dd>
          </div>
          <div>
            <dt className="text-muted text-xs">Demande</dt>
            <dd className="font-semibold">{formatDate(e.created_at)}</dd>
          </div>
          <div>
            <dt className="text-muted text-xs">Méthode</dt>
            <dd className="font-semibold">{e.method ? VERIFICATION_METHODS[e.method] : "—"}</dd>
          </div>
          <div>
            <dt className="text-muted text-xs">Valable jusqu&apos;au</dt>
            <dd className="font-semibold">{e.status === "verified" ? formatDate(e.expires_at) : "—"}</dd>
          </div>
          {[e.faculty, e.department, e.program, e.study_level].some(Boolean) && (
            <div className="col-span-2 sm:col-span-3">
              <dt className="text-muted text-xs">Cursus déclaré</dt>
              <dd className="font-semibold">{[e.faculty, e.department, e.program, e.study_level].filter(Boolean).join(" · ")}</dd>
            </div>
          )}
        </dl>
        {e.rejection_reason && (
          <p className="text-coral-600 mt-3 text-sm">
            {e.status === "incomplete" ? "À compléter" : "Motif"} : {e.rejection_reason}
          </p>
        )}
        {universityCan(university, "decide") && decisions.length > 0 && (
          <div className="mt-4">
            <DecisionForm action={decideEnrollment.bind(null, e.id)} decisions={[...decisions]} />
          </div>
        )}
      </section>

      {(others?.length ?? 0) > 1 && (
        <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
          <h2 className="mb-3 font-bold">Demandes de cet étudiant</h2>
          <ul className="divide-line divide-y text-sm">
            {others!.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 py-2">
                <span>
                  {o.academic_year} · {formatDate(o.created_at)}
                </span>
                <Badge tone={ENROLLMENT_STATUS[o.status].tone}>{ENROLLMENT_STATUS[o.status].label}</Badge>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <h2 className="mb-3 font-bold">Historique des décisions</h2>
        {!canAudit ? (
          <p className="text-muted text-sm">L&apos;historique est réservé aux rôles administration et validation.</p>
        ) : !audit?.length ? (
          <p className="text-muted text-sm">Aucune décision enregistrée.</p>
        ) : (
          <ul className="space-y-3">
            {audit.map((a) => {
              const d = (a.details ?? {}) as Record<string, unknown>;
              return (
                <li key={a.id} className="flex gap-3 text-sm" data-testid="file-audit-row">
                  <History className="text-brand-600 mt-0.5 size-4 shrink-0" aria-hidden />
                  <div>
                    <p className="font-semibold">{AUDIT_ACTIONS[a.action] ?? a.action}</p>
                    <p className="text-muted text-xs">
                      {formatDate(a.created_at, { hour: "2-digit", minute: "2-digit" })} · par {actorName(a.actor_id)}
                    </p>
                    {typeof d.reason === "string" && <p className="mt-0.5">Motif : {d.reason}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
