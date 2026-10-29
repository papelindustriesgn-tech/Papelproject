import type { Metadata } from "next";
import { BackLink } from "@/components/ui/back-link";
import { PageTitle } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { BrandTile } from "@/components/content/brand-tile";
import { requireProfile } from "@/lib/auth";
import { resolveCity } from "@/lib/cities";
import { dealShowcase } from "@/lib/queries";
import type { SearchParams } from "@/lib/url";

export const metadata: Metadata = { title: "Marques partenaires" };

export default async function BrandsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const profile = await requireProfile();
  const { city } = await resolveCity(sp, profile.city_id);
  const { brands } = await dealShowcase({ cityId: city?.id });
  return (
    <div className="animate-fade-up">
      <BackLink href="/avantages" label="Avantages" />
      <PageTitle title="Marques" subtitle="Toutes les marques qui proposent une réduction aux étudiants Uny." />
      {brands.length === 0 ? (
        <EmptyState emoji="🏷️" title="Aucune marque pour l'instant" text="Les marques partenaires apparaîtront ici." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {brands.map((b) => (
            <BrandTile key={b.id} brand={b} />
          ))}
        </div>
      )}
    </div>
  );
}
