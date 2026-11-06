import Link from "next/link";
import { AdminHeader, Card, StatusPill } from "@/components/admin/shared";
import { requireAdmin } from "@/lib/admin";
import { daysAgoIso } from "@/lib/labels";
import { ACTIVITY_LABEL, formatDate, LEAD_STATUS_LABEL, LEAD_STATUSES } from "@/lib/labels";
import type { LeadStatus } from "@/lib/types";

export const metadata = { title: "Tableau de bord" };

export default async function Dashboard() {
  const { supabase } = await requireAdmin();
  const since30 = daysAgoIso(30);
  const since7 = daysAgoIso(7);

  const head = (table: string) => supabase.from(table).select("*", { count: "exact", head: true });
  const n = (p: PromiseLike<{ count: number | null }>) => Promise.resolve(p).then((r) => r.count ?? 0);

  const [statusRows, leads30, leads7, newMessages, wa30, cta30, products, news, recent] = await Promise.all([
    supabase.from("leads").select("status"),
    n(head("leads").gte("created_at", since30)),
    n(head("leads").gte("created_at", since7)),
    n(head("contact_messages").eq("status", "nouveau")),
    n(head("conversion_events").eq("event_type", "whatsapp_click").gte("created_at", since30)),
    n(head("conversion_events").eq("event_type", "cta_click").gte("created_at", since30)),
    n(head("products").eq("status", "published")),
    n(head("news_posts").eq("status", "published")),
    supabase
      .from("leads")
      .select("id, full_name, company, city, activity_type, status, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const byStatus = Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0])) as Record<LeadStatus, number>;
  for (const r of (statusRows.data ?? []) as { status: LeadStatus }[]) byStatus[r.status]++;
  const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
  const conversion = total ? Math.round((byStatus.converti / total) * 100) : 0;

  const kpis = [
    { label: "Demandes (30 j)", value: leads30, hint: `${leads7} sur 7 jours` },
    { label: "Taux de conversion", value: `${conversion} %`, hint: `${byStatus.converti} converti(s) / ${total}` },
    { label: "Clics WhatsApp (30 j)", value: wa30, hint: `${cta30} clics sur les boutons d'action` },
    { label: "Messages à traiter", value: newMessages, hint: "statut « Nouveau »", href: "/admin/messages" },
  ];

  return (
    <>
      <AdminHeader title="Tableau de bord" intro={`${products} produit(s) et ${news} actualité(s) publiés.`} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <p className="text-sm text-muted">{k.label}</p>
            <p className="mt-2 font-display text-3xl font-bold text-papel-950">{k.value}</p>
            <p className="mt-1 text-xs text-muted">{k.hint}</p>
            {k.href && (
              <Link href={k.href} className="mt-3 inline-block text-sm font-semibold text-papel-700">
                Voir →
              </Link>
            )}
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card>
          <h2 className="font-bold text-papel-950">Pipeline commercial</h2>
          <ul className="mt-4 space-y-3">
            {LEAD_STATUSES.map((s) => (
              <li key={s}>
                <Link href={`/admin/prospects?statut=${s}`} className="group block">
                  <div className="flex justify-between text-sm">
                    <span className="group-hover:text-papel-700">{LEAD_STATUS_LABEL[s]}</span>
                    <span className="font-semibold">{byStatus[s]}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-sable">
                    <div
                      className="h-full rounded-full bg-papel-600"
                      style={{ width: `${total ? (byStatus[s] / total) * 100 : 0}%` }}
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="xl:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-papel-950">Dernières demandes</h2>
            <Link href="/admin/prospects" className="text-sm font-semibold text-papel-700">
              Tout voir
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-line">
            {(recent.data ?? []).length === 0 && <li className="py-6 text-center text-muted">Aucune demande pour le moment.</li>}
            {(recent.data ?? []).map((l) => (
              <li key={l.id}>
                <Link
                  href={`/admin/prospects/${l.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 hover:text-papel-700"
                >
                  <span>
                    <span className="font-semibold">{l.full_name}</span>
                    <span className="text-muted">
                      {" "}
                      · {l.company ? `${l.company} · ` : ""}
                      {l.city} · {ACTIVITY_LABEL[l.activity_type] ?? l.activity_type}
                    </span>
                  </span>
                  <span className="flex items-center gap-3 text-sm text-muted">
                    {formatDate(l.created_at)}
                    <StatusPill value={l.status} label={LEAD_STATUS_LABEL[l.status as LeadStatus]} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
