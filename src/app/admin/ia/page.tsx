import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { aiConfigured } from "@/lib/ai/client";
import { formatDate } from "@/lib/format";
import { AnswerForm, ApprovalForm, ConfigForm, ReconcileForm, ReportForm, RetryNotificationForm } from "./forms";

export const metadata = { title: "Centre IA" };

type AgentState = { label: string; tone: "mint" | "neutral" | "mango" | "coral" };

/**
 * Centre de pilotage IA : état réel de chaque agent (jamais « actif » si l'intégration ne fonctionne pas),
 * budgets, exécutions, approbations, rapports et conversations transférées à l'équipe.
 */
export default async function AiCenterPage() {
  await requireAdmin();
  const supabase = await createClient();
  const monthStart = new Date(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1).toISOString();
  const [{ data: agents }, { data: setting }, { data: runs }, { data: approvals }, { data: reports }, { data: handoffs }] =
    await Promise.all([
      supabase.from("ai_agents").select("*").order("id"),
      supabase.rpc("ops_metrics", { p_days: 1 }),
      supabase
        .from("ai_runs")
        .select("id, agent_id, status, refusal, model, input_tokens, output_tokens, cost_usd, estimated_cost_usd, error, created_at")
        .order("created_at", { ascending: false })
        .limit(40),
      supabase.from("ai_approvals").select("id, agent_id, action, params, status, expires_at, created_at").eq("status", "pending").limit(20),
      supabase.from("ai_reports").select("id, agent_id, period_days, alert_id, created_at").order("created_at", { ascending: false }).limit(20),
      supabase
        .from("ai_conversations")
        .select("id, status, handoff_reason, handed_off_at, updated_at, answered_at, notified_at, notify_error, messages:ai_messages(role, content, id)")
        .not("handed_off_at", "is", null)
        .or("status.eq.handed_off,notify_error.not.is.null,and(status.eq.answered,notified_at.is.null)")
        .order("updated_at", { ascending: true })
        .limit(30),
    ]);
  const { data: global } = await supabase.from("platform_settings").select("value").eq("key", "ai").maybeSingle();
  const g = (global?.value ?? { enabled: false, monthly_budget_usd: 0 }) as { enabled: boolean; monthly_budget_usd: number };
  const keyOk = aiConfigured();
  const m = (setting ?? {}) as Record<string, number | undefined>;
  const usd = (k: string) => Number(m[k] ?? 0).toFixed(2);

  const spent = (agent: string) =>
    (runs ?? [])
      .filter((r) => r.agent_id === agent && r.created_at >= monthStart && r.status !== "refused")
      .reduce((s, r) => s + Number(r.cost_usd ?? r.estimated_cost_usd ?? 0), 0);
  const stateOf = (a: NonNullable<typeof agents>[number]): AgentState => {
    if (!keyOk) return { label: "Non configuré (clé API absente)", tone: "neutral" };
    if (!a.enabled) return { label: "Suspendu", tone: "mango" };
    if (!g.enabled || g.monthly_budget_usd <= 0 || a.monthly_budget_usd <= 0) return { label: "Non configuré (budget nul ou IA désactivée)", tone: "neutral" };
    const last = runs?.find((r) => r.agent_id === a.id && r.status !== "refused");
    if (last?.status === "failed") return { label: "En erreur", tone: "coral" };
    return { label: "Actif", tone: "mint" };
  };
  const analyst = agents?.find((a) => a.id === "analyst");
  const analystState = analyst ? stateOf(analyst) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Centre IA</h1>
        <p className="text-muted text-sm">
          Les agents sont désactivés et sans budget par défaut : aucun appel payant n&apos;a lieu tant qu&apos;un plafond
          n&apos;est pas fixé. L&apos;application fonctionne sans IA.
        </p>
      </div>

      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <h2 className="font-bold">Réglage global</h2>
        <p className="text-muted mt-1 text-sm">
          Clé API : {keyOk ? "présente côté serveur" : "absente (ANTHROPIC_API_KEY)"} · plafond global{" "}
          {Number(g.monthly_budget_usd).toFixed(2)} USD / mois
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4" data-testid="ai-costs">
          {[
            ["Coût estimé (mois)", usd("ai_estimated_usd_month"), "réservations maximales des appels du mois"],
            ["Réservé (en cours)", usd("ai_reserved_usd"), "appels non terminés"],
            ["Coût enregistré (mois)", usd("ai_recorded_usd_month"), "d'après l'usage renvoyé par le fournisseur"],
            ["À rapprocher", usd("ai_to_reconcile_usd"), "facturation incertaine, estimation conservée"],
          ].map(([label, value, hint]) => (
            <div key={label} className="bg-canvas rounded-xl p-3">
              <dt className="text-muted text-xs">{label}</dt>
              <dd className="text-lg font-bold tabular-nums">{value} USD</dd>
              <dd className="text-muted text-[11px]">{hint}</dd>
            </div>
          ))}
        </dl>
        <p className="text-muted mt-2 text-xs">
          Plafond applicatif calculé par Uny (coût maximal réservé avant chaque appel, sans relance ni modèle de
          remplacement) : il ne remplace pas une limite de dépense configurée dans la console du fournisseur. Tarifs
          vérifiés le 22/10/2026.
        </p>
        <ConfigForm agent="*" enabled={g.enabled} budget={Number(g.monthly_budget_usd)} />
      </section>

      <section className="space-y-3">
        <h2 className="font-bold">Agents</h2>
        {(agents ?? []).map((a) => {
          const st = stateOf(a);
          return (
            <div key={a.id} className="rounded-[var(--radius-card)] bg-white p-5 text-sm shadow-[var(--shadow-card)]" data-testid={`agent-${a.id}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold">{a.name}</span>
                <code className="text-muted text-xs">{a.id}</code>
                <Badge tone={st.tone}>{st.label}</Badge>
              </div>
              <p className="text-muted mt-1">{a.description}</p>
              <dl className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
                <div>
                  <dt className="text-muted inline">Outils autorisés : </dt>
                  <dd className="inline font-mono">{a.tools.join(", ")}</dd>
                </div>
                <div>
                  <dt className="text-muted inline">Périmètre : </dt>
                  <dd className="inline">{a.data_scope}</dd>
                </div>
                <div>
                  <dt className="text-muted inline">Modèle : </dt>
                  <dd className="inline font-mono">
                    {a.model} (effort {a.effort})
                  </dd>
                </div>
                <div>
                  <dt className="text-muted inline">Ce mois-ci : </dt>
                  <dd className="inline">
                    {spent(a.id).toFixed(2)} / {Number(a.monthly_budget_usd).toFixed(2)} USD
                  </dd>
                </div>
              </dl>
              <ConfigForm
                agent={a.id}
                enabled={a.enabled}
                budget={Number(a.monthly_budget_usd)}
                maxDay={a.max_runs_per_day}
                maxUserDay={a.max_runs_per_user_day}
              />
            </div>
          );
        })}
      </section>

      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <h2 className="mb-2 font-bold">Rapports</h2>
        <ReportForm disabledReason={analystState && analystState.label !== "Actif" ? analystState.label : null} />
        <ul className="divide-line mt-3 divide-y text-sm">
          {(reports ?? []).map((r) => (
            <li key={r.id} className="py-2">
              <Link href={`/admin/ia/rapports/${r.id}`} className="text-brand-600 font-semibold">
                {r.agent_id === "analyst" ? `Rapport analyste (${r.period_days} j)` : "Diagnostic d'alerte"}
              </Link>
              <span className="text-muted text-xs"> · {formatDate(r.created_at, { hour: "2-digit", minute: "2-digit" })}</span>
            </li>
          ))}
          {!reports?.length && <li className="text-muted py-2">Aucun rapport.</li>}
        </ul>
      </section>

      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <h2 className="mb-2 font-bold">Approbations en attente</h2>
        {!approvals?.length ? (
          <p className="text-muted text-sm">
            Aucune. Aucun agent ne propose aujourd&apos;hui d&apos;action sensible ; toute future action devra être approuvée
            ici, avec ses paramètres exacts.
          </p>
        ) : (
          <ul className="space-y-3 text-sm">
            {approvals.map((a) => (
              <li key={a.id}>
                <p className="font-semibold">
                  {a.agent_id} · {a.action}
                </p>
                <pre className="bg-canvas my-1 overflow-x-auto rounded-lg p-2 text-xs">{JSON.stringify(a.params, null, 2)}</pre>
                <ApprovalForm id={a.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <h2 className="mb-2 font-bold">Support : file de l&apos;équipe (plus anciennes en premier)</h2>
        {!handoffs?.length ? (
          <p className="text-muted text-sm">Aucune.</p>
        ) : (
          <ul className="space-y-4 text-sm">
            {handoffs.map((c) => (
              <li key={c.id} className="border-line rounded-xl border p-3" data-testid="handoff">
                <p className="text-muted text-xs">
                  {c.status === "handed_off" ? "En attente de l'équipe" : "Répondu, notification à renvoyer"} · {c.handoff_reason} ·
                  dernier message le {formatDate(c.updated_at, { hour: "2-digit", minute: "2-digit" })}
                </p>
                <ul className="mt-1 space-y-1">
                  {[...(c.messages ?? [])]
                    .sort((x, y) => x.id - y.id)
                    .slice(-6)
                    .map((m) => (
                      <li key={m.id}>
                        <span className="font-semibold">
                          {m.role === "user" ? "Utilisateur" : m.role === "assistant" ? "Assistant" : m.role === "staff" ? "Équipe" : "Info"} :
                        </span>{" "}
                        {m.content}
                      </li>
                    ))}
                </ul>
                {c.status === "handed_off" ? <AnswerForm id={c.id} /> : <RetryNotificationForm id={c.id} />}
                {c.notify_error && <p className="text-coral-600 mt-1 text-xs">Notification en échec : {c.notify_error}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {(runs ?? []).some((r) => r.status === "to_reconcile") && (
        <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]" data-testid="ai-reconcile">
          <h2 className="mb-2 font-bold">Appels à rapprocher</h2>
          <p className="text-muted mb-3 text-sm">
            Facturation incertaine (délai dépassé, coupure réseau, clôture non enregistrée). Relevez le coût réel dans la
            console du fournisseur ; d&apos;ici là, le coût maximal réservé reste compté dans le budget.
          </p>
          <ul className="space-y-3 text-sm">
            {(runs ?? [])
              .filter((r) => r.status === "to_reconcile")
              .map((r) => (
                <li key={r.id}>
                  <p>
                    {formatDate(r.created_at, { hour: "2-digit", minute: "2-digit" })} · {r.agent_id} · réservé{" "}
                    {Number(r.estimated_cost_usd).toFixed(4)} USD · {r.error}
                  </p>
                  <ReconcileForm id={r.id} />
                </li>
              ))}
          </ul>
        </section>
      )}

      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <h2 className="mb-2 font-bold">Historique des exécutions</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-muted">
              <tr>
                <th className="py-1 pr-3">Date</th>
                <th className="py-1 pr-3">Agent</th>
                <th className="py-1 pr-3">État</th>
                <th className="py-1 pr-3 text-right">Jetons</th>
                <th className="py-1 pr-3 text-right">Coût (USD)</th>
                <th className="py-1 pr-3">Détail</th>
              </tr>
            </thead>
            <tbody className="divide-line divide-y">
              {(runs ?? []).map((r) => (
                <tr key={r.id} data-testid="ai-run">
                  <td className="py-1 pr-3">{formatDate(r.created_at, { hour: "2-digit", minute: "2-digit" })}</td>
                  <td className="py-1 pr-3">{r.agent_id}</td>
                  <td className="py-1 pr-3">{r.status}</td>
                  <td className="py-1 pr-3 text-right tabular-nums">
                    {r.input_tokens != null ? `${r.input_tokens} / ${r.output_tokens}` : "—"}
                  </td>
                  <td className="py-1 pr-3 text-right tabular-nums">{Number(r.cost_usd ?? 0).toFixed(4)}</td>
                  <td className="text-muted py-1 pr-3">{r.refusal ?? r.error ?? r.model ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
