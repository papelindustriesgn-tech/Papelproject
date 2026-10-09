import Link from "next/link";
import { ApproveButton } from "@/components/admin/partner-access";
import { Badge } from "@/components/ui/badge";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { FilterChips } from "@/components/ui/filters";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCities } from "@/lib/cities";
import { formatDate, whatsappLink } from "@/lib/format";
import { param, type SearchParams } from "@/lib/url";
import { PARTNER_STATUS } from "@/lib/university";
import { approveUniversityApplication, rejectUniversityApplication } from "../university-actions";
import { NewUniversityForm } from "./forms";

export const metadata = { title: "Universités" };

const INTEGRATION = { not_configured: "—", testing: "API en test", active: "API active", disabled: "API désactivée" } as const;

export default async function UniversitiesAdmin({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const sp = await searchParams;
  const status = param(sp, "statut");
  const supabase = await createClient();
  let query = supabase
    .from("universities")
    .select(
      "id, name, short_name, partner_status, city:cities(name), university_members(count), university_integrations(status), university_branding(university_id)",
    )
    .order("partner_status", { ascending: false })
    .order("name");
  if (status && status in PARTNER_STATUS) query = query.eq("partner_status", status);
  const [{ data: unis }, { data: applications }, { data: pendingRows }, cities] = await Promise.all([
    query,
    supabase
      .from("university_applications")
      .select("*, city:cities(name)")
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase.from("student_enrollments").select("university_id").in("status", ["pending", "manual_review"]).limit(5000),
    getCities(),
  ]);
  const pendingBy = new Map<number, number>();
  for (const r of pendingRows ?? []) pendingBy.set(r.university_id, (pendingBy.get(r.university_id) ?? 0) + 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Universités</h1>
        <p className="text-muted text-sm">
          Établissements, portails, connecteurs et cartes. Une université « Partenaire » confirme elle-même les inscriptions (API,
          liste importée ou portail) et personnalise la carte de ses étudiants.
        </p>
      </div>

      {applications && applications.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-bold">Demandes « Université partenaire » ({applications.length})</h2>
          {applications.map((a) => (
            <div key={a.id} className="space-y-3 rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-bold">{a.university_name}</p>
                  <p className="text-muted text-sm">
                    {a.city?.name ?? "—"} · {a.student_count ? `${a.student_count.toLocaleString("fr-FR")} étudiants · ` : ""}
                    {formatDate(a.created_at)}
                  </p>
                </div>
                {a.has_api && <Badge tone="brand">Dispose d&apos;une API</Badge>}
              </div>
              {a.message && <p className="bg-canvas rounded-2xl p-3 text-sm whitespace-pre-line">{a.message}</p>}
              <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span className="font-semibold">
                  {a.contact_name}
                  {a.contact_title && <span className="text-muted font-normal"> · {a.contact_title}</span>}
                </span>
                <a href={whatsappLink(a.phone)} target="_blank" rel="noopener noreferrer" className="text-mint-700 font-semibold">
                  {a.phone}
                </a>
                <a href={`mailto:${a.email}`} className="text-brand-600 font-semibold break-all">
                  {a.email}
                </a>
              </p>
              <p className="text-muted text-xs">
                Vérifie d&apos;abord l&apos;identité du contact (appel à la scolarité, courrier officiel) avant d&apos;ouvrir le
                portail.
              </p>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <ApproveButton action={approveUniversityApplication.bind(null, a.id)} label="Approuver et ouvrir le portail" />
                <form action={rejectUniversityApplication.bind(null, a.id)}>
                  <ConfirmButton
                    message="Refuser cette demande ?"
                    className="text-coral-600 hover:bg-coral-50 h-9 rounded-2xl px-4 text-sm font-semibold"
                  >
                    Refuser
                  </ConfirmButton>
                </form>
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <h2 className="mb-3 font-bold">Ajouter un établissement</h2>
        <NewUniversityForm cities={cities} />
      </section>

      <FilterChips
        pathname="/admin/universites"
        searchParams={sp}
        name="statut"
        allLabel="Toutes"
        options={Object.entries(PARTNER_STATUS).map(([value, s]) => ({ value, label: s.label }))}
      />

      <ul className="divide-line divide-y rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)]">
        {(unis ?? []).map((u) => {
          const st = PARTNER_STATUS[u.partner_status as keyof typeof PARTNER_STATUS];
          const members = u.university_members[0]?.count ?? 0;
          const integration = u.university_integrations?.status as keyof typeof INTEGRATION | undefined;
          const pending = pendingBy.get(u.id) ?? 0;
          return (
            <li key={u.id}>
              <Link href={`/admin/universites/${u.id}`} className="hover:bg-canvas flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {u.name}
                    {u.short_name && <span className="text-muted font-normal"> · {u.short_name}</span>}
                  </p>
                  <p className="text-muted text-xs">
                    {u.city?.name ?? "—"} · {members} compte{members > 1 ? "s" : ""} portail
                    {u.university_branding ? " · carte personnalisée" : ""}
                    {integration && integration !== "not_configured" ? ` · ${INTEGRATION[integration]}` : ""}
                  </p>
                </div>
                {pending > 0 && <Badge tone="mango">{pending} à traiter</Badge>}
                <Badge tone={st.tone}>{st.label}</Badge>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
