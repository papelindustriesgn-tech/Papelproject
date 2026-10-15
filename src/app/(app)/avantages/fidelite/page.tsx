import type { Metadata } from "next";
import Link from "next/link";
import { Gift } from "lucide-react";
import { DealsTabs } from "@/components/content/deals-tabs";
import { PageTitle } from "@/components/ui/section-header";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/cn";
import { timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Mes cartes de fidélité" };

export default async function LoyaltyCardsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const [{ data: cards }, { data: programs }] = await Promise.all([
    supabase
      .from("loyalty_cards")
      .select("id, partner_id, stamps, rewards_available, total_visits, last_visit_at, partner:partners(name, logo_url)")
      .eq("student_id", profile.id)
      .order("last_visit_at", { ascending: false, nullsFirst: false }),
    supabase
      .from("loyalty_programs")
      .select("partner_id, stamps_required, reward, partner:partners!inner(name, is_active, is_demo)")
      .eq("is_active", true)
      .eq("partner.is_active", true),
  ]);
  const byPartner = new Map((programs ?? []).map((p) => [p.partner_id, p]));
  const mine = (cards ?? []).filter((c) => byPartner.has(c.partner_id));
  const others = (programs ?? []).filter((p) => !(cards ?? []).some((c) => c.partner_id === p.partner_id));

  return (
    <div className="animate-fade-up">
      <DealsTabs current="/avantages/fidelite" />
      <PageTitle
        title="Mes cartes de fidélité"
        subtitle="Un tampon à chaque passage validé chez un partenaire. Au palier, ta récompense est débloquée."
      />

      {mine.length === 0 ? (
        <p className="text-muted ring-line rounded-2xl bg-white p-5 text-center text-sm ring-1">
          Tu n&apos;as pas encore de tampon. Montre ta carte Uny ou ton code promo chez un partenaire : ta carte de fidélité
          démarre au premier passage.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {mine.map((c) => {
            const p = byPartner.get(c.partner_id)!;
            return (
              <li
                key={c.id}
                className="rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-card)]"
                data-testid="loyalty-card"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-bold">{c.partner?.name}</p>
                    <p className="text-muted text-xs">
                      {c.total_visits} passage{c.total_visits > 1 ? "s" : ""}
                      {c.last_visit_at && ` · dernier ${timeAgo(c.last_visit_at)}`}
                    </p>
                  </div>
                  <span className="text-brand-700 shrink-0 text-sm font-extrabold">
                    {c.stamps}/{p.stamps_required}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5" aria-hidden>
                  {Array.from({ length: p.stamps_required }).map((_, i) => (
                    <span key={i} className={cn("size-6 rounded-full", i < c.stamps ? "bg-brand-600" : "bg-brand-50")} />
                  ))}
                </div>
                <p className="text-muted mt-3 text-sm">
                  Récompense : <strong className="text-ink">{p.reward}</strong>
                </p>
                {c.rewards_available > 0 && (
                  <p className="bg-mint-50 text-mint-700 mt-2 rounded-xl px-3 py-2 text-sm font-bold">
                    🎁 {c.rewards_available} récompense{c.rewards_available > 1 ? "s" : ""} à utiliser : montre ta carte Uny au
                    comptoir.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {others.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 flex items-center gap-2 font-bold">
            <Gift className="text-brand-600 size-5" aria-hidden /> Partenaires qui récompensent ta fidélité
          </h2>
          <ul className="divide-line divide-y rounded-[var(--radius-card)] bg-white px-4 shadow-[var(--shadow-card)]">
            {others.map((p) => (
              <li key={p.partner_id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span className="font-semibold">{p.partner?.name}</span>
                <span className="text-muted text-right">
                  {p.stamps_required} passages = {p.reward}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-muted mt-6 text-center text-xs">
        <Link href="/avantages" className="text-brand-600 font-semibold">
          Voir les offres
        </Link>
      </p>
    </div>
  );
}
