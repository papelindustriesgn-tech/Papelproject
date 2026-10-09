import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Clock,
  Landmark,
  Megaphone,
  ScanLine,
  ShieldCheck,
  Store,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
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

const gnf = (n: number) => `${n.toLocaleString("fr-FR")} GNF`;

/** Exemples illustratifs (pas des offres réelles) : ce que le statut étudiant permet d'obtenir. */
const EXAMPLES = [
  { e: "🍔", what: "Menu au resto", before: 50_000, after: 40_000 },
  { e: "📶", what: "Forfait internet", before: 100_000, after: 80_000 },
  { e: "🏋️", what: "Salle de sport", before: 250_000, after: 175_000 },
  { e: "💻", what: "Formation info", before: 1_500_000, after: 1_050_000 },
];
const SAVED = EXAMPLES.reduce((s, x) => s + x.before - x.after, 0);

const PERKS = [
  { e: "🍔", t: "Restos & cafés", d: "Menus étudiants, boissons offertes" },
  { e: "📱", t: "Téléphones & internet", d: "Forfaits, accessoires, réparations" },
  { e: "💻", t: "Ordinateurs & tech", d: "Matériel, logiciels, impression" },
  { e: "📚", t: "Formations & langues", d: "Cours, certifications, préparation" },
  { e: "👕", t: "Mode & beauté", d: "Vêtements, coiffure, cosmétiques" },
  { e: "🏋️", t: "Sport & loisirs", d: "Salles, terrains, sorties" },
  { e: "🚕", t: "Transport", d: "Courses, voyages, livraisons" },
  { e: "🩺", t: "Santé", d: "Pharmacies, optique, consultations" },
];

const MERCHANTS = [
  "Restaurants & fast-foods",
  "Cafés & maquis",
  "Boutiques de mode",
  "Salons de coiffure",
  "Salles de sport",
  "Écoles & centres de formation",
  "Boutiques tech & téléphonie",
  "Cybercafés & imprimeries",
  "Librairies",
  "Pharmacies & opticiens",
  "Transport & livraison",
  "Opérateurs & banques",
];

