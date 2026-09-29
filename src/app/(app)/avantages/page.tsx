import type { Metadata } from "next";
import { DealCard } from "@/components/content/cards";
import { FilterChips, Pagination, SearchBar } from "@/components/ui/filters";
import { PageTitle } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { DemoNotice } from "@/components/ui/demo-notice";
import { LinkButton } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { favoriteIds, listDeals } from "@/lib/queries";
import { getDistricts } from "@/lib/queries";
import { DEAL_CATEGORIES } from "@/lib/constants";
import { param, type SearchParams } from "@/lib/url";

export const metadata: Metadata = { title: "Avantages & réductions" };

export default async function DealsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const profile = await requireProfile();
  const supabase = await createClient();
  const page = Math.max(1, Number(param(sp, "page") ?? 1) || 1);
  const category = param(sp, "categorie");
  const district = param(sp, "quartier");
  const q = param(sp, "q");

  const [{ items, hasMore }, favs, districts] = await Promise.all([
    listDeals({ category, district, q, page }),
    favoriteIds(supabase, profile.id, "deal"),
    getDistricts(),
  ]);

  return (
    <div className="animate-fade-up">
      <PageTitle title="Avantages" subtitle="Réductions et tarifs étudiants chez les partenaires Uny." />
      <div className="space-y-3">
        <SearchBar pathname="/avantages" searchParams={sp} placeholder="Rechercher une offre…" keep={["categorie", "quartier"]} />
        <FilterChips
          pathname="/avantages"
          searchParams={sp}
          name="categorie"
          options={Object.entries(DEAL_CATEGORIES).map(([value, c]) => ({ value, label: c.label, emoji: c.emoji }))}
        />
        <form action="/avantages" className="flex gap-2">
          {category && <input type="hidden" name="categorie" value={category} />}
          {q && <input type="hidden" name="q" value={q} />}
          <Select name="quartier" defaultValue={district ?? ""} aria-label="Quartier" className="h-11 flex-1">
            <option value="">📍 Tous les quartiers</option>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
          <button className="h-11 shrink-0 rounded-2xl bg-ink px-4 text-sm font-semibold text-white">Filtrer</button>
        </form>
      </div>

      <div className="mt-5">
        {items.length === 0 ? (
          <EmptyState
            emoji="🏷️"
            title="Aucune offre trouvée"
            text="Essaie une autre catégorie ou un autre quartier."
            action={<LinkButton href="/avantages" variant="secondary">Voir toutes les offres</LinkButton>}
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
