import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteNews } from "@/app/admin/actions";
import { NewsForm } from "@/components/admin/news-form";
import { AdminHeader } from "@/components/admin/shared";
import { ConfirmButton } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin";
import type { NewsPost } from "@/lib/types";

export const metadata = { title: "Modifier l'article" };

export default async function EditNews({ params, searchParams }: PageProps<"/admin/actualites/[id]">) {
  const { id } = await params;
  const { enregistre } = await searchParams;
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("news_posts").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const post = data as NewsPost;
  return (
    <>
      <AdminHeader
        title={post.title}
        intro={enregistre ? "✓ Modifications enregistrées." : undefined}
        action={
          <div className="flex items-center gap-2">
            {post.status === "published" && (
              <Link href={`/actualites/${post.slug}`} target="_blank" className="text-sm font-semibold text-papel-700">
                Voir sur le site ↗
              </Link>
            )}
            <form action={deleteNews}>
              <input type="hidden" name="id" value={post.id} />
              <ConfirmButton message="Supprimer définitivement cet article ? Pour le retirer sans le supprimer, passez-le en « Archivé ».">
                Supprimer
              </ConfirmButton>
            </form>
          </div>
        }
      />
      <NewsForm key={post.updated_at} post={post} />
    </>
  );
}
