import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { ItemCard } from "@/components/content/cards";
import { FilterChips, Pagination, SearchBar } from "@/components/ui/filters";
import { PageTitle } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { DemoNotice } from "@/components/ui/demo-notice";
import { LinkButton } from "@/components/ui/button";
import { listMarket } from "@/lib/queries";
import { MARKET_CATEGORIES } from "@/lib/constants";
import { param, type SearchParams } from "@/lib/url";

export const metadata: Metadata = { title: "Marketplace" };

export default async function MarketplacePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(param(sp, "page") ?? 1) || 1);
  const { items, hasMore } = await listMarket({ category: param(sp, "categorie"), q: param(sp, "q"), page });

  return (
    <div className="animate-fade-up">
      <PageTitle
        title="Marketplace"
        subtitle="Achète et vends entre étudiants."
        action={<LinkButton href="/marketplace/mes-annonces" variant="outline" size="sm">Mes annonces</LinkButton>}
      />
      <div className="space-y-3">
        <SearchBar pathname="/marketplace" searchParams={sp} placeholder="Téléphone, livre, ordinateur…" keep={["categorie"]} />
        <FilterChips
          pathname="/marketplace"
          searchParams={sp}
          name="categorie"
          options={Object.entries(MARKET_CATEGORIES).map(([value, c]) => ({ value, label: c.label, emoji: c.emoji }))}
        />
      </div>
      <div className="mt-5">
        {items.length === 0 ? (
          <EmptyState emoji="🛍️" title="Aucune annonce pour le moment" text="Sois le premier à publier dans cette catégorie !" action={<LinkButton href="/marketplace/nouveau">Publier une annonce</LinkButton>} />
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {items.map((m) => (
              <ItemCard key={m.id} item={m} />
            ))}
          </div>
        )}
        <Pagination pathname="/marketplace" searchParams={sp} page={page} hasMore={hasMore} />
      </div>
      <DemoNotice className="mt-6" />
      <LinkButton
        href="/marketplace/nouveau"
        size="lg"
        className="fixed right-4 bottom-24 z-30 rounded-full shadow-[var(--shadow-float)] lg:bottom-8"
        aria-label="Publier une annonce"
      >
        <Plus className="size-5" /> Vendre
      </LinkButton>
    </div>
  );
}
