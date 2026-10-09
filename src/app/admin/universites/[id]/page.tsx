import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { GrantAccessForm } from "@/components/admin/partner-access";
import { UnyCard } from "@/components/card/uny-card";
import { Badge } from "@/components/ui/badge";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { FormMessage } from "@/components/ui/field";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { getUniversityCardConfig, PARTNER_STATUS } from "@/lib/university";
import {
  disableIntegration,
  grantUniversityAccess,
  removeUniversityMember,
  saveIntegration,
  setUniversityStatus,
  testIntegration,
} from "../../university-actions";
import { IntegrationForm } from "../forms";

export const metadata = { title: "Université" };

export default async function UniversityAdmin({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const supabase = await createClient();
  const [{ data: uni }, { data: members }, { data: integration }, { data: imports }, { data: stats }, card] = await Promise.all([
    supabase.from("universities").select("*, city:cities(name)").eq("id", id).maybeSingle(),
    supabase
      .from("university_members")
      .select("user_id, created_at, user:profiles(first_name, last_name, email, role)")
      .eq("university_id", id),
    supabase.from("university_integrations").select("*").eq("university_id", id).maybeSingle(),
    supabase
      .from("university_imports")
      .select("id, academic_year, file_name, row_count, matched_count, created_at")
      .eq("university_id", id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.rpc("university_stats", { p_university: id }),
    getUniversityCardConfig(id, true),
  ]);
  if (!uni) notFound();
  const st = PARTNER_STATUS[uni.partner_status as keyof typeof PARTNER_STATUS];
  const s = stats as { pending: number; manual_review: number; verified: number; cards_active: number } | null;

  const statusButton = (to: keyof typeof PARTNER_STATUS, label: string, danger = false) => (
    <form action={setUniversityStatus.bind(null, id, to)}>
      <ConfirmButton
        message={`${label} : confirmer ?`}
        className={
          danger
            ? "text-coral-600 hover:bg-coral-50 h-9 rounded-2xl px-4 text-sm font-semibold"
            : "bg-brand-600 hover:bg-brand-700 h-9 rounded-2xl px-4 text-sm font-semibold text-white"
        }
      >
        {label}
      </ConfirmButton>
    </form>
  );

  return (
    <div className="space-y-5">
      <Link href="/admin/universites" className="text-brand-600 inline-flex items-center gap-1 text-sm font-semibold">
        <ArrowLeft className="size-4" /> Universités
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{uni.name}</h1>
          <p className="text-muted text-sm">
            {uni.short_name ?? "—"} · {uni.city?.name ?? "—"} · {uni.slug}
            {uni.approved_at && <> · partenaire depuis le {formatDate(uni.approved_at)}</>}
          </p>
        </div>
        <Badge tone={st.tone}>{st.label}</Badge>
      </div>

      <section className="flex flex-wrap gap-2 rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-card)]">
        {uni.partner_status !== "partner" && statusButton("partner", "Approuver comme partenaire")}
        {uni.partner_status === "listed" && statusButton("pending", "Ouvrir le portail (en attente)")}
        {uni.partner_status === "partner" && statusButton("suspended", "Suspendre le partenariat", true)}
        {uni.partner_status !== "listed" && statusButton("listed", "Repasser en simple référencement", true)}
        {s && (
          <p className="text-muted ml-auto self-center text-sm">
            {s.verified} inscriptions confirmées · {s.cards_active} cartes actives · {s.pending + s.manual_review} à traiter
          </p>
        )}
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
          <h2 className="mb-3 font-bold">Administrateurs du portail</h2>
          {members && members.length > 0 ? (
            <ul className="divide-line mb-4 divide-y text-sm">
              {members.map((m) => (
                <li key={m.user_id} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">
                      {m.user?.first_name} {m.user?.last_name}
                    </span>
                    <span className="text-muted block truncate text-xs">{m.user?.email}</span>
                  </span>
                  <form action={removeUniversityMember.bind(null, id, m.user_id)}>
                    <ConfirmButton
                      message="Retirer l'accès de cette personne ?"
                      className="text-coral-600 hover:bg-coral-50 h-8 rounded-lg px-2 text-xs font-semibold"
                    >
                      Retirer
                    </ConfirmButton>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted mb-4 text-sm">Aucun compte. Ajoute le responsable de la scolarité.</p>
          )}
          <GrantAccessForm action={grantUniversityAccess.bind(null, id)} submitLabel="Donner l'accès au portail université" />
        </section>

        <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-bold">Carte de l&apos;université</h2>
            <Link href={`/admin/universites/${id}/carte`} className="text-brand-600 text-sm font-semibold">
              Configurer →
            </Link>
          </div>
          {card ? (
            <UnyCard
              sample
              data={{
                firstName: "Aïssatou",
                lastName: "Bah",
                photoUrl: null,
                university: uni.name,
                fieldOfStudy: null,
                unyId: "UNY-GN-2026-7K3QXN",
                academicYear: "2026-2027",
                status: "verified",
                countryCode: "GN",
                branding: card.branding,
                template: card.template,
                details: {
                  faculty: "Faculté des Sciences",
                  program: "Licence Informatique",
                  study_level: "Licence 2",
                  student_number: "2024-INF-0457",
                  academic_year: "2026-2027",
                },
              }}
            />
          ) : (
            <p className="text-muted text-sm">Carte Uny standard (aucune personnalisation).</p>
          )}
        </section>
      </div>

      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold">Connecteur API (niveau 1)</h2>
          {integration?.last_test_at && (
            <Badge tone={integration.last_test_ok ? "mint" : "coral"}>
              Test du {formatDate(integration.last_test_at)} : {integration.last_test_ok ? "OK" : "échec"}
            </Badge>
          )}
        </div>
        <p className="text-muted mb-4 text-sm">
          À activer uniquement avec un accord signé et un accès technique réel. La clé est stockée dans les variables
          d&apos;environnement Vercel (jamais dans la base ni dans l&apos;application). Les appels sont en HTTPS, limités à 8 s,
          journalisés, et désactivables à tout moment.
        </p>
        {integration?.last_test_message && (
          <div className="mb-4">
            <FormMessage type={integration.last_test_ok ? "success" : "error"}>{integration.last_test_message}</FormMessage>
          </div>
        )}
        <IntegrationForm action={saveIntegration.bind(null, id)} test={testIntegration.bind(null, id)} initial={integration} />
        {integration?.status === "active" && (
          <form action={disableIntegration.bind(null, id)} className="mt-3">
            <ConfirmButton
              message="Désactiver immédiatement le connecteur ?"
              className="text-coral-600 hover:bg-coral-50 h-9 w-full rounded-2xl text-sm font-semibold"
            >
              Désactiver l&apos;intégration
            </ConfirmButton>
          </form>
        )}
      </section>

      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <h2 className="mb-3 font-bold">Imports (niveau 2)</h2>
        {imports?.length ? (
          <ul className="divide-line divide-y text-sm">
            {imports.map((i) => (
              <li key={i.id} className="flex justify-between gap-3 py-2">
                <span className="truncate">
                  {i.file_name} · {i.academic_year} · {i.row_count} étudiants · {i.matched_count} confirmations
                </span>
                <span className="text-muted shrink-0">{formatDate(i.created_at)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted text-sm">Aucune liste importée. L&apos;université importe ses listes depuis son portail.</p>
        )}
      </section>
    </div>
  );
}
