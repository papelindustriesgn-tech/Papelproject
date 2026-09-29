import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { VerificationBadge, Badge } from "@/components/ui/badge";
import { FilterChips, Pagination, SearchBar } from "@/components/ui/filters";
import { createClient } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/format";
import { ilikePattern, param, type SearchParams } from "@/lib/url";

export const metadata = { title: "Utilisateurs" };
const SIZE = 30;

export default async function UsersAdmin({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(param(sp, "page") ?? 1) || 1);
  const status = param(sp, "statut");
  const q = param(sp, "q");
  const showTest = param(sp, "test") === "1";
  const supabase = await createClient();
  let query = supabase
    .from("profiles")
    .select(
      "id, first_name, last_name, email, phone, uny_id, avatar_url, verification_status, role, created_at, last_seen_at, is_test_account, university:universities(short_name, name)",
      { count: "exact" },
    )
    .eq("is_test_account", showTest);
  if (status) query = query.eq("verification_status", status as "verified");
  if (q) {
    const p = ilikePattern(q);
    query = query.or(`first_name.ilike.${p},last_name.ilike.${p},email.ilike.${p},phone.ilike.${p},uny_id.ilike.${p}`);
  }
  const { data, count } = await query.order("created_at", { ascending: false }).range((page - 1) * SIZE, page * SIZE - 1);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-2xl font-extrabold tracking-tight">Utilisateurs</h1>
        <p className="text-muted text-sm">
          {(count ?? 0).toLocaleString("fr-FR")} {showTest ? "comptes de test" : "comptes réels"}
        </p>
      </div>
      <SearchBar
        pathname="/admin/utilisateurs"
        searchParams={sp}
        placeholder="Nom, email, téléphone, Uny ID…"
        keep={["statut", "test"]}
      />
      <FilterChips
        pathname="/admin/utilisateurs"
        searchParams={sp}
        name="statut"
        allLabel="Tous"
        options={[
          { value: "verified", label: "Vérifiés" },
          { value: "pending", label: "En cours" },
          { value: "unverified", label: "Non vérifiés" },
        ]}
      />
      <Link
        href={showTest ? "/admin/utilisateurs" : "/admin/utilisateurs?test=1"}
        className="text-brand-600 inline-block text-sm font-semibold"
      >
        {showTest ? "← Revenir aux comptes réels" : "Voir les comptes de test (synthétiques)"}
      </Link>
      <ul className="divide-line divide-y overflow-hidden rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)]">
        {(data ?? []).map((u) => (
          <li key={u.id}>
            <Link href={`/admin/utilisateurs/${u.id}`} className="hover:bg-canvas flex items-center gap-3 px-4 py-3">
              <Avatar src={u.avatar_url} first={u.first_name} last={u.last_name} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {u.first_name} {u.last_name}{" "}
                  {u.role === "admin" && (
                    <Badge tone="dark" className="ml-1">
                      Admin
                    </Badge>
                  )}
                  {u.is_test_account && (
                    <Badge tone="neutral" className="ml-1">
                      Test
                    </Badge>
                  )}
                </p>
                <p className="text-muted truncate text-xs">
                  {u.email} · {u.university?.short_name ?? u.university?.name ?? "—"}
                </p>
              </div>
              <div className="hidden shrink-0 text-right sm:block">
                <VerificationBadge status={u.verification_status} />
                <p className="text-muted mt-1 text-xs">inscrit {timeAgo(u.created_at)}</p>
              </div>
            </Link>
          </li>
        ))}
        {!data?.length && <li className="text-muted p-6 text-center text-sm">Aucun utilisateur.</li>}
      </ul>
      <Pagination pathname="/admin/utilisateurs" searchParams={sp} page={page} hasMore={(count ?? 0) > page * SIZE} />
    </div>
  );
}
