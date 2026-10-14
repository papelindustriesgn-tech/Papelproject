import { SURVEY_MIN_VERSION } from "@/lib/survey";
import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquareHeart } from "lucide-react";
import { MiniPass } from "@/components/home/mini-pass";
import { JourneyProgress, NextStepCard } from "@/components/home/journey";
import { Rail } from "@/components/home/rail";
import { DealCard, ItemCard } from "@/components/content/cards";
import { SectionHeader } from "@/components/ui/section-header";
import { FormMessage } from "@/components/ui/field";
import { DemoNotice } from "@/components/ui/demo-notice";
import { requireProfile, universityLabel } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { favoriteIds, listDeals, listMarket } from "@/lib/queries";
import { getJourney } from "@/lib/journey";
import { param, type SearchParams } from "@/lib/url";

export const metadata: Metadata = { title: "Accueil" };

export default async function HomePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const profile = await requireProfile();
  const supabase = await createClient();

  const [latest, market, favDeals, survey, journey] = await Promise.all([
    listDeals({ cityId: profile.city_id ?? undefined }),
    listMarket({ cityId: profile.city_id ?? undefined, view: "promos" }),
    favoriteIds(supabase, profile.id, "deal"),
    supabase.from("survey_responses").select("version").eq("user_id", profile.id).maybeSingle(),
    getJourney(supabase, profile),
  ]);
  const showDemoNotice = latest.items.some((d) => d.is_demo) || market.items.some((m) => m.is_demo);
  const askSurvey = !survey.error && (!survey.data || survey.data.version < SURVEY_MIN_VERSION);
  const featured = { items: latest.items.filter((d) => d.is_featured) };
  const newest = latest.items.filter((d) => !d.is_featured).slice(0, 4);
  const hour = new Date().toLocaleString("fr-FR", { hour: "numeric", hour12: false, timeZone: "Africa/Conakry" });
  const greeting = Number(hour) >= 18 ? "Bonsoir" : "Bonjour";

  return (
    <div className="animate-fade-up space-y-6">
      <section>
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">
          {greeting} {profile.first_name} 👋
        </h1>
        <p className="text-muted mt-1 text-sm">
          Ta carte Uny prouve que tu es étudiant et te donne des réductions chez nos partenaires
          {profile.city?.name ? ` à ${profile.city.name}` : " en Guinée"}.
        </p>
      </section>

      {param(sp, "bienvenue") && (
        <FormMessage type="success">Bienvenue sur Uny ! Ton compte est créé et ta carte est prête 🎉</FormMessage>
      )}
      {param(sp, "mdp") && <FormMessage type="success">Ton mot de passe a bien été modifié.</FormMessage>}

      <section className="space-y-4">
        <JourneyProgress current={journey.current} />
        <NextStepCard journey={journey} />
      </section>

      <section className="max-w-md">
        <MiniPass
          first={profile.first_name}
          last={profile.last_name}
          avatar={profile.avatar_url}
          unyId={profile.uny_id}
          status={profile.verification_status}
          university={universityLabel(profile)}
        />
      </section>

      {featured.items.length > 0 && (
        <section>
          <SectionHeader title="🔥 Meilleures réductions" href="/avantages" />
          <Rail label="Meilleures réductions">
            {featured.items.map((d, i) => (
              <DealCard key={d.id} deal={d} compact favorite={favDeals.has(d.id)} priority={i === 0} />
            ))}
          </Rail>
        </section>
      )}

      {newest.length > 0 && (
        <section>
          <SectionHeader title="✨ Nouvelles offres" href="/avantages" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {newest.map((d) => (
              <DealCard key={d.id} deal={d} favorite={favDeals.has(d.id)} />
            ))}
          </div>
        </section>
      )}

      {market.items.length > 0 && (
        <section>
          <SectionHeader title="🛍️ Articles en promo" href="/marketplace" />
          <Rail label="Articles en promo">
            {market.items.slice(0, 10).map((m) => (
              <ItemCard key={m.id} item={m} compact />
            ))}
          </Rail>
        </section>
      )}

      {askSurvey && (
        <Link
          href="/avis"
          className="text-muted ring-line hover:text-ink flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm ring-1 transition"
        >
          <MessageSquareHeart className="text-brand-600 size-5 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1">
            <strong className="text-ink">Ton avis compte :</strong> 5 questions pour choisir les réductions qu&apos;on négocie
            pour toi.
          </span>
        </Link>
      )}

      {showDemoNotice && <DemoNotice />}
    </div>
  );
}
