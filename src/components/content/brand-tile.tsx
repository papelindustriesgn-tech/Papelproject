import Link from "next/link";
import Image from "@/components/ui/safe-image";
import { Rail } from "@/components/home/rail";
import { DEAL_CATEGORIES, type DealCategory } from "@/lib/constants";

export type BrandTileData = { id: string; name: string; logo_url: string | null; category: DealCategory; offers: number };

/** Tuile d'une marque partenaire (logo, nom, nombre d'offres) vers sa page. */
export function BrandTile({ brand, className }: { brand: BrandTileData; className?: string }) {
  const cat = DEAL_CATEGORIES[brand.category];
  return (
    <Link
      href={`/avantages/marques/${brand.id}`}
      className={`group flex flex-col items-center gap-2 rounded-[var(--radius-card)] bg-white p-3 text-center shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 ${className ?? ""}`}
      data-testid="brand-tile"
    >
      <span className="bg-brand-50 relative flex size-16 items-center justify-center overflow-hidden rounded-2xl text-2xl">
        {brand.logo_url ? (
          <Image src={brand.logo_url} alt="" fill sizes="64px" className="object-cover" />
        ) : (
          <span aria-hidden>{cat.emoji}</span>
        )}
      </span>
      <span className="text-ink line-clamp-1 text-sm font-bold">{brand.name}</span>
      <span className="text-muted text-xs">
        {brand.offers} offre{brand.offers > 1 ? "s" : ""}
      </span>
    </Link>
  );
}

export function BrandRail({ brands }: { brands: BrandTileData[] }) {
  return (
    <Rail label="Marques">
      {brands.map((b) => (
        <BrandTile key={b.id} brand={b} className="w-32 shrink-0 snap-start" />
      ))}
    </Rail>
  );
}
