import Link from "next/link";
import { ArrowRight, BadgeCheck, QrCode, ShieldCheck, Smartphone, Sparkles } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { UnyCard } from "@/components/card/uny-card";
import { DealCard, HousingCard, ItemCard, JobCard } from "@/components/content/cards";
import { createPublicClient } from "@/lib/supabase/public";
import { DEAL_CATEGORIES, SITE_URL } from "@/lib/constants";
import { qrSvg } from "@/lib/qr";
import { toItemCard } from "@/lib/queries-public";

export const revalidate = 600;

const SHOWN_CATEGORIES = ["restauration", "shopping", "sport", "tech", "formation", "loisirs", "transport"] as const;
const LANDING_LABELS: Record<string, string> = { restauration: "Restaurants", shopping: "Mode", transport: "Mobilité" };

async function loadContent() {
  const supabase = createPublicClient();
  const today = new Date().toISOString().slice(0, 10);
  const [deals, jobs, housing, market] = await Promise.all([
    supabase
      .from("deals")
      .select("id, title, discount_label, category, district, image_url, valid_until, is_demo, partner:partners(name, logo_url)")
      .eq("is_active", true)
      .or(`valid_until.is.null,valid_until.gte.${today}`)
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(4),
    supabase
      .from("jobs")
      .select("id, title, company_name, type, location, is_remote, compensation, deadline, is_demo, created_at")
      .eq("is_active", true)
      .or(`deadline.is.null,deadline.gte.${today}`)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("housing")
      .select("id, title, type, district, price_gnf, rooms, images, is_available, available_from, is_demo")
      .eq("is_active", true)
      .eq("is_available", true)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("marketplace_items")
      .select("id, title, category, price_gnf, condition, district, created_at, is_demo, status, images:marketplace_images(url, position)")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);
  return { deals: deals.data ?? [], jobs: jobs.data ?? [], housing: housing.data ?? [], market: market.data ?? [] };
}

export default async function LandingPage() {
  const [{ deals, jobs, housing, market }, sampleQr] = await Promise.all([loadContent(), qrSvg(SITE_URL)]);
  const hasDemo = [...deals, ...jobs, ...housing, ...market].some((x) => x.is_demo);

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-canvas">
        <div className="pointer-events-none absolute -top-32 -right-32 size-[28rem] rounded-full bg-brand-200/50 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-40 -left-24 size-[22rem] rounded-full bg-mango-100/80 blur-3xl" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pt-10 pb-16 md:grid-cols-2 md:pt-20 md:pb-24">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-brand-700 shadow-[var(--shadow-card)]">
              <span className="size-2 rounded-full bg-mint-500" aria-hidden /> Version pilote — Conakry, Guinée
            </span>
            <h1 className="mt-5 text-[2.5rem] leading-[1.05] font-extrabold tracking-tight text-ink sm:text-5xl lg:text-6xl">
              Ton statut étudiant devient un <span className="text-brand-600">avantage</span>
              <span className="text-mango-400">.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted">
              Réductions, jobs, logements, bons plans et carte étudiante digitale réunis dans une seule application.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <LinkButton href="/inscription" size="lg">
                Créer mon compte <ArrowRight className="size-5" />
              </LinkButton>
              <LinkButton href="#decouvrir" size="lg" variant="outline">
                Découvrir Uny
              </LinkButton>
            </div>
            <p className="mt-4 text-sm text-muted">Gratuit · Inscription en moins de 3 minutes</p>
          </div>
          <div className="relative mx-auto w-full max-w-md md:max-w-none">
            <div className="rotate-[-4deg] transition duration-500 hover:rotate-0">
              <UnyCard
                sample
                data={{
                  firstName: "Ibrahima",
                  lastName: "Sylla",
                  photoUrl: "https://images.unsplash.com/photo-1531384441138-2736e62e0919?w=300&q=70&auto=format&fit=crop",
                  university: "Université de Conakry",
                  fieldOfStudy: "Licence 3 — Économie",
                  unyId: "GN-2026-000145",
                  academicYear: "2025-2026",
                  status: "verified",
                  countryCode: "GN",
                  qrSvg: sampleQr,
                }}
              />
            </div>
            <div className="absolute -bottom-9 left-2 rounded-2xl bg-white px-3 py-2 text-sm font-bold shadow-[var(--shadow-float)] sm:-left-4">
              🍔 <span className="text-coral-500">-20 %</span> au resto
            </div>
            <div className="absolute -top-10 right-2 rounded-2xl bg-white px-3 py-2 text-sm font-bold shadow-[var(--shadow-float)] sm:-right-4">
              💼 3 nouveaux stages
            </div>
          </div>
        </div>
      </section>

      {/* POURQUOI */}
      <section id="decouvrir" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
        <h2 className="max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">Une app, toute ta vie étudiante.</h2>
        <p className="mt-3 max-w-2xl text-muted">Uny réunit tout ce dont un étudiant a besoin au quotidien, pensé pour ton téléphone et les petites connexions.</p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { e: "🎫", t: "Uny Card", d: "Ta carte étudiante digitale avec QR code vérifiable." },
            { e: "🔥", t: "Réductions", d: "Des tarifs étudiants chez les partenaires." },
            { e: "💼", t: "Jobs & stages", d: "Jobs, stages, bourses, concours, formations." },
            { e: "🏠", t: "Logement", d: "Chambres, studios et colocations à Conakry." },
            { e: "🛍️", t: "Marketplace", d: "Achète et vends entre étudiants." },
          ].map((f) => (
            <div key={f.t} className="rounded-[var(--radius-card)] bg-canvas p-5">
              <span className="text-3xl" aria-hidden>{f.e}</span>
              <h3 className="mt-3 font-extrabold">{f.t}</h3>
              <p className="mt-1 text-sm text-muted">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AVANTAGES */}
      <section id="avantages" className="scroll-mt-20 bg-canvas py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Des avantages partout où tu vas.</h2>
          <ul className="mt-6 flex flex-wrap gap-2">
            {SHOWN_CATEGORIES.map((c) => (
              <li key={c} className="rounded-full bg-white px-4 py-2 text-sm font-bold shadow-[var(--shadow-card)]">
                <span aria-hidden>{DEAL_CATEGORIES[c].emoji}</span> {LANDING_LABELS[c] ?? DEAL_CATEGORIES[c].label}
              </li>
            ))}
          </ul>
          <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {deals.map((d) => (
              <DealCard key={d.id} deal={d} />
            ))}
          </div>
          <LinkButton href="/avantages" variant="outline" className="mt-6">
            Voir tous les avantages <ArrowRight className="size-4" />
          </LinkButton>
        </div>
      </section>

      {/* UNY CARD */}
      <section id="carte" className="scroll-mt-20 overflow-hidden bg-brand-950 py-16 text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 md:grid-cols-2">
          <div className="order-2 md:order-1">
            <div className="mx-auto max-w-sm">
              <UnyCard
                sample
                data={{
                  firstName: "Fatoumata",
                  lastName: "Camara",
                  photoUrl: null,
                  university: "Institut Supérieur d'exemple",
                  fieldOfStudy: "Master 1 — Marketing",
                  unyId: "GN-2026-000321",
                  academicYear: "2025-2026",
                  status: "verified",
                  countryCode: "GN",
                  qrSvg: sampleQr,
                }}
              />
            </div>
          </div>
          <div className="order-1 md:order-2">
            <p className="text-sm font-bold tracking-widest text-mango-400 uppercase">Uny Card</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Ta carte étudiante, dans ta poche.</h2>
            <ul className="mt-6 space-y-4 text-brand-100">
              <li className="flex gap-3"><BadgeCheck className="size-6 shrink-0 text-mint-500" aria-hidden /> Statut « Étudiant vérifié » après contrôle de ton justificatif.</li>
              <li className="flex gap-3"><QrCode className="size-6 shrink-0 text-mango-400" aria-hidden /> QR code unique : les partenaires vérifient l&apos;authenticité en un scan.</li>
              <li className="flex gap-3"><Smartphone className="size-6 shrink-0 text-brand-300" aria-hidden /> Toujours accessible, même installée comme une app sur ton téléphone.</li>
              <li className="flex gap-3"><ShieldCheck className="size-6 shrink-0 text-brand-300" aria-hidden /> Identifiant Uny unique, prêt pour toute l&apos;Afrique : GN, SN, CI…</li>
            </ul>
            <LinkButton href="/inscription" variant="mango" size="lg" className="mt-8 w-full sm:w-auto">
              Obtenir ma carte
            </LinkButton>
          </div>
        </div>
      </section>

      {/* JOBS */}
      <section id="jobs" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Jobs, stages & opportunités.</h2>
        <p className="mt-3 max-w-2xl text-muted">Commercial étudiant, community manager, stage marketing ou finance, développeur junior… Trouve ton premier pas pro.</p>
        <div className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {jobs.map((j) => (
            <JobCard key={j.id} job={j} />
          ))}
        </div>
        <LinkButton href="/jobs" className="mt-6">
          Voir les opportunités <ArrowRight className="size-4" />
        </LinkButton>
      </section>

      {/* LOGEMENT */}
      <section id="logement" className="scroll-mt-20 bg-canvas py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Trouve ton logement étudiant à Conakry.</h2>
          <p className="mt-3 max-w-2xl text-muted">Chambres, studios, colocations et appartements, filtrés par budget et par quartier.</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {housing.map((h) => (
              <HousingCard key={h.id} home={h} />
            ))}
          </div>
          <LinkButton href="/logement" variant="outline" className="mt-6">
            Voir les logements <ArrowRight className="size-4" />
          </LinkButton>
        </div>
      </section>

      {/* MARKETPLACE */}
      <section id="marketplace" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Achète et vends entre étudiants.</h2>
        <p className="mt-3 max-w-2xl text-muted">Téléphones, ordinateurs, livres, meubles, vêtements, fournitures… Donne une seconde vie à tes affaires.</p>
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          {market.map((m) => (
            <ItemCard key={m.id} item={toItemCard(m)} />
          ))}
        </div>
        <LinkButton href="/marketplace" variant="outline" className="mt-6">
          Explorer la marketplace <ArrowRight className="size-4" />
        </LinkButton>
        {hasDemo && (
          <p className="mt-10 rounded-2xl bg-canvas px-4 py-3 text-xs text-muted">
            <strong className="text-ink">Version pilote :</strong> les offres, entreprises et annonces marquées « Démo » sont des exemples fictifs présentés à titre de démonstration. Elles ne représentent pas des partenariats signés avec Uny.
          </p>
        )}
      </section>

      {/* CTA */}
      <section className="px-4 pb-16">
        <div className="uny-pattern mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-800 via-brand-700 to-brand-500 px-6 py-14 text-center text-white">
          <Sparkles className="mx-auto size-8 text-mango-400" aria-hidden />
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">Rejoins la communauté Uny</h2>
          <p className="mx-auto mt-3 max-w-md text-brand-100">Inscription gratuite. Ta carte étudiante digitale est prête en quelques minutes.</p>
          <LinkButton href="/inscription" variant="mango" size="lg" className="mt-8 w-full sm:w-auto">
            Créer mon compte
          </LinkButton>
          <p className="mt-4 text-sm text-brand-200">
            Déjà membre ? <Link href="/connexion" className="font-bold text-white underline">Se connecter</Link>
          </p>
        </div>
      </section>
    </>
  );
}
