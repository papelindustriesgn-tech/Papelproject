import Link from "next/link";
import { ArrowRight, BadgeCheck, QrCode, ShieldCheck, Smartphone, Sparkles, Store } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { UnyCard } from "@/components/card/uny-card";
import { DealCard, ItemCard } from "@/components/content/cards";
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
  const [deals, market] = await Promise.all([
    supabase
      .from("deals")
      .select("id, title, discount_label, category, district, image_url, valid_until, is_demo, partner:partners(name, logo_url)")
      .eq("is_active", true)
      .or(`valid_until.is.null,valid_until.gte.${today}`)
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(4),
    supabase
      .from("marketplace_items")
      .select(
        "id, title, category, price_gnf, condition, district, created_at, is_demo, status, images:marketplace_images(url, position)",
      )
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);
  return { deals: deals.data ?? [], market: market.data ?? [] };
}

export default async function LandingPage() {
  const [{ deals, market }, sampleQr] = await Promise.all([loadContent(), qrSvg(SITE_URL)]);
  const hasDemo = [...deals, ...market].some((x) => x.is_demo);

  return (
    <>
      {/* HERO */}
      <section className="bg-canvas relative overflow-hidden">
        <div
          className="bg-brand-200/50 pointer-events-none absolute -top-32 -right-32 size-[28rem] rounded-full blur-3xl"
          aria-hidden
        />
        <div
          className="bg-mango-100/80 pointer-events-none absolute -bottom-40 -left-24 size-[22rem] rounded-full blur-3xl"
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pt-10 pb-16 md:grid-cols-2 md:pt-20 md:pb-24">
          <div className="animate-fade-up">
            <span className="text-brand-700 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold shadow-[var(--shadow-card)]">
              <span className="bg-mint-500 size-2 rounded-full" aria-hidden /> Disponible dans toute la Guinée
            </span>
            <h1 className="text-ink mt-5 text-[2.5rem] leading-[1.05] font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Ton statut étudiant devient un <span className="text-brand-600">avantage</span>
              <span className="text-mango-400">.</span>
            </h1>
            <p className="text-muted mt-5 max-w-lg text-lg leading-relaxed">
              Réductions, bons plans, marketplace et carte étudiante digitale réunis dans une seule application.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <LinkButton href="/inscription" size="lg">
                Créer mon compte <ArrowRight className="size-5" />
              </LinkButton>
              <LinkButton href="#decouvrir" size="lg" variant="outline">
                Découvrir Uny
              </LinkButton>
            </div>
            <p className="text-muted mt-4 text-sm">Gratuit · Inscription en moins de 3 minutes</p>
            <Link
              href="#partenaires"
              className="text-ink hover:border-brand-300 border-line mt-5 inline-flex items-center gap-2 rounded-2xl border border-dashed bg-white/70 px-4 py-2.5 text-sm font-semibold"
            >
              <Store className="text-brand-600 size-4" aria-hidden />
              Commerçant ou entreprise ? <span className="text-brand-600">Espace partenaires</span>
            </Link>
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
                  unyId: "UNY-GN-2026-7K3QXN",
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
        <p className="text-muted mt-3 max-w-2xl">
          Uny réunit tout ce dont un étudiant a besoin au quotidien, pensé pour ton téléphone et les petites connexions.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { e: "🎫", t: "Uny Card", d: "Ta carte étudiante digitale avec QR code vérifiable." },
            { e: "🔥", t: "Réductions", d: "Des tarifs étudiants chez les partenaires." },
            { e: "✅", t: "Statut vérifié", d: "Ton inscription confirmée par ton université." },
            { e: "🛍️", t: "Marketplace", d: "Achète et vends entre étudiants." },
          ].map((f) => (
            <div key={f.t} className="bg-canvas rounded-[var(--radius-card)] p-5">
              <span className="text-3xl" aria-hidden>
                {f.e}
              </span>
              <h3 className="mt-3 font-extrabold">{f.t}</h3>
              <p className="text-muted mt-1 text-sm">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AVANTAGES */}
      <section id="avantages" className="bg-canvas scroll-mt-20 py-16">
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
      <section id="carte" className="bg-brand-950 scroll-mt-20 overflow-hidden py-16 text-white">
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
                  unyId: "UNY-GN-2026-4M8PRT",
                  academicYear: "2025-2026",
                  status: "verified",
                  countryCode: "GN",
                  qrSvg: sampleQr,
                }}
              />
            </div>
          </div>
          <div className="order-1 md:order-2">
            <p className="text-mango-400 text-sm font-bold tracking-widest uppercase">Uny Card</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Ta carte étudiante, dans ta poche.</h2>
            <ul className="text-brand-100 mt-6 space-y-4">
              <li className="flex gap-3">
                <BadgeCheck className="text-mint-500 size-6 shrink-0" aria-hidden /> Statut « Étudiant vérifié » après contrôle de
                ton justificatif.
              </li>
              <li className="flex gap-3">
                <QrCode className="text-mango-400 size-6 shrink-0" aria-hidden /> QR code unique : les partenaires vérifient
                l&apos;authenticité en un scan.
              </li>
              <li className="flex gap-3">
                <Smartphone className="text-brand-300 size-6 shrink-0" aria-hidden /> Toujours accessible, même installée comme
                une app sur ton téléphone.
              </li>
              <li className="flex gap-3">
                <ShieldCheck className="text-brand-300 size-6 shrink-0" aria-hidden /> Identifiant Uny unique, prêt pour toute
                l&apos;Afrique : GN, SN, CI…
              </li>
            </ul>
            <LinkButton href="/inscription" variant="mango" size="lg" className="mt-8 w-full sm:w-auto">
              Obtenir ma carte
            </LinkButton>
          </div>
        </div>
      </section>

      {/* MARKETPLACE */}
      <section id="marketplace" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Achète et vends entre étudiants.</h2>
        <p className="text-muted mt-3 max-w-2xl">
          Téléphones, ordinateurs, livres, meubles, vêtements, fournitures… Donne une seconde vie à tes affaires.
        </p>
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          {market.map((m) => (
            <ItemCard key={m.id} item={toItemCard(m)} />
          ))}
        </div>
        <LinkButton href="/marketplace" variant="outline" className="mt-6">
          Explorer la marketplace <ArrowRight className="size-4" />
        </LinkButton>
        {hasDemo && (
          <p className="bg-canvas text-muted mt-10 rounded-2xl px-4 py-3 text-xs">
            <strong className="text-ink">Version pilote :</strong> les offres, entreprises et annonces marquées « Démo » sont des
            exemples fictifs présentés à titre de démonstration. Elles ne représentent pas des partenariats signés avec Uny.
          </p>
        )}
      </section>

      {/* PARTENAIRES */}
      <section id="partenaires" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-16">
        <div className="grid items-center gap-6 rounded-[2rem] bg-white p-6 shadow-[var(--shadow-card)] sm:p-10 md:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="text-brand-700 text-sm font-bold">Pour les commerçants et entreprises</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Deviens partenaire Uny.</h2>
            <p className="text-muted mt-3 max-w-xl">
              Publie tes offres et ta boutique pour les étudiants de toute la Guinée, et vérifie leur
              carte en 2 secondes en scannant le QR code.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <LinkButton href="/partenaires" size="lg">
              Devenir partenaire <ArrowRight className="size-5" />
            </LinkButton>
            <LinkButton href="/connexion?next=/partenaire" size="lg" variant="outline">
              Accéder à mon espace partenaire
            </LinkButton>
          </div>
        </div>
        <p className="text-muted mt-4 text-center text-sm">
          Vous représentez une université ou un institut ?{" "}
          <Link href="/universites" className="text-brand-600 font-semibold hover:underline">
            Offrez à vos étudiants une carte Uny à vos couleurs
          </Link>
        </p>
      </section>

      {/* CTA */}
      <section className="px-4 pb-16">
        <div className="uny-pattern from-brand-800 via-brand-700 to-brand-500 mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-gradient-to-br px-6 py-14 text-center text-white">
          <Sparkles className="text-mango-400 mx-auto size-8" aria-hidden />
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">Rejoins la communauté Uny</h2>
          <p className="text-brand-100 mx-auto mt-3 max-w-md">
            Inscription gratuite. Ta carte étudiante digitale est prête en quelques minutes.
          </p>
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
