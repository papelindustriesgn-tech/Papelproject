import Link from "next/link";
import { Download, Search } from "lucide-react";
import { AdminHeader, EmptyRow, StatusPill, td, th } from "@/components/admin/shared";
import { inputClass } from "@/components/forms/fields";
import { requireAdmin } from "@/lib/admin";
import { ACTIVITY_LABEL, ACTIVITY_TYPES, formatDate, LEAD_STATUS_LABEL, LEAD_STATUSES, REQUEST_TYPE_LABEL } from "@/lib/labels";
import { leadsQuery, readLeadFilters } from "@/lib/lead-query";
import type { Lead } from "@/lib/types";

export const metadata = { title: "Prospects" };
const PAGE_SIZE = 25;

export default async function LeadsPage({ searchParams }: PageProps<"/admin/prospects">) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const filters = readLeadFilters(sp);
  const page = Math.max(1, Number(sp.page) || 1);
  const from = (page - 1) * PAGE_SIZE;

  const { data, count, error } = await leadsQuery(supabase, filters)
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  const leads = (data ?? []) as unknown as Lead[];
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const qs = (extra: Record<string, string | number>) =>
    new URLSearchParams(
      Object.entries({ ...filters, ...extra }).filter(([, v]) => v !== undefined && v !== "") as [string, string][],
    ).toString();

  return (
    <>
      <AdminHeader
        title="Prospects"
        intro={`${count ?? 0} demande(s) correspondante(s)`}
        action={
          <a
            href={`/admin/prospects/export?${qs({})}`}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-papel-800 ring-1 ring-line hover:ring-papel-300"
          >
            <Download className="size-4" aria-hidden /> Export CSV
          </a>
        }
      />

      <form
        className="mb-6 grid gap-3 rounded-2xl bg-white p-4 ring-1 ring-line md:grid-cols-[1fr_auto_auto_auto_auto]"
        role="search"
      >
        <label className="relative">
          <span className="sr-only">Rechercher</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="Nom, entreprise, ville, téléphone…"
            className={`${inputClass} py-2.5 pl-9`}
          />
        </label>
        <select name="statut" defaultValue={filters.statut ?? ""} className={`${inputClass} py-2.5`} aria-label="Statut">
          <option value="">Tous les statuts</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {LEAD_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <select name="activite" defaultValue={filters.activite ?? ""} className={`${inputClass} py-2.5`} aria-label="Activité">
          <option value="">Toutes activités</option>
          {ACTIVITY_TYPES.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
        <select name="type" defaultValue={filters.type ?? ""} className={`${inputClass} py-2.5`} aria-label="Type de demande">
          <option value="">Tous types</option>
          {Object.entries(REQUEST_TYPE_LABEL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <button className="h-11 rounded-xl bg-papel-700 px-5 text-sm font-semibold text-white hover:bg-papel-800">Filtrer</button>
      </form>

      {error && <p className="mb-4 text-sm text-corail">Erreur : {error.message}</p>}

      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-line">
        <table className="w-full min-w-[48rem] text-sm">
          <thead className="border-b border-line bg-sable/60">
            <tr>
              <th className={th}>Date</th>
              <th className={th}>Contact</th>
              <th className={th}>Ville</th>
              <th className={th}>Activité</th>
              <th className={th}>Demande</th>
              <th className={th}>Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {leads.length === 0 && <EmptyRow colSpan={6}>Aucun prospect ne correspond.</EmptyRow>}
            {leads.map((l) => (
              <tr key={l.id} className="hover:bg-sable/50">
                <td className={`${td} whitespace-nowrap text-muted`}>{formatDate(l.created_at)}</td>
                <td className={td}>
                  <Link href={`/admin/prospects/${l.id}`} className="font-semibold text-papel-800 hover:underline">
                    {l.full_name}
                  </Link>
                  <div className="text-muted">{l.company || l.whatsapp}</div>
                </td>
                <td className={td}>{l.city}</td>
                <td className={td}>{ACTIVITY_LABEL[l.activity_type] ?? l.activity_type}</td>
                <td className={td}>{REQUEST_TYPE_LABEL[l.request_type] ?? l.request_type}</td>
                <td className={td}>
                  <StatusPill value={l.status} label={LEAD_STATUS_LABEL[l.status]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-6 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link href={`?${qs({ page: page - 1 })}`} className="font-semibold text-papel-700">
              ← Précédent
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted">
            Page {page} / {pages}
          </span>
          {page < pages ? (
            <Link href={`?${qs({ page: page + 1 })}`} className="font-semibold text-papel-700">
              Suivant →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}
