import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DecisionForm } from "@/components/university/decision-form";
import { decideEnrollment } from "@/app/universite/actions";
import { ENROLLMENT_STATUS, VERIFICATION_METHODS } from "@/lib/university";
import { formatDate, timeAgo } from "@/lib/format";
import type { Database } from "@/lib/database.types";

export type EnrollmentRow = Database["public"]["Functions"]["university_enrollments"]["Returns"][number];

const CRITERIA: { key: string; label: string }[] = [
  { key: "student_number", label: "Matricule" },
  { key: "last_name", label: "Nom" },
  { key: "first_name", label: "Prénom" },
  { key: "birth_date", label: "Naissance" },
];

/** Résultat du rapprochement automatique : quels critères correspondent (jamais les données de la source). */
function MatchChips({ details }: { details: unknown }) {
  if (!details || typeof details !== "object") return null;
  const d = details as Record<string, unknown>;
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <span className="text-muted">Rapprochement {d.source === "api" ? "API" : "liste"} :</span>
      {CRITERIA.map(({ key, label }) => (
        <span
          key={key}
          className={
            d[key] === true
              ? "bg-mint-50 text-mint-700 rounded-full px-2 py-0.5 font-semibold"
              : d[key] === false
                ? "bg-coral-50 text-coral-600 rounded-full px-2 py-0.5 font-semibold"
                : "bg-canvas text-muted rounded-full px-2 py-0.5"
          }
        >
          {d[key] === true ? "✓" : d[key] === false ? "✗" : "–"} {label}
        </span>
      ))}
      {d.conflict === true && (
        <span className="bg-coral-50 text-coral-600 rounded-full px-2 py-0.5 font-semibold">Matricule déjà utilisé</span>
      )}
    </div>
  );
}

export function EnrollmentItem({ e, canDecide }: { e: EnrollmentRow; canDecide: boolean }) {
  const st = ENROLLMENT_STATUS[e.status];
  const decisions =
    e.status === "pending" || e.status === "manual_review"
      ? (["verify", "reject"] as const)
      : e.status === "verified"
        ? (["expire", "revoke"] as const)
        : (["reactivate"] as const);
  return (
    <li className="rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-card)]" data-testid="enrollment">
      <div className="flex items-start gap-3">
        <Avatar src={e.avatar_url} first={e.first_name} last={e.last_name} size={52} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold">
              {e.first_name} <span className="uppercase">{e.last_name}</span>
            </p>
            <Badge tone={st.tone}>{st.label}</Badge>
            {e.status === "verified" && e.card_status && e.card_status !== "active" && (
              <Badge tone="coral">Carte {e.card_status === "revoked" ? "révoquée" : "expirée"}</Badge>
            )}
          </div>
          <p className="text-muted font-mono text-xs">{e.uny_id}</p>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted text-xs">Matricule</dt>
              <dd className="font-mono font-semibold">{e.student_number}</dd>
            </div>
            <div>
              <dt className="text-muted text-xs">Naissance</dt>
              <dd className="font-semibold">{formatDate(e.birth_date)}</dd>
            </div>
            <div>
              <dt className="text-muted text-xs">Année</dt>
              <dd className="font-semibold">{e.academic_year}</dd>
            </div>
            {[e.faculty, e.department, e.program, e.study_level].some(Boolean) && (
              <div className="col-span-2 sm:col-span-3">
                <dt className="text-muted text-xs">Cursus déclaré</dt>
                <dd className="font-semibold">
                  {[e.faculty, e.department, e.program, e.study_level].filter(Boolean).join(" · ")}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <MatchChips details={e.match_details} />
        <p className="text-muted text-xs">
          Demande {timeAgo(e.created_at)}
          {e.method && <> · {VERIFICATION_METHODS[e.method]}</>}
          {e.decided_at && <> · décision le {formatDate(e.decided_at)}</>}
          {e.expires_at && e.status === "verified" && <> · valable jusqu&apos;au {formatDate(e.expires_at)}</>}
        </p>
        {e.rejection_reason && <p className="text-coral-600 text-sm">Motif : {e.rejection_reason}</p>}
        {canDecide && <DecisionForm action={decideEnrollment.bind(null, e.id)} decisions={[...decisions]} />}
      </div>
    </li>
  );
}
