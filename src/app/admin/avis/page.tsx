import { Download, Phone, Mail } from "lucide-react";
import { StatCard } from "@/components/admin/stat-card";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { labelOf, SURVEY_MODULES, SURVEY_SOURCES, SURVEY_WOULD_PAY } from "@/lib/survey";
import { getSurveyResponses, universityOf } from "@/lib/survey-results";

export const metadata = { title: "Avis des inscrits" };

function Bars({ title, rows, total }: { title: string; rows: { label: string; count: number }[]; total: number }) {
  return (
    <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
      <h2 className="mb-3 font-bold">{title}</h2>
      <ul className="space-y-2.5">
        {rows.map((r) => {
          const pct = total ? Math.round((r.count / total) * 100) : 0;
          return (
            <li key={r.label}>
              <div className="flex justify-between gap-3 text-sm">
                <span className="min-w-0 truncate">{r.label}</span>
                <span className="text-muted shrink-0 tabular-nums">
                  {r.count} · {pct} %
                </span>
              </div>
              <div className="bg-canvas mt-1 h-2 overflow-hidden rounded-full">
                <div className="bg-brand-500 h-full rounded-full" style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default async function SurveyResultsPage() {
  await requireAdmin(); // le layout et la page sont rendus en parallèle
  const supabase = await createClient();
  const [responses, { count: users }] = await Promise.all([
    getSurveyResponses(),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_test_account", false),
  ]);
  const n = responses.length;
  const count = (pred: (r: (typeof responses)[number]) => boolean) => responses.filter(pred).length;

  const avg = n ? (responses.reduce((s, r) => s + r.rating, 0) / n).toFixed(1).replace(".", ",") : "—";
  const promoters = count((r) => r.nps >= 9);
  const detractors = count((r) => r.nps <= 6);
  const nps = n ? Math.round(((promoters - detractors) / n) * 100) : null;
  const rate = users ? Math.round((n / users) * 100) : 0;

  const byOption = (list: readonly { value: string; label: string }[], get: (r: (typeof responses)[number]) => string[]) =>
    list.map((o) => ({ label: o.label, count: count((r) => get(r).includes(o.value)) })).sort((a, b) => b.count - a.count);

  const comments = responses.filter((r) => r.missing || r.partners);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Avis des inscrits</h1>
          <p className="text-muted text-sm">
            Enquête proposée à chaque inscrit (bandeau sur l&apos;accueil + notification). Comptes de test exclus.
          </p>
        </div>
        {n > 0 && (
          <a
            href="/admin/avis/export"
            download
            className="bg-brand-600 hover:bg-brand-700 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold text-white sm:w-auto"
          >
            <Download className="size-4" aria-hidden /> Exporter (Excel / CSV)
          </a>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Réponses" value={n} hint={`${rate} % des ${users ?? 0} inscrits`} tone="brand" />
        <StatCard label="Note moyenne" value={n ? `${avg} / 5` : "—"} />
        <StatCard
          label="NPS (recommandation)"
          value={nps === null ? "—" : `${nps > 0 ? "+" : ""}${nps}`}
          hint={n ? `${promoters} promoteurs · ${detractors} détracteurs` : "de −100 à +100"}
          tone="mint"
        />
        <StatCard label="Acceptent d'être contactés" value={count((r) => r.contact_ok)} tone="mango" />
      </div>

      {n === 0 ? (
        <p className="text-muted rounded-[var(--radius-card)] bg-white p-8 text-center shadow-[var(--shadow-card)]">
          Aucune réponse pour l&apos;instant. Les inscrits voient l&apos;invitation sur leur page d&apos;accueil et dans leurs
          notifications ; tu peux aussi partager le lien <strong>/avis</strong> sur WhatsApp.
        </p>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
            <Bars title="Services les plus attendus" rows={byOption(SURVEY_MODULES, (r) => r.modules)} total={n} />
            <Bars title="Comment ils ont connu Uny" rows={byOption(SURVEY_SOURCES, (r) => [r.source])} total={n} />
            <Bars
              title="Paieraient un abonnement"
              rows={SURVEY_WOULD_PAY.map((o) => ({ label: o.label, count: count((r) => r.would_pay === o.value) }))}
              total={n}
            />
            <Bars
              title="Notes"
              rows={[5, 4, 3, 2, 1].map((s) => ({ label: "★".repeat(s), count: count((r) => r.rating === s) }))}
              total={n}
            />
          </div>

          <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
            <h2 className="font-bold">Suggestions et enseignes demandées ({comments.length})</h2>
            <ul className="divide-line mt-3 divide-y">
              {comments.map((r) => (
                <li key={r.user_id} className="py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-semibold">
                      {r.profile.first_name} {r.profile.last_name}
                    </span>
                    <span className="text-muted">
                      {universityOf(r)} · {"★".repeat(r.rating)} · NPS {r.nps}
                    </span>
                    {r.contact_ok && (
                      <span className="text-mint-700 ml-auto flex flex-wrap gap-3 text-xs font-semibold">
                        {r.profile.phone && (
                          <a href={`tel:${r.profile.phone}`} className="flex items-center gap-1">
                            <Phone className="size-3.5" aria-hidden /> {r.profile.phone}
                          </a>
                        )}
                        {r.profile.email && (
                          <a href={`mailto:${r.profile.email}`} className="flex min-w-0 items-center gap-1 break-all">
                            <Mail className="size-3.5 shrink-0" aria-hidden /> {r.profile.email}
                          </a>
                        )}
                      </span>
                    )}
                  </div>
                  {r.missing && (
                    <p className="mt-1 break-words whitespace-pre-line">
                      <span className="text-muted">Manque : </span>
                      {r.missing}
                    </p>
                  )}
                  {r.partners && (
                    <p className="mt-1 break-words whitespace-pre-line">
                      <span className="text-muted">Enseignes : </span>
                      {r.partners}
                    </p>
                  )}
                  <p className="text-muted mt-1 text-xs">
                    {labelOf(SURVEY_SOURCES, r.source)} ·{" "}
                    {new Date(r.updated_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
