import type { Metadata } from "next";
import { DealCard, type DealCardData } from "@/components/content/cards";
import { FilterChips, Pagination, SearchBar } from "@/components/ui/filters";
import { PageTitle, SectionHeader } from "@/components/ui/section-header";
import { DealsTabs } from "@/components/content/deals-tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { DemoNotice } from "@/components/ui/demo-notice";
import { LinkButton } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { Rail } from "@/components/home/rail";
import { BrandRail } from "@/components/content/brand-tile";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dealShowcase, favoriteIds, listDeals } from "@/lib/queries";
import { getDistricts } from "@/lib/queries";
import { DEAL_CATEGORIES } from "@/lib/constants";
import { param, type SearchParams } from "@/lib/url";
import { resolveCity } from "@/lib/cities";
import { CityPicker } from "@/components/ui/city-picker";

export const metadata: Metadata = { title: "Avantages & réductions" };

const CHANNEL_OPTIONS = [
  { value: "en-ligne", label: "En ligne", emoji: "🌐" },
  { value: "magasin", label: "En magasin", emoji: "🏬" },
];

export default async function DealsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const profile = await requireProfile();
  const supabase = await createClient();
  const page = Math.max(1, Number(param(sp, "page") ?? 1) || 1);
  const category = param(sp, "categorie");
  const district = param(sp, "quartier");
  const channel = param(sp, "canal");
  const q = param(sp, "q");
  const { cities, city, slug } = await resolveCity(sp, profile.city_id);
  // Vitrine (façon UNiDAYS) seulement sur la première page, sans recherche ni filtre
  const browsing = !q && !category && !district && !channel && page === 1;

  const [{ items, hasMore }, favs, districts, showcase] = await Promise.all([
    listDeals({ category, district, q, page, cityId: city?.id, channel }),
    favoriteIds(supabase, profile.id, "deal"),
    getDistricts(city?.slug),
    browsing ? dealShowcase({ cityId: city?.id }) : Promise.resolve(null),
  ]);

  const rail = (title: string, testId: string, deals: DealCardData[], href?: string) =>
    deals.length > 0 && (
      <section data-testid={testId}>
        <SectionHeader title={title} href={href} />
        <Rail label={title}>
          {deals.map((d) => (
            <DealCard key={d.id} deal={d} compact favorite={favs.has(d.id)} />
          ))}
        </Rail>
      </section>
    );

  return (
    <div className="animate-fade-up">
      <DealsTabs current="/avantages" />
      <PageTitle
        title="Avantages"
        subtitle="Réductions réservées aux étudiants vérifiés : en magasin avec ton code, en ligne avec le lien de la marque."
      />
      <div className="space-y-3">
        <SearchBar
          pathname="/avantages"
          searchParams={sp}
          placeholder="Rechercher une offre…"
          keep={["categorie", "quartier", "ville", "canal"]}
        />
        <FilterChips pathname="/avantages" searchParams={sp} name="canal" allLabel="Partout" options={CHANNEL_OPTIONS} />
        <FilterChips
          pathname="/avantages"
          searchParams={sp}
          name="categorie"
          options={Object.entries(DEAL_CATEGORIES).map(([value, c]) => ({ value, label: c.label, emoji: c.emoji }))}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <CityPicker cities={cities} value={slug} />
          {districts.length > 0 && (
            <form action="/avantages" className="flex gap-2">
              {category && <input type="hidden" name="categorie" value={category} />}
              {channel && <input type="hidden" name="canal" value={channel} />}
              {q && <input type="hidden" name="q" value={q} />}
              <input type="hidden" name="ville" value={slug} />
              <Select name="quartier" defaultValue={district ?? ""} aria-label="Quartier" className="h-11 flex-1">
                <option value="">Tous les quartiers</option>
                {districts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
              <button className="bg-ink h-11 shrink-0 rounded-2xl px-4 text-sm font-semibold text-white">Filtrer</button>
            </form>
          )}
        </div>
      </div>

      {showcase && (
        <div className="mt-6 space-y-7" data-testid="deal-showcase">
          {rail("★ Exclusivités Uny", "rail-exclusives", showcase.exclusives)}
          {rail("🔥 Tendances", "rail-trending", showcase.trending)}
          {rail("⚡ Offres flash", "rail-flash", showcase.flash)}
          {rail("🌐 En ligne", "rail-online", showcase.online, "/avantages?canal=en-ligne")}
          {showcase.brands.length > 0 && (
            <section data-testid="rail-brands">
              <SectionHeader title="🏷️ Marques" href="/avantages/marques" linkLabel="Toutes les marques" />
              <BrandRail brands={showcase.brands.slice(0, 20)} />
            </section>
          )}
          {rail("✨ Nouveautés", "rail-newest", showcase.newest)}
        </div>
      )}

      <div className="mt-7">
        {showcase && <SectionHeader title="Toutes les offres" />}
        {items.length === 0 ? (
          <EmptyState
            emoji="🏷️"
            title="Aucune offre trouvée"
            text="Essaie une autre catégorie, un autre quartier ou les offres en ligne."
            action={
              <LinkButton href="/avantages" variant="secondary">
                Voir toutes les offres
              </LinkButton>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {items.map((d, i) => (
              <DealCard key={d.id} deal={d} favorite={favs.has(d.id)} priority={i < 2} />
            ))}
          </div>
        )}
        <Pagination pathname="/avantages" searchParams={sp} page={page} hasMore={hasMore} />
      </div>
      <DemoNotice className="mt-6" />
    </div>
  );
}
