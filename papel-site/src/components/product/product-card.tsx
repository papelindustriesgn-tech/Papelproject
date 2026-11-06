import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { AVAILABILITY_LABEL } from "@/lib/labels";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/cn";

export function AvailabilityBadge({ value, className }: { value: Product["availability"]; className?: string }) {
  const tone =
    value === "available"
      ? "bg-papel-50 text-papel-700 ring-papel-200"
      : value === "limited"
        ? "bg-soleil/15 text-[#8a5a00] ring-soleil/40"
        : "bg-sable text-muted ring-line";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
        tone,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", value === "available" ? "bg-papel-500" : "bg-current")} aria-hidden />
      {AVAILABILITY_LABEL[value]}
    </span>
  );
}

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const image = product.images[0];
  return (
    <Link
      href={`/produits/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-card bg-white shadow-card ring-1 ring-line transition duration-300 hover:-translate-y-1 hover:shadow-lift"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-sable">
        {image ? (
          <Image
            src={image}
            alt={product.name}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <ImagePlaceholder />
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <AvailabilityBadge value={product.availability} className="self-start" />
        <h3 className="mt-4 text-xl font-bold text-papel-950">{product.name}</h3>
        {product.short_description && <p className="mt-2 leading-relaxed text-muted">{product.short_description}</p>}
        <span className="mt-auto inline-flex items-center gap-1 pt-6 font-semibold text-papel-700">
          Voir la fiche produit
          <ArrowUpRight className="size-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}
