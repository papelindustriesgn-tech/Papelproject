import type { Metadata } from "next";
import { BadgeCheck, Clock3, FileCheck2 } from "lucide-react";
import { BackLink } from "@/components/ui/back-link";
import { PageTitle } from "@/components/ui/section-header";
import { Badge, VerificationBadge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DOCUMENT_TYPES } from "@/lib/constants";
import { formatDate, timeAgo } from "@/lib/format";
import { VerificationForm } from "./verification-form";

export const metadata: Metadata = { title: "Vérification étudiante" };

export default async function VerificationPage() {
  const p = await requireProfile();
  const supabase = await createClient();
  const { data: history } = await supabase
    .from("student_verifications")
    .select("id, document_type, status, rejection_reason, created_at, reviewed_at")
    .eq("user_id", p.id)
    .order("created_at", { ascending: false })
    .limit(10);
  const pending = history?.find((h) => h.status === "pending");

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

      {p.verification_status !== "verified" && !pending && (
        <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
          <h2 className="mb-4 font-bold">Envoyer un justificatif</h2>
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
