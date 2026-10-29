import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Globe, MapPin } from "lucide-react";
import { z } from "zod";
import Image from "@/components/ui/safe-image";
import { BackLink } from "@/components/ui/back-link";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DealCard } from "@/components/content/cards";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { favoriteIds, getBrand, listDeals } from "@/lib/queries";
import { DEAL_CATEGORIES } from "@/lib/constants";

type Props = { params: Promise<{ id: string }> };

async function load(id: string) {
  return z.uuid().safeParse(id).success ? getBrand(id) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const brand = await load((await params).id);
  return { title: brand ? `${brand.name} — réductions étudiantes` : "Marque" };
}

export default async function BrandPage({ params }: Props) {
  const { id } = await params;
  const [brand, profile] = await Promise.all([load(id), requireProfile()]);
  if (!brand) notFound();
  const supabase = await createClient();
  const [{ items }, favs] = await Promise.all([listDeals({ partnerId: brand.id }), favoriteIds(supabase, profile.id, "deal")]);
  const cat = DEAL_CATEGORIES[brand.category];
  const website = brand.website && /^https:\/\//.test(brand.website) && !brand.is_demo ? brand.website : null;

  return (
    <div className="animate-fade-up">
      <BackLink href="/avantages/marques" label="Marques" />
      <header className="flex items-center gap-4 rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <span className="bg-brand-50 relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-3xl">
          {brand.logo_url ? (
            <Image src={brand.logo_url} alt="" fill sizes="80px" className="object-cover" />
          ) : (
            <span aria-hidden>{cat.emoji}</span>
          )}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>
              {cat.emoji} {cat.label}
            </Badge>
            {brand.is_demo && <DemoBadge />}
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight" data-testid="brand-name">
            {brand.name}
          </h1>
          <p className="text-muted mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {(brand.district || brand.city) && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-4" aria-hidden /> {[brand.district, brand.city?.name].filter(Boolean).join(", ")}
              </span>
            )}
            {website && (
              <a
                href={website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 inline-flex items-center gap-1 font-semibold"
              >
                <Globe className="size-4" aria-hidden /> Site de la marque
              </a>
            )}
          </p>
        </div>
      </header>
      {brand.description && <p className="text-ink/80 mt-4 leading-relaxed">{brand.description}</p>}

      <h2 className="mt-6 mb-3 text-lg font-extrabold tracking-tight">Offres étudiantes ({items.length})</h2>
      {items.length === 0 ? (
        <EmptyState
          emoji="🏷️"
          title="Aucune offre en cours"
          text="Reviens bientôt : cette marque prépare ses prochaines réductions."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {items.map((d) => (
            <DealCard key={d.id} deal={d} favorite={favs.has(d.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
