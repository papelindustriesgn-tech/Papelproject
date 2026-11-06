import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { toCsv } from "@/lib/csv";
import { ACTIVITY_LABEL, LEAD_STATUS_LABEL, REQUEST_TYPE_LABEL } from "@/lib/labels";
import { leadsQuery, readLeadFilters } from "@/lib/lead-query";
import type { Lead } from "@/lib/types";

export async function GET(request: NextRequest) {
  const { supabase } = await requireAdmin();
  const filters = readLeadFilters(Object.fromEntries(request.nextUrl.searchParams));
  const { data, error } = await leadsQuery(supabase, filters).order("created_at", { ascending: false }).limit(10000);
  if (error) return new NextResponse(`Export impossible : ${error.message}`, { status: 500 });

  const leads = (data ?? []) as unknown as Lead[];
  const csv = toCsv(
    [
      "Date",
      "Nom et prénom",
      "Entreprise",
      "Ville / région",
      "WhatsApp",
      "E-mail",
      "Activité",
      "Type de demande",
      "Produits recherchés",
      "Volume estimé",
      "Message",
      "Statut",
      "Notes internes",
    ],
    leads.map((l) => [
      new Date(l.created_at).toLocaleString("fr-FR", { timeZone: "Africa/Conakry" }),
      l.full_name,
      l.company,
      l.city,
      l.whatsapp,
      l.email,
      ACTIVITY_LABEL[l.activity_type] ?? l.activity_type,
      REQUEST_TYPE_LABEL[l.request_type] ?? l.request_type,
      l.products_wanted.join(", "),
      l.estimated_volume,
      l.message,
      LEAD_STATUS_LABEL[l.status],
      l.internal_notes,
    ]),
  );
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="prospects-papel-${date}.csv"`,
      "cache-control": "no-store",
    },
  });
}
