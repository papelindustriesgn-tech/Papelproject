import type { Metadata } from "next";
import Image from "next/image";
import { Factory, Globe2, HeartHandshake, Layers, MapPin, Target } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { PageIntro } from "@/components/ui/page-intro";
import { SectionHeader } from "@/components/ui/section-header";
import { getCompany } from "@/lib/data";
import entrance from "../../../../public/images/site-coyah-rendu-entree.jpg";
import facade from "../../../../public/images/site-coyah-rendu-facade.jpg";
import table from "../../../../public/images/papel-doux-table.jpg";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Papel Industries",
  description:
    "Papel Industries, entreprise guinéenne de produits d'hygiène implantée à Coyah : notre histoire, notre ambition industrielle et notre vision pour la Guinée et l'Afrique de l'Ouest.",
  alternates: { canonical: "/entreprise" },
};

const STEPS = [
  {
    Icon: Target,
    title: "Consolider Papel Doux en Guinée",
    text: "Renforcer la présence de nos mouchoirs auprès des familles, des commerces et des professionnels, avec un approvisionnement régulier.",
  },
  {
    Icon: Layers,
    title: "Élargir progressivement la gamme",
    text: "Étudier de nouveaux produits d'hygiène du quotidien. Chaque gamme ne sera annoncée qu'une fois prête à être commercialisée.",
  },
  {
    Icon: Globe2,
    title: "Ouvrir la voie régionale",
    text: "À terme, faire de Papel une marque de référence en Afrique de l'Ouest, en s'appuyant sur une base industrielle solide en Guinée.",
  },
];

