import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check, Info } from "lucide-react";
import { ProductGallery } from "@/components/product/gallery";
import { AvailabilityBadge } from "@/components/product/product-card";
import { ButtonLink } from "@/components/ui/button";
import { JsonLd } from "@/components/ui/json-ld";
import { PageIntro } from "@/components/ui/page-intro";
import { RichText } from "@/components/ui/rich-text";
import { WhatsAppButton } from "@/components/ui/whatsapp-link";
import { getCompany, getProduct, getProducts } from "@/lib/data";
import { siteUrl } from "@/lib/env";

export const revalidate = 300;

export async function generateStaticParams() {
  return (await getProducts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/produits/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const found = await getProduct(slug);
  if (!found) return { title: "Produit introuvable" };
  const { product } = found;
  const description = product.seo_description || product.short_description || undefined;
  return {
    title: product.seo_title || product.name,
    description,
    alternates: { canonical: `/produits/${product.slug}` },
    openGraph: {
      title: product.seo_title || product.name,
      description,
      images: product.images[0] ? [{ url: product.images[0] }] : undefined,
    },
  };
}

const PENDING = "En cours de validation";

export default async function ProductPage({ params }: PageProps<"/produits/[slug]">) {
  const { slug } = await params;
  const [found, company] = await Promise.all([getProduct(slug), getCompany()]);
  if (!found) notFound();
  const { product, range } = found;

  const specs: [string, string | null][] = [
    ["Format", product.format],
    ["Dimensions", product.dimensions],
    ["Nombre de feuilles", product.sheet_count],
    ["Nombre de plis", product.ply_count],
    ["Conditionnement", product.packaging],
  ];
  const quoteHref = `/professionnels?demande=devis&produit=${encodeURIComponent(product.name)}#demande`;
  const orderable = product.availability === "available" || product.availability === "limited";

  return (
    <>
      <PageIntro
        title={product.name}
        crumbs={[
          { href: "/produits", label: "Nos produits" },
          ...(range ? [{ href: `/produits#${range.slug}`, label: range.name }] : []),
          { href: `/produits/${product.slug}`, label: product.name },
        ]}
      />
      <section className="py-12 sm:py-16">
        <div className="container-page grid gap-12 lg:grid-cols-2 lg:gap-16">
          <ProductGallery images={product.images} name={product.name} />

          <div>
            <AvailabilityBadge value={product.availability} />
            {product.short_description && <p className="mt-5 text-xl leading-relaxed text-ink">{product.short_description}</p>}
            {product.description && <RichText text={product.description} className="mt-6 text-muted" />}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={quoteHref} size="lg">
                Demander un devis
              </ButtonLink>
              <ButtonLink href="/contact#distributeur" size="lg" variant="secondary">
                Trouver un distributeur
              </ButtonLink>
            </div>
            <WhatsAppButton
              number={company.whatsapp}
              context="devis"
              extra={`Produit : ${product.name}.`}
              label="Demander par WhatsApp"
              className="mt-3 w-full sm:w-auto"
            />
            {!orderable && (
              <p className="mt-4 text-sm text-muted">
                Cette référence n&apos;est pas encore commercialisée : votre demande sera traitée dès sa disponibilité.
              </p>
            )}

            <h2 className="mt-12 text-xl font-bold text-papel-950">Caractéristiques</h2>
            <dl className="mt-4 divide-y divide-line rounded-card ring-1 ring-line">
              {specs.map(([label, value]) => (
                <div key={label} className="grid grid-cols-[minmax(0,10rem)_1fr] gap-4 px-5 py-4 text-sm sm:text-base">
                  <dt className="text-muted">{label}</dt>
                  <dd className={value ? "font-medium text-ink" : "text-muted italic"}>{value || PENDING}</dd>
                </div>
              ))}
            </dl>

            {product.recommended_uses.length > 0 && (
              <>
                <h2 className="mt-10 text-xl font-bold text-papel-950">Utilisations recommandées</h2>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {product.recommended_uses.map((u) => (
                    <li key={u} className="flex items-center gap-2">
                      <Check className="size-4 shrink-0 text-papel-500" aria-hidden />
                      {u}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {product.technical_info ? (
              <>
                <h2 className="mt-10 text-xl font-bold text-papel-950">Informations techniques</h2>
                <RichText text={product.technical_info} className="mt-4 text-muted" />
              </>
            ) : (
              <p className="mt-10 flex gap-3 rounded-2xl bg-sable p-4 text-sm text-muted">
                <Info className="mt-0.5 size-4 shrink-0 text-papel-600" aria-hidden />
                Les informations techniques détaillées de ce produit sont en cours de validation. Notre équipe commerciale peut
                vous les communiquer sur demande.
              </p>
            )}
          </div>
        </div>
      </section>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          description: product.short_description ?? undefined,
          image: product.images.map((src) => (src.startsWith("http") ? src : `${siteUrl()}${src}`)),
          brand: { "@type": "Brand", name: "Papel" },
          manufacturer: { "@type": "Organization", name: company.brandName },
          category: range?.name,
          url: `${siteUrl()}/produits/${product.slug}`,
        }}
      />
    </>
  );
}
