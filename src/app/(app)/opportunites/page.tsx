import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HousingCard, ItemCard, JobCard } from "@/components/content/cards";
import { OpportunityTabs } from "@/components/content/opportunity-tabs";
import { PageTitle } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { DemoNotice } from "@/components/ui/demo-notice";
import { requireProfile } from "@/lib/auth";
import { listHousing, listJobs, listMarket } from "@/lib/queries";

export const metadata: Metadata = { title: "Opportunités" };

function Section({ title, href, children, empty }: { title: string; href: string; children: React.ReactNode; empty: boolean }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">{title}</h2>
        <Link href={href} className="text-brand-600 flex items-center gap-1 text-sm font-semibold">
          Tout voir <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      {empty ? <p className="text-muted text-sm">Rien pour le moment : de nouvelles annonces arrivent régulièrement.</p> : children}
    </section>
  );
}

/** Rubrique « Opportunités » : jobs et stages, logement, marketplace. */
export default async function OpportunitiesPage() {
  const profile = await requireProfile();
  const cityId = profile.city_id ?? undefined;
  const [jobs, homes, market] = await Promise.all([
    listJobs({ page: 1, cityId }),
    listHousing({ page: 1, cityId }),
    listMarket({ page: 1, cityId }),
  ]);
  const nothing = !jobs.items.length && !homes.items.length && !market.items.length;

  return (
    <div className="animate-fade-up space-y-6">
      <div>
        <OpportunityTabs />
        <PageTitle title="Opportunités" subtitle="Jobs et stages, logement, et bonnes affaires entre étudiants." />
      </div>
      {nothing ? (
        <EmptyState emoji="🧭" title="Pas encore d'annonce près de chez toi" text="Reviens bientôt ou change de ville." />
      ) : (
        <>
          <Section title="Jobs & stages" href="/jobs" empty={!jobs.items.length}>
            <div className="grid gap-3 md:grid-cols-2">
              {jobs.items.slice(0, 4).map((j) => (
                <JobCard key={j.id} job={j} compact />
              ))}
            </div>
          </Section>
          <Section title="Logement" href="/logement" empty={!homes.items.length}>
            <div className="grid gap-3 sm:grid-cols-2">
              {homes.items.slice(0, 4).map((h) => (
                <HousingCard key={h.id} home={h} />
              ))}
            </div>
          </Section>
          <Section title="Marketplace" href="/marketplace" empty={!market.items.length}>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {market.items.slice(0, 4).map((m) => (
                <ItemCard key={m.id} item={m} compact />
              ))}
            </div>
          </Section>
        </>
      )}
      <DemoNotice />
    </div>
  );
}