export default async function CompanyPage() {
  const company = await getCompany();
  return (
    <>
      <PageIntro
        eyebrow="Notre entreprise"
        title="Papel Industries"
        intro="Une entreprise guinéenne de transformation du papier et de produits d'hygiène, qui construit une marque du quotidien sérieuse, accessible et durable."
        crumbs={[{ href: "/entreprise", label: "Papel Industries" }]}
      />

      {/* NAISSANCE */}
      <section className="py-20 sm:py-24">
        <div className="container-page grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeader eyebrow="La naissance du projet" title="Une conviction : l'hygiène du quotidien mérite le meilleur" />
            <div className="mt-6 space-y-5 text-lg leading-relaxed text-muted">
              <p>
                Papel est né d&apos;une idée simple : les produits que l&apos;on utilise chaque jour, à la maison comme au
                travail, doivent être agréables, fiables et accessibles.
              </p>
              <p>
                C&apos;est avec cette exigence que Papel Industries a lancé sa première gamme, les mouchoirs{" "}
                <strong className="font-semibold text-ink">Papel Doux</strong>, reconnaissables à leur emballage aux motifs
                tropicaux et à leur signature : « La propreté entre vos mains ».
              </p>
              <p>
                Notre origine guinéenne est un point d&apos;ancrage et une source de fierté. Mais ce qui nous engage avant tout,
                c&apos;est l&apos;expérience que nos produits offrent à ceux qui les utilisent.
              </p>
            </div>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-card shadow-card">
            <Image
              src={table}
              alt="Mouchoirs Papel Doux sur une table"
              fill
              sizes="(min-width: 1024px) 600px, 100vw"
              className="object-cover"
              placeholder="blur"
            />
          </div>
        </div>
      </section>

      {/* AMBITION INDUSTRIELLE / COYAH */}
      <section aria-labelledby="coyah" className="bg-sable py-20 sm:py-24">
        <div className="container-page">
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="mb-3 eyebrow">Notre ambition industrielle</p>
              <h2 id="coyah" className="text-3xl font-bold text-papel-950 sm:text-4xl">
                Coyah, notre ancrage industriel
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-muted">
                Papel Industries est implantée à {company.factoryCity}, dans la zone de {company.factoryArea}. Notre ambition est
                d&apos;y développer une industrie compétitive, capable de produire des articles d&apos;hygiène de qualité
                constante, au plus près de nos clients.
              </p>
              <ul className="mt-8 space-y-4">
                <li className="flex gap-3">
                  <MapPin className="mt-1 size-5 shrink-0 text-papel-600" aria-hidden />
                  <span>
                    <strong className="font-semibold">Localisation :</strong> {company.factoryArea}, {company.factoryCity} —{" "}
                    {company.country}
                  </span>
                </li>
                <li className="flex gap-3">
                  <Factory className="mt-1 size-5 shrink-0 text-papel-600" aria-hidden />
                  <span>
                    <strong className="font-semibold">Projet de bâtiment :</strong> un hangar industriel d&apos;environ 1 940 m²
                    sur un terrain d&apos;environ 4 760 m², avec quais de chargement dédiés.
                  </span>
                </li>
              </ul>
            </div>
            <div className="grid gap-4 lg:col-span-7">
              <figure>
                <div className="relative aspect-[16/9] overflow-hidden rounded-card shadow-card">
                  <Image
                    src={facade}
                    alt="Vue d'architecte de la façade du projet de site Papel Industries"
                    fill
                    sizes="(min-width: 1024px) 700px, 100vw"
                    className="object-cover object-[50%_45%]"
                    placeholder="blur"
                  />
                </div>
              </figure>
              <figure>
                <div className="relative aspect-[16/9] overflow-hidden rounded-card shadow-card">
                  <Image
                    src={entrance}
                    alt="Vue d'architecte de l'entrée du projet de site Papel Industries"
                    fill
                    sizes="(min-width: 1024px) 700px, 100vw"
                    className="object-cover"
                    placeholder="blur"
                  />
                </div>
                <figcaption className="mt-3 text-sm text-muted">
                  Projet de construction du site de {company.factoryCity} — vues d&apos;architecte (rendus 3D, non contractuels).
                  Il ne s&apos;agit pas de photographies.
                </figcaption>
              </figure>
            </div>
          </div>
        </div>
      </section>

      {/* VISION */}
      <section className="py-20 sm:py-24">
        <div className="container-page">
          <SectionHeader
            eyebrow="Notre vision de développement"
            title="Grandir étape par étape"
            intro="Construire une marque de référence dans les produits d'hygiène du quotidien, d'abord en Guinée, puis progressivement en Afrique de l'Ouest."
          />
          <ol className="mt-12 grid gap-5 md:grid-cols-3">
            {STEPS.map(({ Icon, title, text }, i) => (
              <li key={title} className="relative rounded-card bg-white p-7 shadow-card ring-1 ring-line">
                <span className="text-sm font-semibold text-papel-500">Étape {i + 1}</span>
                <Icon className="mt-4 size-7 text-papel-700" aria-hidden />
                <h3 className="mt-4 text-xl font-bold text-papel-950">{title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ENGAGEMENT */}
      <section className="pb-20 sm:pb-24">
        <div className="container-page">
          <div className="grid gap-10 rounded-[2rem] bg-papel-800 p-8 text-white sm:p-12 lg:grid-cols-2">
            <div>
              <HeartHandshake className="size-9 text-anis" aria-hidden />
              <h2 className="mt-5 text-3xl font-bold">Notre engagement envers les consommateurs</h2>
            </div>
            <ul className="space-y-5 text-lg text-white/80">
              <li>
                <strong className="text-white">Qualité :</strong> des produits agréables et fiables, que l&apos;on retrouve
                identiques d&apos;un achat à l&apos;autre.
              </li>
              <li>
                <strong className="text-white">Accessibilité :</strong> des formats et des prix pensés pour le plus grand nombre.
              </li>
              <li>
                <strong className="text-white">Proximité :</strong> une équipe à l&apos;écoute de vos remarques et de vos besoins.
              </li>
            </ul>
            <div className="flex flex-col gap-3 sm:flex-row lg:col-span-2">
              <ButtonLink href="/produits" variant="light" size="lg">
                Découvrir nos produits
              </ButtonLink>
              <ButtonLink
                href="/contact"
                size="lg"
                className="bg-transparent shadow-none ring-1 ring-white/40 ring-inset hover:bg-white/10"
              >
                Nous écrire
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
