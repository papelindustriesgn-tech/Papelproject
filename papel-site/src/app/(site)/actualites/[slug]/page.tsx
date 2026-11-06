import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { JsonLd } from "@/components/ui/json-ld";
import { RichText } from "@/components/ui/rich-text";
import { ShareLinks } from "@/components/news/share-links";
import { getCompany, getNews, getNewsPost } from "@/lib/data";
import { siteUrl } from "@/lib/env";
import { formatDate, NEWS_CATEGORY_LABEL } from "@/lib/labels";

export const revalidate = 300;

export async function generateStaticParams() {
  return (await getNews()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/actualites/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await getNewsPost(slug);
  if (!post) return { title: "Actualité introuvable" };
  const description = post.seo_description || post.excerpt || undefined;
  return {
    title: post.seo_title || post.title,
    description,
    alternates: { canonical: `/actualites/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.seo_title || post.title,
      description,
      publishedTime: post.published_at ?? undefined,
      images: post.cover_image ? [{ url: post.cover_image }] : undefined,
    },
  };
}

export default async function NewsPostPage({ params }: PageProps<"/actualites/[slug]">) {
  const { slug } = await params;
  const [post, company] = await Promise.all([getNewsPost(slug), getCompany()]);
  if (!post) notFound();
  const url = `${siteUrl()}/actualites/${post.slug}`;

  return (
    <article className="pb-20">
      <header className="bg-sable">
        <div className="container-page max-w-3xl pt-8 pb-12 sm:pt-12">
          <Link
            href="/actualites"
            className="inline-flex items-center gap-2 text-sm font-medium text-papel-700 hover:text-papel-900"
          >
            <ArrowLeft className="size-4" aria-hidden /> Toutes les actualités
          </Link>
          <p className="mt-8 text-sm text-muted">
            <span className="font-semibold text-papel-700">{NEWS_CATEGORY_LABEL[post.category]}</span>
            {post.published_at && (
              <>
                {" · "}
                <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
              </>
            )}
          </p>
          <h1 className="mt-3 text-4xl font-bold text-papel-950 sm:text-5xl">{post.title}</h1>
          {post.excerpt && <p className="mt-5 text-xl leading-relaxed text-muted">{post.excerpt}</p>}
        </div>
      </header>
      {post.cover_image && (
        <div className="container-page -mt-2 max-w-4xl pt-10">
          <div className="relative aspect-[16/10] overflow-hidden rounded-card shadow-card">
            <Image
              src={post.cover_image}
              alt=""
              fill
              priority
              sizes="(min-width: 1024px) 900px, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      )}
      <div className="container-page max-w-3xl pt-10">
        <RichText text={post.content} className="text-lg text-ink/85" />
        <ShareLinks url={url} title={post.title} />
      </div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "NewsArticle",
          headline: post.title,
          description: post.excerpt ?? undefined,
          datePublished: post.published_at ?? undefined,
          dateModified: post.updated_at ?? post.published_at ?? undefined,
          image: post.cover_image
            ? [post.cover_image.startsWith("http") ? post.cover_image : `${siteUrl()}${post.cover_image}`]
            : undefined,
          mainEntityOfPage: url,
          publisher: {
            "@type": "Organization",
            name: company.brandName,
            logo: { "@type": "ImageObject", url: `${siteUrl()}/brand/papel-industrie-green.png` },
          },
        }}
      />
    </article>
  );
}
