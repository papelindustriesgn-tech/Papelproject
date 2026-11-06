import Link from "next/link";
import { setMessageStatus } from "@/app/admin/actions";
import { AdminHeader, Card, StatusPill } from "@/components/admin/shared";
import { requireAdmin } from "@/lib/admin";
import { formatDate, MESSAGE_STATUS_LABEL } from "@/lib/labels";
import type { ContactMessage, MessageStatus } from "@/lib/types";

export const metadata = { title: "Messages" };
const FILTERS: (MessageStatus | "tous")[] = ["nouveau", "traite", "archive", "tous"];

export default async function MessagesPage({ searchParams }: PageProps<"/admin/messages">) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const filter = FILTERS.includes(sp.statut as MessageStatus) ? (sp.statut as MessageStatus | "tous") : "nouveau";
  let q = supabase.from("contact_messages").select("*").order("created_at", { ascending: false }).limit(200);
  if (filter !== "tous") q = q.eq("status", filter);
  const { data } = await q;
  const messages = (data ?? []) as ContactMessage[];

  return (
    <>
      <AdminHeader title="Messages de contact" />
      <nav aria-label="Filtrer" className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={`?statut=${f}`}
            aria-current={f === filter ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-line ${f === filter ? "bg-papel-700 text-white ring-papel-700" : "bg-white"}`}
          >
            {f === "tous" ? "Tous" : MESSAGE_STATUS_LABEL[f]}
          </Link>
        ))}
      </nav>
      <div className="space-y-4">
        {messages.length === 0 && <Card className="text-center text-muted">Aucun message.</Card>}
        {messages.map((m) => (
          <Card key={m.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-bold text-papel-950">{m.subject}</p>
                <p className="text-sm text-muted">
                  {m.full_name}
                  {m.phone && (
                    <>
                      {" · "}
                      <a
                        href={`https://wa.me/${m.phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-papel-700 underline"
                      >
                        {m.phone}
                      </a>
                    </>
                  )}
                  {m.email && (
                    <>
                      {" · "}
                      <a href={`mailto:${m.email}`} className="text-papel-700 underline">
                        {m.email}
                      </a>
                    </>
                  )}
                  {" · "}
                  {formatDate(m.created_at, true)}
                </p>
              </div>
              <StatusPill value={m.status} label={MESSAGE_STATUS_LABEL[m.status]} />
            </div>
            <p className="mt-4 whitespace-pre-line">{m.message}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {(["nouveau", "traite", "archive"] as MessageStatus[])
                .filter((s) => s !== m.status)
                .map((s) => (
                  <form key={s} action={setMessageStatus}>
                    <input type="hidden" name="id" value={m.id} />
                    <input type="hidden" name="status" value={s} />
                    <button className="rounded-full bg-sable px-4 py-2 text-sm font-semibold hover:bg-papel-50">
                      Marquer « {MESSAGE_STATUS_LABEL[s]} »
                    </button>
                  </form>
                ))}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
