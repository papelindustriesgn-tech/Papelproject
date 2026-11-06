import Image from "next/image";
import Link from "next/link";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { formatDate, NEWS_CATEGORY_LABEL } from "@/lib/labels";
import type { NewsPost } from "@/lib/types";

export function NewsCard({ post }: { post: NewsPost }) {
  return (
    <Link href={`/actualites/${post.slug}`} className="group flex flex-col">
      <div className="relative aspect-[16/10] overflow-hidden rounded-card bg-sable">
        {post.cover_image ? (
          <Image
            src={post.cover_image}
            alt=""
            fill
            sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <ImagePlaceholder label="Papel Industries" />
        )}
      </div>
      <p className="mt-4 text-sm text-muted">
        <span className="font-semibold text-papel-700">{NEWS_CATEGORY_LABEL[post.category]}</span>
        {post.published_at && (
          <>
            {" "}
            · <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
          </>
        )}
      </p>
      <h3 className="mt-2 text-xl font-bold text-papel-950 group-hover:text-papel-700">{post.title}</h3>
      {post.excerpt && <p className="mt-2 leading-relaxed text-muted">{post.excerpt}</p>}
    </Link>
  );
}
