import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  Building2,
  Car,
  HandCoins,
  Home,
  Hotel,
  ShieldCheck,
  Sparkles,
  Store,
  Truck,
} from "lucide-react";
import { NewsCard } from "@/components/news/news-card";
import { ProductCard } from "@/components/product/product-card";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { getCompany, getHome, getNews, getProducts, getRanges } from "@/lib/data";
import facade from "../../../public/images/site-coyah-rendu-facade.jpg";
import shelf from "../../../public/images/papel-doux-en-rayon.jpg";

export const revalidate = 300;

const COMMITMENT_ICONS = [Sparkles, HandCoins, ShieldCheck];

const UNIVERSES = [
  {
    Icon: Home,
    title: "À la maison",
    text: "Au salon, dans la chambre ou la cuisine : un paquet toujours à portée de main pour toute la famille.",
    tone: "bg-papel-50 text-papel-700",
  },
  {
    Icon: Briefcase,
    title: "Au bureau",
    text: "Sur le bureau ou en salle de réunion, un geste d'hygiène simple pour vos équipes et vos visiteurs.",
    tone: "bg-soleil/15 text-[#8a5a00]",
  },
  {
    Icon: Car,
    title: "En déplacement",
    text: "Le paquet souple se glisse dans la boîte à gants, un sac ou un cartable.",
    tone: "bg-corail/10 text-corail",
  },
  {
    Icon: Building2,
    title: "Pour les professionnels",
    text: "Hôtels, restaurants, commerces et entreprises : des approvisionnements adaptés à vos volumes.",
    tone: "bg-anis-soft text-papel-800",
  },
];

const PARTNERS = [
  { Icon: Truck, title: "Grossistes et distributeurs", text: "Développez une marque identifiable auprès de vos clients." },
  { Icon: Store, title: "Commerces et revendeurs", text: "Proposez un produit du quotidien qui se renouvelle régulièrement." },
  { Icon: Hotel, title: "Hôtels et restaurants", text: "Équipez vos chambres, salles et comptoirs." },
  { Icon: Building2, title: "Entreprises et institutions", text: "Simplifiez l'approvisionnement de vos locaux." },
];

