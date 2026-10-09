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
import { requireProfile } from "@/lib/auth";
import { resolveCity } from "@/lib/cities";
import { CityPicker } from "@/components/ui/city-picker";
import Link from "next/link";
import { withParams } from "@/lib/url";
import { cn } from "@/lib/cn";

const VIEWS = [
  { value: null, label: "🔥 Promos" },
  { value: "etudiants", label: "🎓 Entre étudiants" },
  { value: "tout", label: "Tout" },
] as const;

export const metadata: Metadata = { title: "Marketplace" };

export default async function MarketplacePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(param(sp, "page") ?? 1) || 1);
  const profile = await requireProfile();
  const { cities, city, slug } = await resolveCity(sp, profile.city_id);
  // Une recherche sans rubrique choisie porte sur toute la marketplace
  const vue = param(sp, "vue") ?? (param(sp, "q") ? "tout" : undefined);
  const view = vue === "etudiants" ? "etudiants" : vue === "tout" ? undefined : "promos";
  const filters = { category: param(sp, "categorie"), q: param(sp, "q"), page, cityId: city?.id };
  let { items, hasMore } = await listMarket({ ...filters, view });
  // Pas encore de promo dans cette ville / catégorie : on montre toutes les annonces plutôt qu'une page vide
  const fallback = view === "promos" && !param(sp, "vue") && items.length === 0;
  if (fallback) ({ items, hasMore } = await listMarket(filters));

  return (
    <div className="animate-fade-up">
      <PageTitle
        title="Marketplace"
        subtitle="Les promotions des partenaires Uny, et les bonnes affaires entre étudiants."
        action={
          <LinkButton href="/marketplace/mes-annonces" variant="outline" size="sm">
            Mes annonces
          </LinkButton>
        }
      />
      <div className="space-y-3">
        <nav aria-label="Rubriques" className="bg-canvas ring-line grid grid-cols-3 gap-1 rounded-2xl p-1 ring-1">
          {VIEWS.map((v) => {
            const active = (v.value ?? null) === (vue === "etudiants" || vue === "tout" ? vue : null);
            return (
              <Link
                key={v.label}
                href={withParams("/marketplace", sp, { vue: v.value, page: null })}
                aria-current={active ? "page" : undefined}
                scroll={false}
                className={cn(
                  "rounded-xl px-2 py-2 text-center text-sm font-bold transition",
                  active ? "text-ink bg-white shadow-sm" : "text-muted hover:text-ink",
                )}
              >
                {v.label}
              </Link>
            );
          })}
        </nav>
        <SearchBar
          pathname="/marketplace"
          searchParams={sp}
          placeholder="Téléphone, livre, ordinateur…"
          keep={["categorie", "ville", "vue"]}
        />
        <CityPicker cities={cities} value={slug} />
        <FilterChips
          pathname="/marketplace"
          searchParams={sp}
          name="categorie"
          options={Object.entries(MARKET_CATEGORIES).map(([value, c]) => ({ value, label: c.label, emoji: c.emoji }))}
        />
      </div>
      <div className="mt-5">
        {fallback && items.length > 0 && (
          <p className="bg-mango-50 text-mango-700 mb-4 rounded-2xl p-3 text-sm font-semibold">
            🔥 Pas encore de promo partenaire ici : voici toutes les annonces en attendant.
          </p>
        )}
        {items.length === 0 ? (
          view === "promos" ? (
            <EmptyState
              emoji="🔥"
              title="Pas encore de promo ici"
              text="Les partenaires Uny publient leurs promotions étudiantes au fil des jours. En attendant, regarde les annonces entre étudiants."
              action={<LinkButton href="/marketplace?vue=tout">Voir toutes les annonces</LinkButton>}
            />
          ) : (
            <EmptyState
              emoji="🛍️"
              title="Aucune annonce pour le moment"
              text="Sois le premier à publier dans cette catégorie !"
              action={<LinkButton href="/marketplace/nouveau">Publier une annonce</LinkButton>}
            />
          )
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
