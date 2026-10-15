import type { Metadata } from "next";
import { DealCard } from "@/components/content/cards";
import { PageTitle, SectionHeader } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DEAL_COLUMNS } from "@/lib/queries";
import type { DealCardData } from "@/components/content/cards";

export const metadata: Metadata = { title: "Mes favoris" };

export default async function FavoritesPage() {
  const p = await requireProfile();
  const supabase = await createClient();
  const { data } = await supabase
    .from("deal_favorites")
    .select(`created_at, deal:deals(${DEAL_COLUMNS})`)
    .eq("user_id", p.id)
    .order("created_at", { ascending: false });
  const d = (data ?? []).map((r) => r.deal as unknown as DealCardData | null).filter(Boolean) as DealCardData[];

  return (
    <div className="animate-fade-up space-y-7">
      <PageTitle title="Mes favoris" subtitle="Les avantages que tu as enregistrés." />
      {d.length === 0 ? (
        <EmptyState
          emoji="❤️"
          title="Aucun favori pour l'instant"
          text="Touche le cœur sur un avantage pour le retrouver ici."
          action={<LinkButton href="/avantages">Découvrir les avantages</LinkButton>}
        />
      ) : (
        <section>
          <SectionHeader title="🔥 Avantages" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {d.map((x) => (
              <DealCard key={x.id} deal={x} favorite />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
