import type { Metadata } from "next";
import Image from "next/image";
import { ProductCard } from "@/components/product/product-card";
import { ButtonLink } from "@/components/ui/button";
import { PageIntro } from "@/components/ui/page-intro";
import { getProducts, getRanges } from "@/lib/data";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Nos produits",
  description:
    "Catalogue Papel : mouchoirs Papel Doux en paquet souple. Fiches produits, formats et conditionnements pour particuliers et professionnels.",
  alternates: { canonical: "/produits" },
};

export default async function ProductsPage() {
  const [ranges, products] = await Promise.all([getRanges(), getProducts()]);

  return (
    <>
      <PageIntro
        eyebrow="Catalogue"
        title="Nos produits"
        intro="Des produits d'hygiène du quotidien, conçus pour la maison, le bureau, les déplacements et les professionnels."
        crumbs={[{ href: "/produits", label: "Nos produits" }]}
      />

      {ranges.map((range) => {
        const items = products.filter((p) => p.range_id === range.id);
        return (
          <section key={range.id} id={range.slug} aria-labelledby={`gamme-${range.slug}`} className="scroll-mt-24 py-16 sm:py-20">
            <div className="container-page">
              <div className="grid items-center gap-8 lg:grid-cols-12">
                <div className="lg:col-span-7">
                  <p className="mb-3 eyebrow">{range.is_commercialized ? "Gamme commercialisée" : "Gamme en préparation"}</p>
                  <h2 id={`gamme-${range.slug}`} className="text-3xl font-bold text-papel-950 sm:text-4xl">
                    {range.name}
                  </h2>
                  {range.tagline && <p className="mt-3 text-lg font-medium text-papel-700">{range.tagline}</p>}
                  {range.description && <p className="mt-4 max-w-2xl leading-relaxed text-muted">{range.description}</p>}
                </div>
                {range.image_url && (
                  <div className="relative hidden aspect-[4/3] overflow-hidden rounded-card shadow-card lg:col-span-5 lg:block">
                    <Image src={range.image_url} alt={range.name} fill sizes="500px" className="object-cover" />
                  </div>
                )}
              </div>

              {range.is_commercialized && items.length > 0 ? (
                <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((p, i) => (
                    <ProductCard key={p.id} product={p} priority={i === 0} />
                  ))}
                </div>
              ) : (
                <p className="mt-8 rounded-card bg-sable p-6 text-muted">
                  Cette gamme n&apos;est pas encore commercialisée. Les références seront présentées ici dès leur disponibilité.
                </p>
              )}
            </div>
          </section>
        );
      })}

      <section className="pb-20">
        <div className="container-page">
          <div className="flex flex-col items-start justify-between gap-6 rounded-card bg-papel-800 p-8 text-white sm:p-10 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-bold">Vous êtes un professionnel ?</h2>
              <p className="mt-2 text-white/75">
                Volumes, conditionnements, conditions de distribution : notre équipe vous répond.
              </p>
            </div>
            <ButtonLink href="/professionnels?demande=devis#demande" variant="light" size="lg">
              Demander un devis
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
