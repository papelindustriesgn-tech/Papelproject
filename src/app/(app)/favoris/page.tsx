import type { Metadata } from "next";
import { DealCard, HousingCard, JobCard } from "@/components/content/cards";
import { PageTitle, SectionHeader } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DEAL_COLUMNS, HOUSING_COLUMNS, JOB_COLUMNS } from "@/lib/queries";
import type { DealCardData, HousingCardData, JobCardData } from "@/components/content/cards";

export const metadata: Metadata = { title: "Mes favoris" };

export default async function FavoritesPage() {
  const p = await requireProfile();
  const supabase = await createClient();
  const [deals, jobs, homes, apps] = await Promise.all([
    supabase
      .from("deal_favorites")
      .select(`created_at, deal:deals(${DEAL_COLUMNS})`)
      .eq("user_id", p.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("job_favorites")
      .select(`created_at, job:jobs(${JOB_COLUMNS})`)
      .eq("user_id", p.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("housing_favorites")
      .select(`created_at, home:housing(${HOUSING_COLUMNS})`)
      .eq("user_id", p.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("job_applications")
      .select(`created_at, job:jobs(${JOB_COLUMNS})`)
      .eq("user_id", p.id)
      .order("created_at", { ascending: false }),
  ]);
  const d = (deals.data ?? []).map((r) => r.deal as unknown as DealCardData | null).filter(Boolean) as DealCardData[];
  const j = (jobs.data ?? []).map((r) => r.job as unknown as JobCardData | null).filter(Boolean) as JobCardData[];
  const h = (homes.data ?? []).map((r) => r.home as unknown as HousingCardData | null).filter(Boolean) as HousingCardData[];
  const a = (apps.data ?? []).map((r) => r.job as unknown as JobCardData | null).filter(Boolean) as JobCardData[];
  const empty = !d.length && !j.length && !h.length && !a.length;

  return (
    <div className="animate-fade-up space-y-7">
      <PageTitle title="Mes favoris" subtitle="Offres, jobs et logements que tu as enregistrés." />
      {empty && (
        <EmptyState
          emoji="❤️"
          title="Aucun favori pour l'instant"
          text="Touche le cœur sur une offre, un job ou un logement pour le retrouver ici."
          action={<LinkButton href="/avantages">Découvrir les avantages</LinkButton>}
        />
      )}
      {d.length > 0 && (
        <section>
          <SectionHeader title="🔥 Avantages" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {d.map((x) => (
              <DealCard key={x.id} deal={x} favorite />
            ))}
          </div>
        </section>
      )}
      {j.length > 0 && (
        <section id="jobs">
          <SectionHeader title="💼 Jobs enregistrés" />
          <div className="grid gap-3 md:grid-cols-2">
            {j.map((x) => (
              <JobCard key={x.id} job={x} favorite />
            ))}
          </div>
        </section>
      )}
      {a.length > 0 && (
        <section>
          <SectionHeader title="📨 Mes candidatures" />
          <div className="grid gap-3 md:grid-cols-2">
            {a.map((x) => (
              <JobCard key={x.id} job={x} />
            ))}
          </div>
        </section>
      )}
      {h.length > 0 && (
        <section>
          <SectionHeader title="🏠 Logements" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {h.map((x) => (
              <HousingCard key={x.id} home={x} favorite />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
