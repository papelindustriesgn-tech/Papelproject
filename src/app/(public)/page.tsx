import Link from "next/link";
import { ArrowRight, BadgeCheck, Landmark, ScanLine, Store, UserRound, XCircle } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { UnyCard } from "@/components/card/uny-card";
import { DealCard } from "@/components/content/cards";
import { createPublicClient } from "@/lib/supabase/public";
import { SITE_URL } from "@/lib/constants";
import { qrSvg } from "@/lib/qr";

export const revalidate = 600;

async function loadDeals() {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await createPublicClient()
    .from("deals")
    .select("id, title, discount_label, category, district, image_url, valid_until, is_demo, partner:partners(name, logo_url)")
    .eq("is_active", true)
    .or(`valid_until.is.null,valid_until.gte.${today}`)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(4);
  return data ?? [];
}

/** Héroïne fictive de l'histoire (aucune personne réelle). */
const HERO = { first: "Aïssatou", last: "Bah" };

export default async function LandingPage() {
  const [deals, sampleQr] = await Promise.all([loadDeals(), qrSvg(SITE_URL)]);
  const hasDemo = deals.some((d) => d.is_demo);
  const heroCard = {
    firstName: HERO.first,
    lastName: HERO.last,
    photoUrl: null,
    university: "Ton université",
    fieldOfStudy: "Licence 2 — Informatique",
    unyId: "UNY-GN-2026-7K3QXN",
    academicYear: "2026-2027",
    status: "verified" as const,
    countryCode: "GN",
    qrSvg: sampleQr,
  };

  return (
    <>
      {/* 1. LA PROMESSE — comprise en 5 secondes */}
      <section className="bg-canvas relative overflow-hidden">
        <div
          className="bg-brand-200/50 pointer-events-none absolute -top-32 -right-32 size-[28rem] rounded-full blur-3xl"
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-10 pb-20 md:grid-cols-2 md:pt-20 md:pb-24">
          <div className="animate-fade-up">
            <span className="text-brand-700 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold shadow-[var(--shadow-card)]">
              <span className="bg-mint-500 size-2 rounded-full" aria-hidden /> Disponible dans toute la Guinée
            </span>
            <h1 className="text-ink mt-5 text-[2.6rem] leading-[1.05] font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Prouve que tu es étudiant.
              <br />
              <span className="text-brand-600">Paie moins cher.</span>
            </h1>
            <p className="text-ink/80 mt-5 max-w-lg text-lg leading-relaxed">
              Uny, c&apos;est <strong>ta carte étudiante dans ton téléphone</strong>, confirmée par ton université. Tu la montres,
              le commerçant la scanne, tu as ta réduction.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <LinkButton href="/inscription" size="lg">
                Obtenir ma carte gratuite <ArrowRight className="size-5" />
              </LinkButton>
              <LinkButton href="#histoire" size="lg" variant="outline">
                Voir comment ça marche
              </LinkButton>
            </div>
            <p className="text-muted mt-4 text-sm">Gratuit · Prête en 3 minutes · Sur tous les téléphones</p>
          </div>

          <div className="relative mx-auto w-full max-w-md md:max-w-none">
            <div className="rotate-[-3deg] transition duration-500 hover:rotate-0">
              <UnyCard sample data={heroCard} />
            </div>
            <div className="absolute -bottom-10 left-2 flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm font-bold shadow-[var(--shadow-float)] sm:-left-4">
              <ScanLine className="text-brand-600 size-5" aria-hidden />
              Scannée : <span className="text-mint-700">Étudiant vérifié ✅</span>
            </div>
            <div className="bg-coral-500 absolute -top-8 right-2 rounded-2xl px-3 py-2 text-sm font-extrabold text-white shadow-[var(--shadow-float)] sm:-right-4">
              -15 % au resto 🍔
            </div>
          </div>
        </div>
      </section>

      {/* 2. L'HISTOIRE — un héros, un problème, une solution, un résultat */}
      <section id="histoire" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 md:py-20">
        <p className="text-brand-700 text-sm font-bold tracking-widest uppercase">L&apos;histoire d&apos;{HERO.first}</p>
        <h2 className="mt-2 max-w-3xl text-3xl font-extrabold tracking-tight sm:text-4xl">
          {HERO.first} est étudiante. Pourtant, elle payait toujours plein tarif.
        </h2>

        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          <li className="relative rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--shadow-card)]">
            <span className="bg-coral-50 text-coral-600 inline-flex rounded-full px-3 py-1 text-xs font-extrabold">
              1 · Le problème
            </span>
            <div className="mt-5 flex items-center gap-3" aria-hidden>
              <span className="bg-canvas flex size-14 items-center justify-center rounded-2xl text-3xl">🪪</span>
              <XCircle className="text-coral-500 size-8" />
            </div>
            <h3 className="mt-4 text-xl font-extrabold">Sa carte papier ? Perdue.</h3>
            <p className="text-muted mt-2">
              Sans preuve, personne ne la croit. Au restaurant, au transport, à la librairie : plein tarif, à chaque fois.
            </p>
          </li>

          <li className="relative rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--shadow-card)]">
            <span className="bg-brand-50 text-brand-700 inline-flex rounded-full px-3 py-1 text-xs font-extrabold">
              2 · La solution : Uny
            </span>
            <div className="mt-5 flex items-center gap-3" aria-hidden>
              <span className="bg-canvas flex size-14 items-center justify-center rounded-2xl text-3xl">📱</span>
              <BadgeCheck className="text-mint-500 size-8" />
            </div>
            <h3 className="mt-4 text-xl font-extrabold">3 minutes pour sa carte Uny.</h3>
            <p className="text-muted mt-2">
              Elle s&apos;inscrit sur son téléphone. Son université confirme son inscription : sa carte est{" "}
              <strong className="text-ink">vérifiée</strong>, à son nom, avec sa photo.
            </p>
          </li>

          <li className="relative rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--shadow-card)]">
            <span className="bg-mint-50 text-mint-700 inline-flex rounded-full px-3 py-1 text-xs font-extrabold">
              3 · Le résultat
            </span>
            <div className="mt-5 flex items-center gap-3" aria-hidden>
              <span className="bg-canvas flex size-14 items-center justify-center rounded-2xl text-3xl">🍔</span>
              <span className="bg-coral-500 rounded-xl px-2.5 py-1 text-lg font-extrabold text-white">-15 %</span>
            </div>
            <h3 className="mt-4 text-xl font-extrabold">Elle montre, on scanne, elle économise.</h3>
            <p className="text-muted mt-2">
              Le commerçant scanne le QR code : « Étudiant vérifié ✅ ». La réduction est appliquée en 2 secondes.
            </p>
          </li>
        </ol>

        <div className="bg-brand-950 uny-pattern mt-6 flex flex-col items-start gap-4 rounded-[var(--radius-card)] p-6 text-white sm:flex-row sm:items-center sm:justify-between">
          <p className="text-lg font-bold">
            Aujourd&apos;hui, {HERO.first} ne paie plus plein tarif. <span className="text-mango-400">Et toi ?</span>
          </p>
          <LinkButton href="/inscription" variant="mango" size="lg" className="w-full sm:w-auto">
            Je veux ma carte
          </LinkButton>
        </div>
      </section>

      {/* 3. CE QUE TU GAGNES */}
      <section id="avantages" className="bg-canvas scroll-mt-20 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Ce que ta carte te fait gagner.</h2>
          <p className="text-muted mt-3 max-w-2xl">
            Restaurants, mode, sport, formation, transport : les réductions étudiantes Uny.
          </p>
          {deals.length > 0 ? (
            <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {deals.map((d) => (
                <DealCard key={d.id} deal={d} />
              ))}
            </div>
          ) : (
            <ul className="mt-8 flex flex-wrap gap-2">
              {["🍔 Restaurants", "👕 Mode", "🏋️ Sport", "📚 Formation", "🚕 Transport", "💻 Tech"].map((c) => (
                <li key={c} className="rounded-full bg-white px-4 py-2 text-sm font-bold shadow-[var(--shadow-card)]">
                  {c}
                </li>
              ))}
            </ul>
          )}
          <LinkButton href="/avantages" variant="outline" className="mt-6">
            Voir tous les avantages <ArrowRight className="size-4" />
          </LinkButton>
          {hasDemo && (
            <p className="text-muted mt-6 text-xs">
              <strong className="text-ink">Version pilote :</strong> les offres marquées « Démo » sont des exemples fictifs, pas
              des partenariats signés.
            </p>
          )}
        </div>
      </section>

      {/* 4. UNE CARTE, TROIS GAGNANTS */}
      <section id="carte" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Une carte, trois gagnants.</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            {
              Icon: UserRound,
              who: "L'étudiant",
              text: "Une preuve de statut toujours dans sa poche, et des réductions partout en Guinée.",
              cta: "Obtenir ma carte",
              href: "/inscription",
            },
            {
              Icon: Store,
              who: "Le commerçant",
              text: "De nouveaux clients étudiants, et un scan de 2 secondes pour éviter les fraudes.",
              cta: "Devenir partenaire",
              href: "/partenaires",
            },
            {
              Icon: Landmark,
              who: "L'université",
              text: "Elle confirme ses inscrits et offre une carte numérique à ses couleurs.",
              cta: "Université partenaire",
              href: "/universites",
            },
          ].map(({ Icon, who, text, cta, href }) => (
            <div key={who} className="flex flex-col rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--shadow-card)]">
              <span className="bg-brand-50 text-brand-600 flex size-12 items-center justify-center rounded-2xl">
                <Icon className="size-6" aria-hidden />
              </span>
              <h3 className="mt-4 text-lg font-extrabold">{who}</h3>
              <p className="text-muted mt-1 flex-1">{text}</p>
              <Link href={href} className="text-brand-600 mt-4 inline-flex items-center gap-1 font-bold hover:underline">
                {cta} <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          ))}
        </div>
        <p id="partenaires" className="text-muted mt-6 scroll-mt-20 text-center text-sm">
          Déjà partenaire ?{" "}
          <Link href="/connexion?next=/partenaire" className="text-brand-600 font-semibold hover:underline">
            Accéder à mon espace
          </Link>{" "}
          · Bonus : la{" "}
          <Link href="/marketplace" className="text-brand-600 font-semibold hover:underline">
            marketplace
          </Link>{" "}
          pour acheter et vendre entre étudiants.
        </p>
      </section>

      {/* 5. APPEL FINAL */}
      <section className="px-4 pb-16">
        <div className="uny-pattern from-brand-800 via-brand-700 to-brand-500 mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-gradient-to-br px-6 py-14 text-center text-white">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Ton statut étudiant devient un avantage.</h2>
          <p className="text-brand-100 mx-auto mt-3 max-w-md">Gratuit. Ta carte est prête en 3 minutes.</p>
          <LinkButton href="/inscription" variant="mango" size="lg" className="mt-8 w-full sm:w-auto">
            Créer mon compte
          </LinkButton>
          <p className="text-brand-200 mt-4 text-sm">
            Déjà membre ?{" "}
            <Link href="/connexion" className="font-bold text-white underline">
              Se connecter
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
