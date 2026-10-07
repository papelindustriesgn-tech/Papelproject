import type { Metadata } from "next";
import { BadgeCheck, Clock3, FileCheck2, GraduationCap, Landmark } from "lucide-react";
import { BackLink } from "@/components/ui/back-link";
import { PageTitle } from "@/components/ui/section-header";
import { Badge, VerificationBadge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/field";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DOCUMENT_TYPES } from "@/lib/constants";
import { formatDate, timeAgo } from "@/lib/format";
import { VerificationForm } from "./verification-form";
import { BacForm, EnrollmentForm } from "./enrollment-forms";
import { ENROLLMENT_STATUS, VERIFICATION_METHODS } from "@/lib/university";
import { BAC_METHODS, officialBacProvider } from "@/lib/verification/bac";

export const metadata: Metadata = { title: "Vérification étudiante" };

export default async function VerificationPage() {
  const p = await requireProfile();
  const supabase = await createClient();
  const [{ data: history }, { data: enrollments }, { data: partners }, { data: bac }] = await Promise.all([
    supabase
      .from("student_verifications")
      .select("id, document_type, status, rejection_reason, created_at, reviewed_at")
      .eq("user_id", p.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("student_enrollments")
      .select(
        "id, academic_year, status, method, student_number, rejection_reason, created_at, decided_at, university:universities(name)",
      )
      .eq("user_id", p.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("universities").select("id, name, faculties").eq("partner_status", "partner").order("name"),
    supabase
      .from("bac_verifications")
      .select("id, exam_year, candidate_ref, status, method, rejection_reason, reviewed_at, created_at")
      .eq("user_id", p.id)
      .order("exam_year", { ascending: false }),
  ]);
  const pending = history?.find((h) => h.status === "pending");
  const current = enrollments?.[0];
  const enrollmentWaiting = current && (current.status === "pending" || current.status === "manual_review");
  const partnerUniversities = partners ?? [];
  const isPartnerUni = partnerUniversities.some((u) => u.id === p.university_id);
  const bacWaiting = bac?.some((b) => b.status === "manual_review" || b.status === "pending");

  return (
    <div className="animate-fade-up mx-auto max-w-2xl space-y-5">
      <div>
        <BackLink href="/profil" label="Profil" />
        <PageTitle title="Vérification étudiante" subtitle="Prouve ton statut pour débloquer toutes les réductions." />
      </div>

      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold">Ton statut</h2>
          <VerificationBadge status={p.verification_status} />
        </div>
        {p.verification_status === "verified" ? (
          <div className="bg-mint-50 text-mint-700 mt-4 flex items-start gap-3 rounded-2xl p-4 text-sm">
            <BadgeCheck className="size-6 shrink-0" aria-hidden />
            <p>
              Tu es <strong>étudiant vérifié</strong> depuis le {formatDate(p.verified_at)}. Ta carte Uny affiche ce statut et tu
              as accès à tous les avantages.
            </p>
          </div>
        ) : enrollmentWaiting ? (
          <div className="bg-mango-50 text-mango-700 mt-4 flex items-start gap-3 rounded-2xl p-4 text-sm">
            <Landmark className="size-6 shrink-0" aria-hidden />
            <p>
              Ta demande a été transmise à <strong>{current.university?.name}</strong> {timeAgo(current.created_at)} (matricule{" "}
              {current.student_number}). Tu recevras une notification dès que l&apos;établissement aura répondu.
            </p>
          </div>
        ) : pending ? (
          <div className="bg-mango-50 text-mango-700 mt-4 flex items-start gap-3 rounded-2xl p-4 text-sm">
            <Clock3 className="size-6 shrink-0" aria-hidden />
            <p>
              Ton justificatif ({DOCUMENT_TYPES[pending.document_type].toLowerCase()}) a été envoyé {timeAgo(pending.created_at)}.
              L&apos;équipe Uny le vérifie en général sous 48 h. Tu recevras une notification et un email.
            </p>
          </div>
        ) : (
          <ol className="text-muted mt-4 space-y-2 text-sm">
            <li>1. Choisis le type de justificatif.</li>
            <li>2. Prends-le en photo (lisible, sans reflet) ou ajoute un PDF.</li>
            <li>3. L&apos;équipe Uny valide ton statut, généralement sous 48 h.</li>
          </ol>
        )}
      </section>

      {p.verification_status !== "verified" && !enrollmentWaiting && partnerUniversities.length > 0 && (
        <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
          <h2 className="mb-1 flex items-center gap-2 font-bold">
            <GraduationCap className="text-brand-600 size-5" aria-hidden /> Confirmer mon inscription
          </h2>
          <p className="text-muted mb-4 text-sm">
            {isPartnerUni
              ? "Ton établissement est partenaire d'Uny : il confirme directement ton inscription, souvent instantanément."
              : "Ces établissements confirment directement les inscriptions sur Uny. Le tien n'y est pas ? Envoie un justificatif ci-dessous."}
          </p>
          {current?.status === "rejected" && current.rejection_reason && (
            <div className="mb-4">
              <FormMessage>Demande précédente refusée : {current.rejection_reason}</FormMessage>
            </div>
          )}
          <EnrollmentForm
            universities={partnerUniversities}
            defaultUniversity={isPartnerUni ? p.university_id : null}
            defaults={{ field_of_study: p.field_of_study, study_level: p.study_level }}
          />
        </section>
      )}

      {p.verification_status !== "verified" && !pending && !enrollmentWaiting && (
        <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
          <h2 className="mb-4 font-bold">
            {partnerUniversities.length ? "Ou envoyer un justificatif à l'équipe Uny" : "Envoyer un justificatif"}
          </h2>
          <VerificationForm userId={p.id} />
          <p className="text-muted mt-4 text-xs">
            🔒 Ton document est stocké de manière privée : seuls toi et l&apos;équipe de vérification Uny pouvez y accéder. Il
            n&apos;est jamais visible par les partenaires.
          </p>
        </section>
      )}

      {p.verification_status === "verified" && (
        <LinkButton href="/carte" size="lg" className="w-full">
          Voir ma carte
        </LinkButton>
      )}

      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <h2 className="mb-1 font-bold">Baccalauréat</h2>
        <p className="text-muted mb-4 text-sm">
          Facultatif. Faire vérifier ton BAC renforce ton identité Uny (utile pour certains partenaires, bourses et concours).
          {!officialBacProvider.isConnected() &&
            " La connexion aux résultats officiels n'est pas encore disponible : ton relevé est contrôlé par l'équipe Uny puis supprimé."}
        </p>
        {bac && bac.length > 0 && (
          <ul className="divide-line mb-4 divide-y text-sm">
            {bac.map((b) => (
              <li key={b.id} className="flex items-start justify-between gap-3 py-2">
                <div>
                  <p className="font-semibold">
                    BAC {b.exam_year} · candidat {b.candidate_ref}
                  </p>
                  <p className="text-muted text-xs">
                    {BAC_METHODS[b.method as keyof typeof BAC_METHODS]}
                    {b.reviewed_at && <> · {formatDate(b.reviewed_at)}</>}
                  </p>
                  {b.rejection_reason && <p className="text-coral-600 mt-1">Motif : {b.rejection_reason}</p>}
                </div>
                <Badge tone={ENROLLMENT_STATUS[b.status].tone}>
                  {b.status === "verified"
                    ? "Vérifié"
                    : b.status === "manual_review"
                      ? "En cours"
                      : ENROLLMENT_STATUS[b.status].label}
                </Badge>
              </li>
            ))}
          </ul>
        )}
        {bacWaiting ? (
          <p className="bg-mango-50 text-mango-700 rounded-2xl p-3 text-sm">
            Ton relevé est en cours de vérification par l&apos;équipe Uny.
          </p>
        ) : (
          !bac?.some((b) => b.status === "verified") && <BacForm userId={p.id} />
        )}
      </section>

      {enrollments && enrollments.length > 0 && (
        <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
          <h2 className="mb-3 font-bold">Mes inscriptions</h2>
          <ul className="divide-line divide-y">
            {enrollments.map((e) => (
              <li key={e.id} className="flex items-start gap-3 py-3 text-sm">
                <Landmark className="text-muted mt-0.5 size-5 shrink-0" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {e.university?.name} · {e.academic_year}
                  </p>
                  <p className="text-muted">
                    Matricule {e.student_number}
                    {e.method && <> · {VERIFICATION_METHODS[e.method]}</>}
                  </p>
                  {e.rejection_reason && <p className="text-coral-600 mt-1">Motif : {e.rejection_reason}</p>}
                </div>
                <Badge tone={ENROLLMENT_STATUS[e.status].tone}>{ENROLLMENT_STATUS[e.status].label}</Badge>
              </li>
            ))}
          </ul>
        </section>
      )}

      {history && history.length > 0 && (
        <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
          <h2 className="mb-3 font-bold">Historique</h2>
          <ul className="divide-line divide-y">
            {history.map((h) => (
              <li key={h.id} className="flex items-start gap-3 py-3 text-sm">
                <FileCheck2 className="text-muted mt-0.5 size-5 shrink-0" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{DOCUMENT_TYPES[h.document_type]}</p>
                  <p className="text-muted">Envoyé le {formatDate(h.created_at)}</p>
                  {h.rejection_reason && <p className="text-coral-600 mt-1">Motif : {h.rejection_reason}</p>}
                </div>
                <Badge tone={h.status === "approved" ? "mint" : h.status === "rejected" ? "coral" : "mango"}>
                  {h.status === "approved" ? "Validé" : h.status === "rejected" ? "Refusé" : "En cours"}
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