export default async function LandingPage() {
  const [deals, sampleQr] = await Promise.all([loadDeals(), qrSvg(SITE_URL)]);
  const hasDemo = deals.some((d) => d.is_demo);

  return (
    <>
      {/* 1. ACCROCHE : ce que ton statut étudiant te rapporte */}
      <section className="bg-canvas relative overflow-hidden">
        <div
          className="bg-brand-200/50 pointer-events-none absolute -top-32 -right-32 size-[28rem] rounded-full blur-3xl"
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-10 pb-16 md:grid-cols-2 md:pt-20 md:pb-24">
          <div className="animate-fade-up">
            <span className="text-brand-700 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold shadow-[var(--shadow-card)]">
              <span className="bg-mint-500 size-2 rounded-full" aria-hidden /> Disponible dans toute la Guinée
            </span>
            <h1 className="text-ink mt-5 text-[2.6rem] leading-[1.05] font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Ton statut étudiant
              <br />
              <span className="text-brand-600">vaut de l&apos;argent.</span>
            </h1>
            <p className="text-ink/80 mt-5 max-w-lg text-lg leading-relaxed">
              Avec la carte <strong>Uny</strong>, tu prouves que tu es étudiant en un scan et tu profites de{" "}
              <strong>prix réservés aux étudiants</strong> : restos, internet, sport, formations, tech…
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <LinkButton href="/inscription" size="lg">
                Obtenir ma carte gratuite <ArrowRight className="size-5" />
              </LinkButton>
              <LinkButton href="#pourquoi" size="lg" variant="outline">
                Pourquoi Uny ?
              </LinkButton>
            </div>
            <p className="text-muted mt-4 text-sm">Gratuit · Prête en 3 minutes · Sur tous les téléphones</p>
            <Link
              href="#commercants"
              className="text-ink hover:border-brand-300 border-line mt-5 inline-flex items-center gap-2 rounded-2xl border border-dashed bg-white/70 px-4 py-2.5 text-sm font-semibold"
            >
              🏪 Vous êtes commerçant ? <span className="text-brand-600">Gagnez des clients étudiants</span>
            </Link>
          </div>

          {/* Visuel : avant / après avec le statut étudiant */}
          <div className="rounded-[2rem] bg-white p-5 shadow-[var(--shadow-float)] sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="font-extrabold">Avec ton statut étudiant</p>
              <span className="bg-mint-50 text-mint-700 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold">
                <BadgeCheck className="size-3.5" aria-hidden /> Carte Uny
              </span>
            </div>
            <ul className="mt-4 space-y-2.5">
              {EXAMPLES.map((x) => (
                <li key={x.what} className="bg-canvas flex items-center gap-3 rounded-2xl p-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-2xl" aria-hidden>
                    {x.e}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{x.what}</span>
                    <span className="text-muted text-xs line-through">{gnf(x.before)}</span>{" "}
                    <span className="text-ink text-sm font-extrabold">{gnf(x.after)}</span>
                  </span>
                  <span className="bg-coral-500 shrink-0 rounded-xl px-2 py-1 text-sm font-extrabold text-white">
                    -{Math.round((1 - x.after / x.before) * 100)} %
                  </span>
                </li>
              ))}
            </ul>
            <div className="bg-brand-950 uny-pattern mt-4 flex items-center justify-between gap-3 rounded-2xl p-4 text-white">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Wallet className="text-mango-400 size-5" aria-hidden /> Total économisé
              </span>
              <span className="text-mango-400 text-xl font-extrabold">{gnf(SAVED)}</span>
            </div>
            <p className="text-muted mt-2 text-center text-[11px]">Exemples illustratifs de réductions étudiantes</p>
          </div>
        </div>
      </section>

      {/* 2. LE POURQUOI : le problème que règle Uny */}
      <section id="pourquoi" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 md:py-20">
        <p className="text-coral-600 text-sm font-bold tracking-widest uppercase">Le problème</p>
        <h2 className="mt-2 max-w-3xl text-3xl font-extrabold tracking-tight sm:text-4xl">
          Les étudiants ont un petit budget. Pourtant, ils paient le même prix que tout le monde.
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            {
              Icon: Wallet,
              t: "Un budget serré",
              d: "Frais d'inscription, transport, repas, internet, fournitures : chaque franc compte.",
            },
            {
              Icon: XCircle,
              t: "Aucune preuve fiable",
              d: "Carte papier perdue, périmée ou facile à imiter : le commerçant ne peut pas savoir qui est vraiment étudiant.",
            },
            {
              Icon: Store,
              t: "Donc pas d'offres étudiantes",
              d: "Sans moyen de vérifier, les commerçants n'osent pas proposer de prix étudiants. Tout le monde y perd.",
            },
          ].map(({ Icon, t, d }) => (
            <div key={t} className="rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--shadow-card)]">
              <span className="bg-coral-50 text-coral-600 flex size-12 items-center justify-center rounded-2xl">
                <Icon className="size-6" aria-hidden />
              </span>
              <h3 className="mt-4 text-lg font-extrabold">{t}</h3>
              <p className="text-muted mt-1">{d}</p>
            </div>
          ))}
        </div>

        <div className="bg-brand-600 uny-pattern mt-6 grid items-center gap-6 rounded-[2rem] p-6 text-white sm:p-10 md:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="text-mango-400 text-sm font-bold tracking-widest uppercase">La solution : Uny</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Une carte étudiante numérique que tout le monde peut vérifier.
            </h2>
            <p className="text-brand-100 mt-4 text-lg">
              Ton université confirme ton inscription. Le commerçant scanne ton QR code et voit en 2 secondes « Étudiant vérifié
              ✅ ». La confiance est là : les offres étudiantes peuvent enfin exister.
            </p>
          </div>
          <div className="relative mx-auto w-full max-w-sm">
            <UnyCard
              sample
              data={{
                firstName: "Aïssatou",
                lastName: "Bah",
                photoUrl: null,
                university: "Ton université",
                fieldOfStudy: "Licence 2 — Informatique",
                unyId: "UNY-GN-2026-7K3QXN",
                academicYear: "2026-2027",
                status: "verified",
                countryCode: "GN",
                qrSvg: sampleQr,
              }}
            />
            <div className="text-ink absolute -bottom-5 left-3 flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm font-bold shadow-[var(--shadow-float)]">
              <ScanLine className="text-brand-600 size-5" aria-hidden /> Scannée :{" "}
              <span className="text-mint-700">Étudiant vérifié ✅</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CE QUE TU PEUX AVOIR */}
      <section id="avantages" className="bg-canvas scroll-mt-20 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Avec ta carte Uny, profite de meilleurs prix sur…
          </h2>
          <ul className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            {PERKS.map((p) => (
              <li key={p.t} className="rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-card)]">
                <span className="text-3xl" aria-hidden>
                  {p.e}
                </span>
                <p className="mt-2 font-extrabold">{p.t}</p>
                <p className="text-muted text-sm">{p.d}</p>
              </li>
            ))}
          </ul>
          {deals.length > 0 && (
            <>
              <h3 className="mt-12 text-xl font-extrabold">Offres du moment</h3>
              <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {deals.map((d) => (
                  <DealCard key={d.id} deal={d} />
                ))}
              </div>
            </>
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

      {/* 4. COMMENT ÇA MARCHE */}
      <section id="histoire" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">3 étapes, et tu économises.</h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            { n: "1", e: "📱", t: "Crée ta carte", d: "Inscription gratuite en 3 minutes, avec ta photo et ton établissement." },
            {
              n: "2",
              e: "✅",
              t: "Fais-la vérifier",
              d: "Ton université confirme ton inscription : ta carte devient « Étudiant vérifié ».",
            },
            { n: "3", e: "💸", t: "Montre-la et économise", d: "Le commerçant scanne ton QR code, la réduction est appliquée." },
          ].map((s) => (
            <li key={s.n} className="rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-3">
                <span className="bg-brand-600 flex size-9 items-center justify-center rounded-full font-extrabold text-white">
                  {s.n}
                </span>
                <span className="text-3xl" aria-hidden>
                  {s.e}
                </span>
              </div>
              <h3 className="mt-4 text-lg font-extrabold">{s.t}</h3>
              <p className="text-muted mt-1">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 5. COMMERÇANTS : se reconnaître et voir le potentiel */}
      <section id="commercants" className="bg-brand-950 scroll-mt-20 py-16 text-white md:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <p className="text-mango-400 text-sm font-bold tracking-widest uppercase">Pour les commerçants et entreprises</p>
          <h2 className="mt-2 max-w-3xl text-3xl font-extrabold tracking-tight sm:text-4xl">
            Les étudiants sont vos clients d&apos;aujourd&apos;hui, et vos clients fidèles de demain.
          </h2>
          <p className="text-brand-100 mt-3 max-w-2xl">Vous êtes…</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {MERCHANTS.map((m) => (
              <li key={m} className="rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-semibold ring-1 ring-white/15">
                {m}
              </li>
            ))}
          </ul>

          <div className="mt-10 grid items-start gap-8 lg:grid-cols-[1.1fr_1fr]">
            <ul className="grid gap-3 sm:grid-cols-2">
              {[
                { Icon: Users, t: "Des clients en plus", d: "Les étudiants viennent en groupe, reviennent et recommandent." },
                { Icon: Megaphone, t: "Visibilité gratuite", d: "Votre offre apparaît dans l'app, dans votre ville." },
                { Icon: Clock, t: "Heures creuses remplies", d: "Ciblez vos offres sur les jours et heures calmes." },
                { Icon: ShieldCheck, t: "Zéro fraude", d: "Un scan du QR code : vous savez si c'est un vrai étudiant." },
                { Icon: BarChart3, t: "Résultats mesurés", d: "Cartes scannées, clients servis, vues de vos offres." },
                { Icon: Store, t: "Votre boutique en ligne", d: "Vendez vos produits sur la marketplace étudiante." },
              ].map(({ Icon, t, d }) => (
                <li key={t} className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                  <Icon className="text-mango-400 size-6" aria-hidden />
                  <p className="mt-2 font-extrabold">{t}</p>
                  <p className="text-brand-100 text-sm">{d}</p>
                </li>
              ))}
            </ul>

            {/* Aperçu du tableau de bord partenaire */}
            <div className="text-ink rounded-[2rem] bg-white p-5 shadow-[var(--shadow-float)]">
              <div className="flex items-center justify-between gap-2">
                <p className="font-extrabold">Votre tableau de bord</p>
                <span className="bg-canvas text-muted rounded-full px-2.5 py-1 text-[11px] font-bold">Exemple</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                {[
                  { v: "142", l: "cartes scannées ce mois", c: "bg-brand-600 text-white" },
                  { v: "96", l: "étudiants servis", c: "bg-mint-50" },
                  { v: "3 480", l: "vues de vos offres", c: "bg-mango-50" },
                  { v: "+38 %", l: "de fréquentation", c: "bg-coral-50" },
                ].map((k) => (
                  <div key={k.l} className={`rounded-2xl p-3 ${k.c}`}>
                    <p className="text-2xl font-extrabold">{k.v}</p>
                    <p className="text-xs opacity-80">{k.l}</p>
                  </div>
                ))}
              </div>
              <div className="bg-canvas mt-3 flex items-center gap-3 rounded-2xl p-3">
                <ScanLine className="text-brand-600 size-8 shrink-0" aria-hidden />
                <p className="text-sm">
                  <strong>Scanner une carte</strong>
                  <br />
                  <span className="text-muted">Vérifie en 2 secondes depuis votre téléphone.</span>
                </p>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <LinkButton href="/partenaires" variant="mango" size="lg">
              Devenir partenaire gratuitement <ArrowRight className="size-5" />
            </LinkButton>
            <LinkButton href="/connexion?next=/partenaire" variant="light" size="lg">
              J&apos;ai déjà un espace partenaire
            </LinkButton>
          </div>
        </div>
      </section>

      {/* 6. UNIVERSITÉS */}
      <section id="carte" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14">
        <div className="flex flex-col items-start gap-5 rounded-[2rem] bg-white p-6 shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:p-8">
          <span className="bg-brand-50 text-brand-600 flex size-14 shrink-0 items-center justify-center rounded-2xl">
            <Landmark className="size-7" aria-hidden />
          </span>
          <div className="flex-1">
            <h2 className="text-xl font-extrabold">Vous dirigez une université ou un institut ?</h2>
            <p className="text-muted mt-1">
              Confirmez vos inscrits en quelques clics et offrez-leur une carte étudiante numérique à vos couleurs. Gratuit.
            </p>
          </div>
          <LinkButton href="/universites" variant="outline">
            Université partenaire <ArrowRight className="size-4" />
          </LinkButton>
        </div>
      </section>

      {/* 7. APPEL FINAL */}
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
