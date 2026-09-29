import type { Metadata } from "next";
import { JobCard } from "@/components/content/cards";
import { FilterChips, Pagination, SearchBar } from "@/components/ui/filters";
import { PageTitle } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { DemoNotice } from "@/components/ui/demo-notice";
import { LinkButton } from "@/components/ui/button";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { favoriteIds, listJobs } from "@/lib/queries";
import { JOB_TYPES } from "@/lib/constants";
import { param, type SearchParams } from "@/lib/url";

export const metadata: Metadata = { title: "Jobs & opportunités" };

export default async function JobsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const profile = await requireProfile();
  const supabase = await createClient();
  const page = Math.max(1, Number(param(sp, "page") ?? 1) || 1);
  const [{ items, hasMore }, favs] = await Promise.all([
    listJobs({ type: param(sp, "type"), q: param(sp, "q"), page }),
    favoriteIds(supabase, profile.id, "job"),
  ]);

  return (
    <div className="animate-fade-up">
      <PageTitle
        title="Jobs & opportunités"
        subtitle="Jobs étudiants, stages, bourses, concours et formations."
        action={<LinkButton href="/favoris#jobs" variant="outline" size="sm">Mes favoris</LinkButton>}
      />
      <div className="space-y-3">
        <SearchBar pathname="/jobs" searchParams={sp} placeholder="Poste, entreprise…" keep={["type"]} />
        <FilterChips
          pathname="/jobs"
          searchParams={sp}
          name="type"
          options={Object.entries(JOB_TYPES).map(([value, t]) => ({ value, label: t.label, emoji: t.emoji }))}
        />
      </div>
      <div className="mt-5">
        {items.length === 0 ? (
          <EmptyState emoji="💼" title="Aucune opportunité trouvée" text="Change de filtre ou reviens bientôt : de nouvelles annonces arrivent chaque semaine." action={<LinkButton href="/jobs" variant="secondary">Tout voir</LinkButton>} />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {items.map((j) => (
              <JobCard key={j.id} job={j} favorite={favs.has(j.id)} />
            ))}
          </div>
        )}
        <Pagination pathname="/jobs" searchParams={sp} page={page} hasMore={hasMore} />
      </div>
      <DemoNotice className="mt-6" />
    </div>
  );
}
