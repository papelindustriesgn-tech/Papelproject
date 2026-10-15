import { Cable, FileSpreadsheet, MousePointerClick } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { getCities } from "@/lib/cities";
import { requireUniversity } from "@/lib/university";
import { formatDate } from "@/lib/format";
import { ApiRequestForm, UniversityProfileForm } from "./forms";

export const metadata = { title: "Établissement & connexion" };

const INTEGRATION_STATUS = {
  not_configured: { label: "Non raccordée", tone: "neutral" },
  testing: { label: "En test", tone: "mango" },
  active: { label: "Active", tone: "mint" },
  disabled: { label: "Désactivée", tone: "coral" },
} as const;

const ACTIONS: Record<string, string> = {
  "enrollment.verified": "Inscription confirmée",
  "enrollment.rejected": "Inscription refusée / carte révoquée",
  "enrollment.expired": "Carte expirée",
  "enrollment.manual_review": "Demande à examiner",
  "enrollment.submitted": "Nouvelle demande",
  "roster.imported": "Liste importée",
  "roster.deleted": "Liste supprimée",
  "card_template.published": "Carte publiée",
  "connector.verify": "Vérification par API",
  "integration.requested": "Raccordement API demandé",
  "integration.updated": "Connecteur modifié par Uny",
  "integration.tested": "Connecteur testé",
};

export default async function EstablishmentPage() {
  const { university } = await requireUniversity();
  const supabase = await createClient();
  const [{ data: uni }, { data: integration }, { data: logs }, cities] = await Promise.all([
    supabase
      .from("universities")
      .select("name, short_name, website, contact_email, city_id, faculties")
      .eq("id", university.id)
      .single(),
    supabase
      .from("university_integrations")
      .select("status, base_url, agreement_signed_at, last_test_at, last_test_ok")
      .eq("university_id", university.id)
      .maybeSingle(),
    supabase
      .from("audit_log")
      .select("id, action, created_at, actor_id")
      .eq("university_id", university.id)
      .neq("action", "enrollment.submitted")
      .order("created_at", { ascending: false })
      .limit(15),
    getCities(),
  ]);
  const st = INTEGRATION_STATUS[(integration?.status ?? "not_configured") as keyof typeof INTEGRATION_STATUS];

  return (
    <div className="animate-fade-up space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">{uni?.name}</h1>
        <p className="text-muted mt-1 text-sm">
          Fiche de l&apos;établissement et raccordement à votre système d&apos;information.
        </p>
      </div>

      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <h2 className="mb-4 font-bold">Fiche</h2>
        {uni && <UniversityProfileForm uni={uni} cities={cities} />}
      </section>

      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold">Vérification des inscriptions</h2>
          <Badge tone={st.tone}>API : {st.label}</Badge>
        </div>
        <ol className="space-y-3 text-sm">
          <li className="flex gap-3">
            <Cable className="text-brand-600 mt-0.5 size-5 shrink-0" aria-hidden />
            <p>
              <strong>Niveau 1 — API.</strong> Si votre scolarité dispose d&apos;un service web, Uny l&apos;interroge à chaque
              demande (HTTPS, clé stockée côté serveur Uny, journalisé). Activé uniquement après signature d&apos;un accord et
              tests.
              {integration?.agreement_signed_at && <> Accord signé le {formatDate(integration.agreement_signed_at)}.</>}
            </p>
          </li>
          <li className="flex gap-3">
            <FileSpreadsheet className="text-brand-600 mt-0.5 size-5 shrink-0" aria-hidden />
            <p>
              <strong>Niveau 2 — Liste importée.</strong> Importez périodiquement vos inscrits (Excel ou CSV) dans « Listes
              d&apos;étudiants ».
            </p>
          </li>
          <li className="flex gap-3">
            <MousePointerClick className="text-brand-600 mt-0.5 size-5 shrink-0" aria-hidden />
            <p>
              <strong>Niveau 3 — Portail.</strong> Sans API ni export, confirmez ou refusez chaque demande dans « Demandes ».
            </p>
          </li>
        </ol>
        {integration?.status !== "active" && (
          <div className="border-line mt-5 border-t pt-5">
            <h3 className="mb-3 text-sm font-bold">Demander le raccordement API</h3>
            <ApiRequestForm />
          </div>
        )}
      </section>

      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <h2 className="mb-3 font-bold">Journal d&apos;activité</h2>
        {!logs?.length ? (
          <p className="text-muted text-sm">Aucune activité pour l&apos;instant.</p>
        ) : (
          <ul className="divide-line divide-y text-sm">
            {logs.map((l) => (
              <li key={l.id} className="flex flex-wrap justify-between gap-x-3 py-2">
                <span className="min-w-0">{ACTIONS[l.action] ?? l.action}</span>
                <span className="text-muted text-xs">
                  {formatDate(l.created_at, { month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
