import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChips } from "@/components/ui/filters";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/format";
import { param, type SearchParams } from "@/lib/url";
import { ModerationForm } from "./moderation-form";

export const metadata = { title: "Signalements" };

const REASONS: Record<string, string> = {
  scam: "Arnaque",
  prohibited: "Article interdit",
  offensive: "Contenu choquant",
  spam: "Publicité / doublon",
  wrong_info: "Informations fausses",
  other: "Autre",
};

/** File de modération de la marketplace : signalements ouverts, puis historique des décisions. */
export default async function ReportsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const sp = await searchParams;
  const history = param(sp, "vue") === "historique";
  const db = createAdminClient();
  const { data } = await db
    .from("content_reports")
    .select(
      "id, item_id, reason, details, status, decision_note, decided_at, created_at, reporter:profiles!content_reports_reporter_id_fkey(first_name, last_name), decider:profiles!content_reports_decided_by_fkey(first_name, last_name), item:marketplace_items(title, status, seller_id)",
    )
    .in("status", history ? ["dismissed", "actioned"] : ["open"])
    .order(history ? "decided_at" : "created_at", { ascending: false })
    .limit(200);
  const rows = data ?? [];
  // Signalements ouverts regroupés par annonce
  const byItem = new Map<string, typeof rows>();
  for (const r of rows) byItem.set(r.item_id, [...(byItem.get(r.item_id) ?? []), r]);

  return (
    <div className="animate-fade-up space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Signalements de la marketplace</h1>
        <p className="text-muted mt-1 text-sm">
          À partir de 3 signalements de personnes différentes, l&apos;annonce est masquée en attendant votre décision.
        </p>
      </div>
      <FilterChips
        pathname="/admin/signalements"
        searchParams={sp}
        name="vue"
        allLabel="À traiter"
        options={[{ value: "historique", label: "Historique des décisions" }]}
      />
      {rows.length === 0 ? (
        <EmptyState emoji="🛡️" title={history ? "Aucune décision" : "Aucun signalement à traiter"} />
      ) : history ? (
        <ul className="divide-line divide-y rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)]">
          {rows.map((r) => (
            <li key={r.id} className="p-4 text-sm">
              <p className="font-semibold">
                {r.item?.title ?? "Annonce supprimée"} · {REASONS[r.reason] ?? r.reason}
              </p>
              <p className="text-muted text-xs">
                {r.status === "actioned" ? "Annonce retirée" : "Classé sans suite"} le {formatDate(r.decided_at)} par{" "}
                {r.decider ? `${r.decider.first_name} ${r.decider.last_name}` : "—"}
              </p>
              {r.decision_note && <p className="mt-1">Note : {r.decision_note}</p>}
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-3">
          {[...byItem.entries()].map(([itemId, reports]) => (
            <li
              key={itemId}
              className="rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-card)]"
              data-testid="report"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/marketplace/${itemId}`} className="font-bold underline" target="_blank">
                  {reports[0].item?.title ?? "Annonce"}
                </Link>
                <span className="text-muted text-xs">
                  {reports.length} signalement{reports.length > 1 ? "s" : ""} · annonce {reports[0].item?.status}
                </span>
              </div>
              <ul className="mt-2 space-y-1 text-sm">
                {reports.map((r) => (
                  <li key={r.id}>
                    <strong>{REASONS[r.reason] ?? r.reason}</strong>
                    {r.details && <> — {r.details}</>}
                    <span className="text-muted text-xs">
                      {" "}
                      · {r.reporter ? `${r.reporter.first_name} ${r.reporter.last_name}` : "compte supprimé"},{" "}
                      {formatDate(r.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
              <ModerationForm itemId={itemId} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
