import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Smartphone, Store } from "lucide-react";
import { PageTitle, SectionHeader } from "@/components/ui/section-header";
import { SearchBar } from "@/components/ui/filters";
import { BrandRail } from "@/components/content/brand-tile";
import { requireProfile } from "@/lib/auth";
import { resolveCity } from "@/lib/cities";
import { dealShowcase } from "@/lib/queries";
import { DEAL_CATEGORIES } from "@/lib/constants";
import type { SearchParams } from "@/lib/url";

export const metadata: Metadata = { title: "Explorer les offres" };

/** Explorer (façon UNiDAYS) : recherche, façon d'utiliser l'offre, catégories et marques. */
export default async function ExplorePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const profile = await requireProfile();
  const { city } = await resolveCity(sp, profile.city_id);
  const { brands } = await dealShowcase({ cityId: city?.id });
  const tile =
    "flex items-center gap-3 rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5";

  return (
    <div className="animate-fade-up space-y-7">
      <div>
        <PageTitle title="Explorer" subtitle="Trouve une réduction par catégorie, par marque ou par recherche." />
        <SearchBar pathname="/avantages" searchParams={{}} placeholder="Rechercher une offre…" />
      </div>

      <section>
        <SectionHeader title="Comment en profiter" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/avantages?canal=magasin" className={tile} data-testid="explore-in-store">
            <Store className="text-brand-600 size-7 shrink-0" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block font-bold">En magasin</span>
              <span className="text-muted text-sm">Montre ton code ou ta carte Uny en caisse.</span>
            </span>
            <ChevronRight className="text-muted size-5" aria-hidden />
          </Link>
          <Link href="/avantages?canal=a-distance" className={tile} data-testid="explore-remote">
            <Smartphone className="text-brand-600 size-7 shrink-0" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block font-bold">À distance</span>
              <span className="text-muted text-sm">Commande par WhatsApp, appel ou réseaux sociaux.</span>
            </span>
            <ChevronRight className="text-muted size-5" aria-hidden />
          </Link>
        </div>
      </section>

      <section>
        <SectionHeader title="Catégories" href="/avantages" linkLabel="Toutes les offres" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="explore-categories">
          {Object.entries(DEAL_CATEGORIES).map(([value, c]) => (
            <Link
              key={value}
              href={`/avantages?categorie=${value}`}
              className="flex flex-col items-center gap-2 rounded-[var(--radius-card)] bg-white p-4 text-center shadow-[var(--shadow-card)] transition hover:-translate-y-0.5"
            >
              <span className="text-3xl" aria-hidden>
                {c.emoji}
              </span>
              <span className="text-sm font-bold">{c.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {brands.length > 0 && (
        <section>
          <SectionHeader title="Marques" href="/avantages/marques" linkLabel="Toutes les marques" />
          <BrandRail brands={brands.slice(0, 20)} />
        </section>
      )}
    </div>
  );
}
