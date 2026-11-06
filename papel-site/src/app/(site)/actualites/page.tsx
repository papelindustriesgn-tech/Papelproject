import type { Metadata } from "next";
import { NewsCard } from "@/components/news/news-card";
import { PageIntro } from "@/components/ui/page-intro";
import { getNews } from "@/lib/data";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Actualités",
  description: "Nouveautés, lancements de produits, actualités industrielles, partenariats et événements de Papel Industries.",
  alternates: { canonical: "/actualites" },
};

export default async function NewsPage() {
  const posts = await getNews();
  return (
    <>
      <PageIntro
        eyebrow="Actualités"
        title="Les nouvelles de Papel"
        intro="Lancements, partenariats, vie de l'entreprise : suivez le développement de Papel Industries."
        crumbs={[{ href: "/actualites", label: "Actualités" }]}
      />
      <section className="py-16 sm:py-20">
        <div className="container-page">
          {posts.length === 0 ? (
            <p className="text-muted">Aucune actualité publiée pour le moment.</p>
          ) : (
            <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <NewsCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