export default async function HomePage() {
  const [home, company, ranges, products, news] = await Promise.all([
    getHome(),
    getCompany(),
    getRanges(),
    getProducts(),
    getNews(3),
  ]);
  const featured = products
    .filter((p) => p.is_featured)
    .concat(products.filter((p) => !p.is_featured))
    .slice(0, 3);
  const commercialized = ranges.filter((r) => r.is_commercialized);

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="container-page grid items-center gap-8 pt-6 pb-16 sm:gap-10 lg:grid-cols-12 lg:gap-12 lg:pt-12 lg:pb-24">
          <div className="animate-rise lg:col-span-6">
            <p className="eyebrow">{home.heroEyebrow}</p>
            <h1 className="mt-4 text-[2.6rem] leading-[1.05] font-extrabold text-papel-950 sm:text-6xl lg:text-[4.25rem]">
              {home.heroTitle}
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted sm:mt-6 sm:text-xl">{home.heroSubtitle}</p>
            <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row">
              <ButtonLink href="/produits" size="lg">
                Découvrir nos produits <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
              <ButtonLink href="/professionnels#demande" size="lg" variant="secondary">
                Devenir distributeur
              </ButtonLink>
            </div>
            <ul className="mt-10 hidden flex-wrap gap-x-6 gap-y-3 text-sm text-muted sm:flex">
              {["Maison", "Bureau", "Déplacement", "Professionnels"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <BadgeCheck className="size-4 text-papel-500" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative lg:col-span-6">
            <div className="absolute -top-6 -right-24 hidden size-[34rem] rounded-full bg-anis-soft lg:block" aria-hidden />
            {/* Visuel mobile : cadrage paysage */}
            <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] shadow-lift lg:hidden">
              <Image src={home.heroImageMobile} alt={home.heroImageAlt} fill priority sizes="100vw" className="object-cover" />
            </div>
            {/* Visuel desktop : cadrage portrait */}
            <div className="relative ml-auto hidden aspect-[4/5] max-h-[40rem] overflow-hidden rounded-[2rem] shadow-lift lg:block">
              <Image
                src={home.heroImage}
                alt={home.heroImageAlt}
                fill
                priority
                sizes="(min-width: 1024px) 600px, 1px"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ENGAGEMENTS */}
      <section aria-labelledby="engagements" className="bg-sable py-20 sm:py-24">
        <div className="container-page">
          <p className="mb-3 eyebrow">Nos engagements</p>
          <h2 id="engagements" className="max-w-2xl text-3xl font-bold text-papel-950 sm:text-4xl">
            {home.commitmentsTitle}
          </h2>
          <ol className="mt-12 grid gap-5 md:grid-cols-3">
            {home.commitments.map((c, i) => {
              const Icon = COMMITMENT_ICONS[i % COMMITMENT_ICONS.length];
              return (
                <li key={c.title} className="rounded-card bg-white p-7 shadow-card ring-1 ring-line">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-papel-700 text-white">
                      <Icon className="size-6" aria-hidden />
                    </span>
                    <span className="font-display text-4xl font-bold text-papel-100">0{i + 1}</span>
                  </div>
                  <h3 className="mt-6 text-xl font-bold text-papel-950">{c.title}</h3>
                  <p className="mt-3 leading-relaxed text-muted">{c.text}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* PRODUITS */}
      <section aria-labelledby="produits" className="py-20 sm:py-24">
        <div className="container-page">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <SectionHeader
              eyebrow="Nos produits"
              title={commercialized[0]?.name ?? "Nos gammes"}
              intro={commercialized[0]?.description ?? undefined}
            />
            <ButtonLink href="/produits" variant="secondary" className="self-start md:self-auto">
              Tout le catalogue <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
            <figure className="relative min-h-80 overflow-hidden rounded-card lg:col-span-2 lg:min-h-0">
              <Image
                src={shelf}
                alt="Présentoir de mouchoirs Papel Doux en magasin"
                fill
                sizes="(min-width: 1024px) 800px, 100vw"
                className="object-cover object-[50%_35%]"
                placeholder="blur"
              />
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-papel-950/85 to-transparent p-6 pt-20 text-white">
                <p className="font-display text-2xl font-bold">Papel Doux, en rayon</p>
                <p className="mt-1 text-white/80">Un emballage reconnaissable entre tous.</p>
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* UNIVERS */}
      <section aria-labelledby="quotidien" className="bg-sable py-20 sm:py-24">
        <div className="container-page">
          <SectionHeader
            eyebrow="Papel dans votre quotidien"
            title="Partout où l'hygiène compte"
            intro="Un même produit, pensé pour vos différents moments de la journée."
          />
          <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {UNIVERSES.map(({ Icon, title, text, tone }) => (
              <li key={title} className="flex flex-col rounded-card bg-white p-7 shadow-card ring-1 ring-line">
                <span className={`inline-flex size-12 items-center justify-center rounded-2xl ${tone}`}>
                  <Icon className="size-6" aria-hidden />
                </span>
                <h3 className="mt-6 text-lg font-bold text-papel-950">{title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* PARTENAIRES */}
      <section aria-labelledby="partenaires" className="relative overflow-hidden bg-papel-800 py-20 text-white sm:py-24">
        <div className="pointer-events-none absolute inset-0 leaf-pattern opacity-50" aria-hidden />
        <div className="relative container-page grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="text-xs font-semibold tracking-[0.14em] text-anis uppercase">Nos partenaires</p>
            <h2 id="partenaires" className="mt-3 text-3xl font-bold sm:text-4xl">
              Distribuons Papel ensemble
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-white/75">
              Papel Industries développe son réseau commercial en Guinée. Nous recherchons des partenaires sérieux pour rendre nos
              produits accessibles au plus grand nombre.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/professionnels#demande" variant="light" size="lg">
                Devenir partenaire
              </ButtonLink>
              <ButtonLink
                href="/professionnels"
                size="lg"
                className="bg-transparent text-white shadow-none ring-1 ring-white/40 ring-inset hover:bg-white/10"
              >
                Solutions professionnelles
              </ButtonLink>
            </div>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
            {PARTNERS.map(({ Icon, title, text }) => (
              <li key={title} className="rounded-card bg-white/[0.06] p-6 ring-1 ring-white/10 backdrop-blur">
                <Icon className="size-6 text-anis" aria-hidden />
                <h3 className="mt-4 text-lg font-bold">{title}</h3>
                <p className="mt-2 text-white/70">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ENTREPRISE */}
      <section aria-labelledby="entreprise" className="py-20 sm:py-24">
        <div className="container-page grid items-center gap-12 lg:grid-cols-2">
          <figure>
            <div className="relative aspect-[16/10] overflow-hidden rounded-card shadow-card">
              <Image
                src={facade}
                alt="Vue d'architecte du projet de site industriel Papel Industries à Coyah"
                fill
                sizes="(min-width: 1024px) 600px, 100vw"
                className="object-cover object-[50%_45%]"
                placeholder="blur"
              />
            </div>
            <figcaption className="mt-3 text-sm text-muted">
              Projet de site industriel à {company.factoryCity} — vue d&apos;architecte (rendu 3D, non contractuel).
            </figcaption>
          </figure>
          <div>
            <SectionHeader eyebrow="Notre entreprise" title={home.companyTitle} intro={home.companyText} />
            <dl className="mt-8 grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-sable p-5">
                <dt className="text-sm text-muted">Implantation</dt>
                <dd className="mt-1 font-display text-lg font-bold text-papel-900">
                  {company.factoryCity}, {company.factoryArea}
                </dd>
              </div>
              <div className="rounded-2xl bg-sable p-5">
                <dt className="text-sm text-muted">Première gamme</dt>
                <dd className="mt-1 font-display text-lg font-bold text-papel-900">Mouchoirs Papel Doux</dd>
              </div>
            </dl>
            <Link
              href="/entreprise"
              className="mt-8 inline-flex items-center gap-2 font-semibold text-papel-700 hover:text-papel-900"
            >
              Découvrir Papel Industries <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* ACTUALITÉS */}
      {news.length > 0 && (
        <section aria-labelledby="actualites" className="border-t border-line py-20 sm:py-24">
          <div className="container-page">
            <div className="flex items-end justify-between gap-6">
              <SectionHeader eyebrow="Actualités" title="Les dernières nouvelles de Papel" />
              <Link href="/actualites" className="hidden font-semibold text-papel-700 hover:text-papel-900 sm:inline-flex">
                Toutes les actualités
              </Link>
            </div>
            <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
              {news.map((post) => (
                <NewsCard key={post.id} post={post} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* APPEL À L'ACTION */}
      <section className="pb-20 sm:pb-24">
        <div className="container-page">
          <div className="relative overflow-hidden rounded-[2rem] bg-anis px-6 py-14 text-center sm:px-12 sm:py-20">
            <div className="pointer-events-none absolute inset-0 leaf-pattern opacity-60 mix-blend-multiply" aria-hidden />
            <div className="relative mx-auto max-w-2xl">
              <h2 className="text-3xl font-extrabold text-papel-950 sm:text-5xl">{home.closingTitle}</h2>
              <p className="mt-5 text-lg text-papel-900/80">{home.closingText}</p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <ButtonLink href="/professionnels#demande" size="lg">
                  Devenir distributeur
                </ButtonLink>
                <ButtonLink href="/contact" size="lg" variant="light">
                  Nous contacter
                </ButtonLink>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
