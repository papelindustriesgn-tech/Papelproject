import { Badge } from "@/components/ui/badge";
import { FilterChips } from "@/components/ui/filters";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMetrics, METRICS, UNAVAILABLE_METRICS } from "@/lib/metrics";
import { formatDate } from "@/lib/format";
import { param, type SearchParams } from "@/lib/url";
import { AlertActions, RunChecksButton } from "./forms";

export const metadata = { title: "Pilotage" };

const SEVERITY = {
  critical: { label: "Critique", tone: "coral" },
  high: { label: "Élevée", tone: "coral" },
  medium: { label: "Moyenne", tone: "mango" },
  low: { label: "Faible", tone: "neutral" },
} as const;
const JOB_STATUS = {
  running: { label: "En cours", tone: "brand" },
  succeeded: { label: "Réussie", tone: "mint" },
  failed: { label: "Échec", tone: "coral" },
  dead: { label: "Échec définitif", tone: "coral" },
  skipped: { label: "Ignorée", tone: "neutral" },
} as const;
const JOBS = ["sauvegarde", "questionnaires"] as const;

/** Santé de la plateforme : tâches, alertes déterministes, indicateurs calculés (dictionnaire inclus). */
export default async function PilotagePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const sp = await searchParams;
  const days = param(sp, "jours") === "30" ? 30 : 7;
  const supabase = await createClient();
  const [metrics, { data: alerts }, { data: runs }] = await Promise.all([
    getMetrics(days),
    supabase
      .from("ops_alerts")
      .select("id, rule, severity, title, details, status, occurrences, first_seen, last_seen, owner_id")
      .neq("status", "resolved")
      .order("last_seen", { ascending: false })
      .limit(50),
    supabase
      .from("ops_job_runs")
      .select("id, job, status, attempts, max_attempts, started_at, finished_at, error")
      .order("started_at", { ascending: false })
      .limit(30),
  ]);
  const lastRun = (job: string) => runs?.find((r) => r.job === job);
  const rank = { critical: 0, high: 1, medium: 2, low: 3 } as const;
  const sorted = [...(alerts ?? [])].sort((a, b) => rank[a.severity as keyof typeof rank] - rank[b.severity as keyof typeof rank]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Pilotage</h1>
        <p className="text-muted text-sm">
          Alertes issues de règles fixes (pas de l&apos;IA), tâches automatiques et indicateurs calculés en base.
        </p>
      </div>

      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <h2 className="mb-3 font-bold">Tâches automatiques</h2>
        <ul className="divide-line divide-y text-sm">
          {JOBS.map((job) => {
            const r = lastRun(job);
            const st = r ? JOB_STATUS[r.status as keyof typeof JOB_STATUS] : null;
            return (
              <li key={job} className="flex flex-wrap items-center justify-between gap-2 py-2" data-testid="job-row">
                <span className="font-semibold capitalize">{job}</span>
                {r && st ? (
                  <span className="flex items-center gap-2">
                    <Badge tone={st.tone}>{st.label}</Badge>
                    <span className="text-muted text-xs">
                      {formatDate(r.started_at, { hour: "2-digit", minute: "2-digit" })} · tentative {r.attempts}/{r.max_attempts}
                    </span>
                  </span>
                ) : (
                  <span className="text-muted text-xs">Aucune exécution enregistrée</span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <h2 className="font-bold">Alertes ouvertes ({sorted.length})</h2>
          <RunChecksButton />
        </div>
        {sorted.length === 0 ? (
          <p className="text-muted text-sm">Aucune alerte ouverte.</p>
        ) : (
          <ul className="space-y-4">
            {sorted.map((a) => {
              const sev = SEVERITY[a.severity as keyof typeof SEVERITY];
              return (
                <li key={a.id} className="border-line rounded-xl border p-3 text-sm" data-testid="alert-row">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={sev.tone}>{sev.label}</Badge>
                    <span className="font-semibold">{a.title}</span>
                    {a.status === "acknowledged" && <Badge tone="brand">Prise en charge</Badge>}
                  </div>
                  <p className="text-muted mt-1 text-xs">
                    Règle {a.rule} · {a.occurrences} occurrence(s) · depuis le{" "}
                    {formatDate(a.first_seen, { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <pre className="bg-canvas mt-2 overflow-x-auto rounded-lg p-2 text-xs">{JSON.stringify(a.details)}</pre>
                  <AlertActions alertId={a.id} acknowledged={a.status === "acknowledged"} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold">Indicateurs</h2>
          <FilterChips
            pathname="/admin/pilotage"
            searchParams={sp}
            name="jours"
            allLabel="7 jours"
            options={[{ value: "30", label: "30 jours" }]}
          />
        </div>
        <p className="text-muted mb-3 text-xs">
          Période glissante du {formatDate(metrics.period_start, { hour: "2-digit", minute: "2-digit" })} au{" "}
          {formatDate(metrics.period_end, { hour: "2-digit", minute: "2-digit" })} ({metrics.timezone}) · calculé le{" "}
          {formatDate(metrics.computed_at, { hour: "2-digit", minute: "2-digit" })} · comptes de test et démonstrations exclus.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-muted text-xs">
              <tr>
                <th className="py-2 pr-3">Indicateur</th>
                <th className="py-2 pr-3 text-right">Valeur</th>
                <th className="py-2 pr-3">Définition · source · formule</th>
              </tr>
            </thead>
            <tbody className="divide-line divide-y">
              {METRICS.map((m) => (
                <tr key={m.key} data-testid="metric-row">
                  <td className="py-2 pr-3 font-semibold">
                    {m.label}
                    <span className="text-muted block text-xs font-normal">{m.window}</span>
                  </td>
                  <td className="py-2 pr-3 text-right font-bold tabular-nums">
                    {metrics[m.key] == null ? "Non disponible" : Number(metrics[m.key]).toLocaleString("fr-FR")}
                  </td>
                  <td className="text-muted py-2 pr-3 text-xs">
                    {m.definition} · <code>{m.source}</code> · {m.formula} · exclusions : {m.exclusions}
                  </td>
                </tr>
              ))}
              {UNAVAILABLE_METRICS.map((u) => (
                <tr key={u.label} data-testid="metric-unavailable">
                  <td className="py-2 pr-3 font-semibold">{u.label}</td>
                  <td className="text-muted py-2 pr-3 text-right">Non disponible</td>
                  <td className="text-muted py-2 pr-3 text-xs">{u.why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
