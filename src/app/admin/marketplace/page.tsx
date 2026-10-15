import Image from "@/components/ui/safe-image";
import Link from "next/link";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { FilterChips, SearchBar } from "@/components/ui/filters";
import { ModerateForm } from "@/components/admin/moderate-form";
import { createClient } from "@/lib/supabase/server";
import { formatGNF, timeAgo } from "@/lib/format";
import { MARKET_CATEGORIES } from "@/lib/constants";
import { ilikePattern, param, type SearchParams } from "@/lib/url";

export const metadata = { title: "Modération marketplace" };

export default async function MarketAdmin({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const status = param(sp, "statut");
  const q = param(sp, "q");
  const supabase = await createClient();
  let query = supabase
    .from("marketplace_items")
    .select(
      "id, title, category, price_gnf, status, is_demo, view_count, created_at, moderation_note, seller:profiles(id, first_name, last_name), images:marketplace_images(url, position)",
    );
  if (status) query = query.eq("status", status as "active");
  if (q) query = query.ilike("title", ilikePattern(q));
  const { data } = await query.order("created_at", { ascending: false }).limit(100);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold tracking-tight">Modération marketplace</h1>
      <SearchBar pathname="/admin/marketplace" searchParams={sp} placeholder="Rechercher une annonce…" keep={["statut"]} />
      <FilterChips
        pathname="/admin/marketplace"
        searchParams={sp}
        name="statut"
        allLabel="Toutes"
        options={[
          { value: "active", label: "En ligne" },
          { value: "sold", label: "Vendues" },
          { value: "hidden", label: "Masquées" },
          { value: "removed", label: "Retirées" },
        ]}
      />
      <ul className="space-y-3">
        {(data ?? []).map((it) => {
          const cover = [...(it.images ?? [])].sort((a, b) => a.position - b.position)[0]?.url;
          return (
            <li key={it.id} className="rounded-[var(--radius-card)] bg-white p-3 shadow-[var(--shadow-card)]">
              <div className="flex gap-3">
                <Link href={`/marketplace/${it.id}`} className="bg-canvas relative size-16 shrink-0 overflow-hidden rounded-xl">
                  {cover && <Image src={cover} alt="" fill sizes="64px" className="object-cover" />}
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{it.title}</p>
                  <p className="text-muted truncate text-xs">
                    {formatGNF(it.price_gnf)} · {MARKET_CATEGORIES[it.category].label} · {it.view_count} vues ·{" "}
                    {timeAgo(it.created_at)}
                  </p>
                  <p className="text-muted truncate text-xs">
                    Vendeur :{" "}
                    {it.seller ? (
                      <Link className="text-brand-600 font-semibold" href={`/admin/utilisateurs/${it.seller.id}`}>
                        {it.seller.first_name} {it.seller.last_name}
                      </Link>
                    ) : (
                      "— (démo)"
                    )}
                  </p>
                  <div className="mt-1 flex gap-1">
                    <Badge tone={it.status === "active" ? "mint" : it.status === "removed" ? "coral" : "neutral"}>
                      {it.status}
                    </Badge>
                    {it.is_demo && <DemoBadge />}
                  </div>
                  {it.moderation_note && <p className="text-coral-600 mt-1 text-xs">Motif : {it.moderation_note}</p>}
                </div>
              </div>
              <div className="border-line mt-3 border-t pt-3">
                <ModerateForm id={it.id} status={it.status} />
              </div>
            </li>
          );
        })}
        {!data?.length && <li className="text-muted p-6 text-center text-sm">Aucune annonce.</li>}
      </ul>
    </div>
  );
}
