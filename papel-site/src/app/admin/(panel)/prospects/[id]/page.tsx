import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminHeader, Card, StatusPill } from "@/components/admin/shared";
import { requireAdmin } from "@/lib/admin";
import { ACTIVITY_LABEL, formatDate, LEAD_STATUS_LABEL, REQUEST_TYPE_LABEL } from "@/lib/labels";
import type { Lead } from "@/lib/types";
import { LeadUpdateForm } from "./update-form";

export const metadata = { title: "Prospect" };

export default async function LeadPage({ params }: PageProps<"/admin/prospects/[id]">) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("leads").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const lead = data as Lead;
  const wa = lead.whatsapp.replace(/\D/g, "");

  const rows: [string, React.ReactNode][] = [
    ["Entreprise", lead.company || "—"],
    ["Ville / région", lead.city],
    [
      "WhatsApp",
      <a
        key="wa"
        href={`https://wa.me/${wa}`}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-papel-700 underline"
      >
        {lead.whatsapp}
      </a>,
    ],
    [
      "E-mail",
      lead.email ? (
        <a key="m" href={`mailto:${lead.email}`} className="text-papel-700 underline">
          {lead.email}
        </a>
      ) : (
        "—"
      ),
    ],
    ["Activité", ACTIVITY_LABEL[lead.activity_type] ?? lead.activity_type],
    ["Type de demande", REQUEST_TYPE_LABEL[lead.request_type] ?? lead.request_type],
    ["Produits recherchés", lead.products_wanted.join(", ") || "—"],
    ["Volume estimé", lead.estimated_volume || "—"],
    ["Page d'origine", lead.source_path || "—"],
    ["Reçu le", formatDate(lead.created_at, true)],
  ];

  return (
    <>
      <Link href="/admin/prospects" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-papel-700">
        <ArrowLeft className="size-4" aria-hidden /> Prospects
      </Link>
      <AdminHeader title={lead.full_name} action={<StatusPill value={lead.status} label={LEAD_STATUS_LABEL[lead.status]} />} />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <dl className="divide-y divide-line">
            {rows.map(([k, v]) => (
              <div key={k} className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr]">
                <dt className="text-sm text-muted">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          {lead.message && (
            <div className="mt-4 rounded-xl bg-sable p-4">
              <p className="text-sm font-semibold text-papel-950">Message</p>
              <p className="mt-2 whitespace-pre-line">{lead.message}</p>
            </div>
          )}
        </Card>
        <Card>
          <h2 className="font-bold text-papel-950">Suivi</h2>
          <LeadUpdateForm id={lead.id} status={lead.status} notes={lead.internal_notes ?? ""} />
        </Card>
      </div>
    </>
  );
}
