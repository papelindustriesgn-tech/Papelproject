import type { Metadata } from "next";
import { HousingCard } from "@/components/content/cards";
import { FilterChips, Pagination } from "@/components/ui/filters";
import { PageTitle } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { DemoNotice } from "@/components/ui/demo-notice";
import { LinkButton } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { favoriteIds, listHousing } from "@/lib/queries";
import { getDistricts } from "@/lib/queries";
import { HOUSING_BUDGETS, HOUSING_TYPES } from "@/lib/constants";
import { param, type SearchParams } from "@/lib/url";

export const metadata: Metadata = { title: "Logement étudiant" };

export default async function HousingPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const profile = await requireProfile();
  const supabase = await createClient();
  const page = Math.max(1, Number(param(sp, "page") ?? 1) || 1);
  const type = param(sp, "type");
  const district = param(sp, "quartier");
  const budget = param(sp, "budget");
  const available = param(sp, "dispo") === "1";

  const [{ items, hasMore }, favs, districts] = await Promise.all([
    listHousing({ type, district, max: budget ? Number(budget) : undefined, available, page }),
    favoriteIds(supabase, profile.id, "housing"),
    getDistricts(),
  ]);

  return (
    <div className="animate-fade-up">
      <PageTitle title="Logement" subtitle="Chambres, studios, colocations et appartements à Conakry." />
      <div className="space-y-3">
        <FilterChips
          pathname="/logement"
          searchParams={sp}
          name="type"
          options={Object.entries(HOUSING_TYPES).map(([value, t]) => ({ value, label: t.label, emoji: t.emoji }))}
        />
        <form action="/logement" className="grid grid-cols-2 gap-2 md:grid-cols-[1fr_1fr_auto_auto]">
          {type && <input type="hidden" name="type" value={type} />}
          <Select name="budget" defaultValue={budget ?? ""} aria-label="Budget maximum" className="h-11">
            <option value="">💰 Budget</option>
            {HOUSING_BUDGETS.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </Select>
          <Select name="quartier" defaultValue={district ?? ""} aria-label="Quartier" className="h-11">
            <option value="">📍 Quartier</option>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
          <label className="border-line flex h-11 items-center gap-2 rounded-2xl border bg-white px-3 text-sm font-semibold">
            <input type="checkbox" name="dispo" value="1" defaultChecked={available} className="accent-brand-600 size-4" />
            Disponible
          </label>
          <button className="bg-ink h-11 rounded-2xl px-4 text-sm font-semibold text-white">Filtrer</button>
        </form>
      </div>

      <div className="mt-5">
        {items.length === 0 ? (
          <EmptyState
            emoji="🏠"
            title="Aucun logement ne correspond"
            text="Élargis ton budget ou change de quartier."
            action={
              <LinkButton href="/logement" variant="secondary">
                Réinitialiser les filtres
              </LinkButton>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((h) => (
              <HousingCard key={h.id} home={h} favorite={favs.has(h.id)} />
            ))}
          </div>
        )}
        <Pagination pathname="/logement" searchParams={sp} page={page} hasMore={hasMore} />
      </div>
      <DemoNotice className="mt-6" />
    </div>
  );
}
