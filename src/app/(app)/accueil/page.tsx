import { SURVEY_MIN_VERSION } from "@/lib/survey";
import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquareHeart } from "lucide-react";
import { MiniPass } from "@/components/home/mini-pass";
import { NextStepCard } from "@/components/home/journey";
import { formatGNF, isoDateInDays } from "@/lib/format";
import { Rail } from "@/components/home/rail";
import { DealCard, ItemCard } from "@/components/content/cards";
import { SectionHeader } from "@/components/ui/section-header";
import { FormMessage } from "@/components/ui/field";
import { DemoNotice } from "@/components/ui/demo-notice";
import { requireProfile, universityLabel } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { favoriteIds, listDeals, listMarket } from "@/lib/queries";
import { getJourney } from "@/lib/journey";
import { isFlashActive } from "@/lib/flash";
import { param, type SearchParams } from "@/lib/url";

export const metadata: Metadata = { title: "Accueil" };

export default async function HomePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const profile = await requireProfile();
  const supabase = await createClient();

  const [latest, market, favDeals, survey, journey, announcements] = await Promise.all([
    listDeals({ cityId: profile.city_id ?? undefined }),
    listMarket({ cityId: profile.city_id ?? undefined, view: "promos" }),
    favoriteIds(supabase, profile.id, "deal"),
    supabase.from("survey_responses").select("version").eq("user_id", profile.id).maybeSingle(),
    getJourney(supabase, profile),
    // Annonces importantes de l'établissement (reçues en notification, 30 derniers jours)
    supabase
      .from("notifications")
      .select("id, title, body, created_at, read_at")
      .eq("user_id", profile.id)
      .eq("type", "university_announcement")
      .gte("created_at", isoDateInDays(-30))
      .order("created_at", { ascending: false })
      .limit(2),
  ]);
  const showDemoNotice = latest.items.some((d) => d.is_demo) || market.items.some((m) => m.is_demo);
  const askSurvey = !survey.error && (!survey.data || survey.data.version < SURVEY_MIN_VERSION);
  const flashDeals = latest.items.filter((d) => isFlashActive(d.flash_ends_at));
  const featured = { items: latest.items.filter((d) => d.is_featured && !isFlashActive(d.flash_ends_at)) };
  const newest = latest.items.filter((d) => !d.is_featured && !isFlashActive(d.flash_ends_at)).slice(0, 4);
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

      {/* Une seule action principale ; pas de doublon quand l'action est simplement d'ouvrir la carte (affichée juste en dessous) */}
      {journey.next.href !== "/carte" && <NextStepCard journey={journey} />}

      <section className="max-w-md space-y-2">
        <MiniPass
          first={profile.first_name}
          last={profile.last_name}
          avatar={profile.avatar_url}
          unyId={profile.uny_id}
          status={profile.verification_status}
          university={universityLabel(profile)}
        />
        {journey.next.href === "/carte" && journey.savedGnf > 0 && (
          <p className="text-mint-700 text-sm font-bold">💰 Tu as économisé {formatGNF(journey.savedGnf)} avec Uny</p>
        )}
      </section>

      {(announcements.data ?? []).length > 0 && (
        <section className="space-y-2">
          <SectionHeader title="📣 Ton établissement" href="/notifications" />
          <ul className="space-y-2">
            {(announcements.data ?? []).map((a) => (
              <li key={a.id} className="rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-card)]">
                <p className="font-bold">
                  {!a.read_at && (
                    <span className="bg-brand-600 mr-2 inline-block size-2 rounded-full align-middle" aria-label="Non lue" />
                  )}
                  {a.title}
                </p>
                <p className="text-muted mt-1 line-clamp-2 text-sm">{a.body}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {flashDeals.length > 0 && (
        <section>
          <SectionHeader title="⚡ Offres flash" href="/avantages" />
          <Rail label="Offres flash">
            {flashDeals.map((d) => (
              <DealCard key={d.id} deal={d} compact favorite={favDeals.has(d.id)} />
            ))}
          </Rail>
        </section>
      )}

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
