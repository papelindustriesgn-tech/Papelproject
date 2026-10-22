import { notFound } from "next/navigation";
import { BackLink } from "@/components/ui/back-link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { METRICS } from "@/lib/metrics";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Rapport IA" };

/** Rapport de l'analyste ou diagnostic : lecture sous RLS (administrateurs uniquement), comme les données sources. */
export default async function AiReportPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data: r } = await (await createClient()).from("ai_reports").select("*").eq("id", id).maybeSingle();
  if (!r) notFound();
  const metrics = (r.metrics ?? {}) as Record<string, number | string | null>;
  return (
    <div className="space-y-5">
      <BackLink href="/admin/ia" label="Centre IA" />
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">
          {r.agent_id === "analyst" ? `Rapport de l'analyste (${r.period_days} jours)` : "Diagnostic d'alerte (proposition)"}
        </h1>
        <p className="text-muted text-sm">
          Généré le {formatDate(r.created_at, { hour: "2-digit", minute: "2-digit" })} par IA. Texte à vérifier : les
          recommandations ne sont jamais exécutées automatiquement.
        </p>
      </div>
      {r.agent_id === "analyst" && (
        <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
          <h2 className="mb-2 font-bold">Indicateurs vérifiés (calculés en base)</h2>
          <ul className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            {METRICS.map((m) => (
              <li key={m.key} className="flex justify-between gap-3">
                <span className="text-muted">{m.label}</span>
                <span className="font-semibold tabular-nums">{metrics[m.key] ?? "Non disponible"}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <div className="text-sm leading-relaxed whitespace-pre-wrap" data-testid="report-content">
          {r.content}
        </div>
      </section>
    </div>
  );
}
