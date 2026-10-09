import { EmptyState } from "@/components/ui/empty-state";
import { FilterChips, Pagination, SearchBar } from "@/components/ui/filters";
import { EnrollmentItem, type EnrollmentRow } from "@/components/university/enrollment-item";
import { createClient } from "@/lib/supabase/server";
import { requireUniversity } from "@/lib/university";
import { param, type SearchParams } from "@/lib/url";

export const metadata = { title: "Étudiants & cartes" };

const PER_PAGE = 30;
const FILTERS = {
  confirmes: ["verified"],
  refuses: ["rejected"],
  expires: ["expired"],
} as const;

export default async function StudentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const { university } = await requireUniversity();
  const filter = param(sp, "statut") as keyof typeof FILTERS | undefined;
  const q = param(sp, "q")?.slice(0, 60);
  const page = Math.max(1, Number(param(sp, "page")) || 1);
  const supabase = await createClient();
  const { data } = await supabase.rpc("university_enrollments", {
    p_university: university.id,
    p_status: filter && filter in FILTERS ? [...FILTERS[filter]] : ["verified", "rejected", "expired"],
    p_search: q,
    p_limit: PER_PAGE,
    p_offset: (page - 1) * PER_PAGE,
  });
  const rows = (data ?? []) as EnrollmentRow[];
  const total = rows[0]?.total ?? 0;

  return (
    <div className="animate-fade-up space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Étudiants & cartes</h1>
        <p className="text-muted mt-1 text-sm">
          Cartes émises pour vos étudiants. Expirez une carte (fin d&apos;inscription) ou révoquez-la (fraude, exclusion) :
          l&apos;étudiant est notifié et les partenaires voient immédiatement la carte comme non valable.
        </p>
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
          { value: "confirmes", label: "Confirmées" },
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
            <EnrollmentItem key={e.id} e={e} canDecide={university.partner_status === "partner"} />
          ))}
        </ul>
      )}
      <Pagination pathname="/universite/etudiants" searchParams={sp} page={page} hasMore={page * PER_PAGE < total} />
    </div>
  );
}
