import Link from "next/link";
import { StatCard } from "@/components/admin/stat-card";
import { SearchBar } from "@/components/ui/filters";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/cn";
import { timeAgo } from "@/lib/format";
import { ilikePattern, param, type SearchParams } from "@/lib/url";
import { SUSPECT_FILTER, signupFlags } from "@/lib/signup-review";
import { ReviewList, type SignupRow } from "./review-list";

export const metadata = { title: "Inscriptions à valider" };
const LIMIT = 300;

const TABS = [
  { key: "attente", label: "À valider" },
  { key: "suspects", label: "⚠ Suspects" },
  { key: "valides", label: "Validés" },
  { key: "refuses", label: "Refusés" },
] as const;

export default async function SignupsAdmin({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === param(sp, "filtre"))?.key ?? "attente";
  const q = param(sp, "q");
  const supabase = await createClient();

  const base = () =>
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student").eq("is_test_account", false);
  let query = supabase
    .from("profiles")
    .select(
      "id, first_name, last_name, email, phone, field_of_study, study_level, created_at, account_status, signup_flags, university_other, university:universities!profiles_university_id_fkey(short_name, name), city:cities(name)",
      { count: "exact" },
    )
    .eq("role", "student")
    .eq("is_test_account", false);
  if (tab === "attente") query = query.eq("account_status", "pending");
  if (tab === "valides") query = query.eq("account_status", "approved");
  if (tab === "refuses") query = query.eq("account_status", "rejected");
  if (tab === "suspects") query = query.neq("account_status", "rejected").or(SUSPECT_FILTER);
  if (q) {
    const p = ilikePattern(q);
    query = query.or(`first_name.ilike.${p},last_name.ilike.${p},email.ilike.${p},phone.ilike.${p}`);
  }

  const [{ data, count }, pending, suspects, approved, rejected] = await Promise.all([
    query.order("created_at", { ascending: false }).limit(LIMIT),
    base().eq("account_status", "pending"),
    base().neq("account_status", "rejected").or(SUSPECT_FILTER),
    base().eq("account_status", "approved"),
    base().eq("account_status", "rejected"),
  ]);

  const rows: SignupRow[] = (data ?? []).map((p) => ({
    id: p.id,
    name: `${p.first_name} ${p.last_name}`,
    email: p.email,
    phone: p.phone,
    university: p.university?.short_name ?? p.university?.name ?? p.university_other ?? "Établissement non renseigné",
    details: [p.field_of_study, p.study_level, p.city?.name].filter(Boolean).join(" · "),
    created: timeAgo(p.created_at),
    status: p.account_status as SignupRow["status"],
    flags: signupFlags(p),
  }));
  const counts: Record<(typeof TABS)[number]["key"], number> = {
    attente: pending.count ?? 0,
    suspects: suspects.count ?? 0,
    valides: approved.count ?? 0,
    refuses: rejected.count ?? 0,
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Inscriptions à valider</h1>
        <p className="text-muted text-sm">
          Chaque nouvel étudiant attend ta validation avant d&apos;accéder à sa carte et aux avantages. Les comptes suspects
          (email fictif ou jetable, rafale d&apos;inscriptions, identité en double) sont signalés automatiquement.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="À valider" value={counts.attente} tone="mango" />
        <StatCard label="Suspects (non refusés)" value={counts.suspects} tone="brand" />
        <StatCard label="Validés" value={counts.valides} tone="mint" />
        <StatCard label="Refusés" value={counts.refuses} />
      </div>

      <nav aria-label="Filtres" className="bg-canvas ring-line grid grid-cols-2 gap-1 rounded-2xl p-1 ring-1 sm:grid-cols-4">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/inscriptions?filtre=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={cn(
              "rounded-xl px-3 py-2 text-center text-sm font-bold transition",
              tab === t.key ? "text-ink bg-white shadow-sm" : "text-muted hover:text-ink",
            )}
          >
            {t.label} ({counts[t.key]})
          </Link>
        ))}
      </nav>

      <SearchBar pathname="/admin/inscriptions" searchParams={sp} placeholder="Nom, email, téléphone…" keep={["filtre"]} />
      {(count ?? 0) > LIMIT && (
        <p className="text-muted text-sm">
          {LIMIT} premiers comptes affichés sur {count} : traite-les par lots, la liste se met à jour.
        </p>
      )}
      <ReviewList key={`${tab}-${q ?? ""}`} rows={rows} />
    </div>
  );
}
