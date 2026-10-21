import { EmptyState } from "@/components/ui/empty-state";
import { FilterChips, Pagination, SearchBar } from "@/components/ui/filters";
import { EnrollmentItem, type EnrollmentRow } from "@/components/university/enrollment-item";
import { createClient } from "@/lib/supabase/server";
import { requireUniversity, universityCan } from "@/lib/university";
import { RestrictedNotice } from "@/components/university/restricted-notice";
import { param, type SearchParams } from "@/lib/url";
import { isoDateInDays } from "@/lib/format";

export const metadata = { title: "Étudiants & cartes" };

const PER_PAGE = 30;
const FILTERS = {
  confirmes: ["verified"],
  "a-renouveler": ["verified"],
  "a-completer": ["incomplete"],
  refuses: ["rejected"],
  expires: ["expired"],
} as const;

export default async function StudentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const { university } = await requireUniversity();
  if (!universityCan(university, "read")) return <RestrictedNotice university={university} title="Étudiants & cartes" />;
  const filter = param(sp, "statut") as keyof typeof FILTERS | undefined;
  const q = param(sp, "q")?.slice(0, 60);
  const page = Math.max(1, Number(param(sp, "page")) || 1);
  const renewals = filter === "a-renouveler";
  const supabase = await createClient();
  const { data } = await supabase.rpc("university_enrollments", {
    p_university: university.id,
    p_status: filter && filter in FILTERS ? [...FILTERS[filter]] : ["verified", "incomplete", "rejected", "expired"],
    p_search: q,
    p_limit: renewals ? 200 : PER_PAGE,
    p_offset: renewals ? 0 : (page - 1) * PER_PAGE,
  });
  let rows = (data ?? []) as EnrollmentRow[];
  // Cartes à renouveler : inscriptions validées qui expirent dans les 30 jours
  if (renewals) {
    const limit = isoDateInDays(30);
    rows = rows.filter((r) => r.expires_at && r.expires_at <= limit);
  }
  const total = renewals ? rows.length : (rows[0]?.total ?? 0);

  return (
    <div className="animate-fade-up space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Étudiants & cartes</h1>
        <p className="text-muted mt-1 text-sm">
          Cartes émises pour vos étudiants. Expirez une carte (fin d&apos;inscription) ou révoquez-la (fraude, exclusion) :
          l&apos;étudiant est notifié et les partenaires voient immédiatement la carte comme non valable.
        </p>
        <a href="/universite/etudiants/export" className="text-brand-600 mt-2 inline-block text-sm font-semibold" download>
          ⬇ Exporter la liste (Excel)
        </a>
      </div>
      <SearchBar
        pathname="/universite/etudiants"
        searchParams={sp}
        placeholder="Nom, matricule ou identifiant Uny"
        keep={["statut"]}
      />
      <FilterChips
        pathname="/universite/etudiants"
        searchParams={sp}
        name="statut"
        allLabel="Toutes"
        options={[
          { value: "confirmes", label: "Validées" },
          { value: "a-renouveler", label: "À renouveler" },
          { value: "a-completer", label: "À compléter" },
          { value: "refuses", label: "Refusées / révoquées" },
          { value: "expires", label: "Expirées" },
        ]}
      />
      <p className="text-muted text-sm">
        {total.toLocaleString("fr-FR")} résultat{total > 1 ? "s" : ""}
      </p>
      {rows.length === 0 ? (
        <EmptyState emoji="🎓" title="Aucun étudiant" text="Les inscriptions confirmées apparaîtront ici." />
      ) : (
        <ul className="grid gap-4 xl:grid-cols-2">
          {rows.map((e) => (
            <EnrollmentItem key={e.id} e={e} canDecide={universityCan(university, "decide")} />
          ))}
        </ul>
      )}
      <Pagination pathname="/universite/etudiants" searchParams={sp} page={page} hasMore={page * PER_PAGE < total} />
    </div>
  );
}
