import { SURVEY_MIN_VERSION } from "@/lib/survey";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MessageSquareHeart, ShieldCheck } from "lucide-react";
import { MiniPass } from "@/components/home/mini-pass";
import { Shortcuts } from "@/components/home/shortcuts";
import { Rail } from "@/components/home/rail";
import { DealCard, ItemCard } from "@/components/content/cards";
import { SectionHeader } from "@/components/ui/section-header";
import { FormMessage } from "@/components/ui/field";
import { DemoNotice } from "@/components/ui/demo-notice";
import { requireProfile, universityLabel } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { favoriteIds, listDeals, listMarket } from "@/lib/queries";
import { param, type SearchParams } from "@/lib/url";

export const metadata: Metadata = { title: "Accueil" };

export default async function HomePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const profile = await requireProfile();
  const supabase = await createClient();

  const [latest, market, favDeals, survey] = await Promise.all([
    listDeals({ cityId: profile.city_id ?? undefined }),
    listMarket({ cityId: profile.city_id ?? undefined }),
    favoriteIds(supabase, profile.id, "deal"),
    supabase.from("survey_responses").select("version").eq("user_id", profile.id).maybeSingle(),
  ]);
  const featured = { items: latest.items.filter((d) => d.is_featured) };
  const newest = latest.items.filter((d) => !d.is_featured).slice(0, 4);
  const hour = new Date().toLocaleString("fr-FR", { hour: "numeric", hour12: false, timeZone: "Africa/Conakry" });
  const greeting = Number(hour) >= 18 ? "Bonsoir" : "Bonjour";

  return (
    <div className="animate-fade-up space-y-7">
      <section>
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">
          {greeting} {profile.first_name} 👋
        </h1>
        <p className="text-muted mt-1 text-sm">
          Voici les bons plans étudiants du moment {profile.city?.name ? `à ${profile.city.name}` : "en Guinée"}.
        </p>
      </section>

      {param(sp, "bienvenue") && (
        <FormMessage type="success">Bienvenue sur Uny ! Ton compte est actif et ta carte est prête 🎉</FormMessage>
      )}
      {param(sp, "mdp") && <FormMessage type="success">Ton mot de passe a bien été modifié.</FormMessage>}

      <section className="grid gap-5 md:grid-cols-[minmax(0,24rem)_1fr] md:items-center">
        <MiniPass
          first={profile.first_name}
          last={profile.last_name}
          avatar={profile.avatar_url}
          unyId={profile.uny_id}
          status={profile.verification_status}
          university={universityLabel(profile)}
        />
        <Shortcuts />
      </section>

      {profile.verification_status !== "verified" && (
        <Link
          href="/profil/verification"
          className="bg-mango-50 ring-mango-100 hover:bg-mango-100 flex items-center gap-3 rounded-[var(--radius-card)] p-4 ring-1 transition"
        >
          <span className="bg-mango-400 text-ink flex size-11 shrink-0 items-center justify-center rounded-2xl">
            <ShieldCheck className="size-6" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="text-ink block font-bold">
              {profile.verification_status === "pending" ? "Vérification en cours ⏳" : "Fais vérifier ton statut étudiant"}
            </span>
            <span className="text-muted block text-sm">
              {profile.verification_status === "pending"
                ? "Nous examinons ton justificatif. Tu seras notifié très vite."
                : "Envoie ta carte étudiante ou ton certificat : c'est rapide."}
            </span>
          </span>
          <ArrowRight className="text-mango-700 size-5 shrink-0" aria-hidden />
        </Link>
      )}

      {!survey.error && (!survey.data || survey.data.version < SURVEY_MIN_VERSION) && (
        <Link
          href="/avis"
          className="bg-brand-50 ring-brand-100 hover:bg-brand-100 flex items-center gap-3 rounded-[var(--radius-card)] p-4 ring-1 transition"
        >
          <span className="bg-brand-600 flex size-11 shrink-0 items-center justify-center rounded-2xl text-white">
            <MessageSquareHeart className="size-6" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="text-ink block font-bold">
              {survey.data ? "Quels avantages veux-tu ? 🙏" : "Donne ton avis sur Uny 🙏"}
            </span>
            <span className="text-muted block text-sm">
              {survey.data
                ? "5 questions rapides pour choisir les réductions qu'on négocie pour toi."
                : "1 minute pour nous aider à améliorer Uny."}
            </span>
          </span>
          <ArrowRight className="text-brand-600 size-5 shrink-0" aria-hidden />
        </Link>
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

      <section>
        <SectionHeader title="✨ Nouvelles offres" href="/avantages" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {newest.map((d) => (
            <DealCard key={d.id} deal={d} favorite={favDeals.has(d.id)} />
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="🛍️ Nouveautés marketplace" href="/marketplace" />
        <Rail label="Nouveautés marketplace">
          {market.items.slice(0, 10).map((m) => (
            <ItemCard key={m.id} item={m} compact />
          ))}
        </Rail>
      </section>

      <DemoNotice />
    </div>
  );
}
