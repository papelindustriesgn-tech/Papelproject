import type { Metadata } from "next";
import Image from "@/components/ui/safe-image";
import { notFound } from "next/navigation";
import { CalendarDays, CreditCard, MapPin, Phone, ShieldCheck } from "lucide-react";
import { BackLink } from "@/components/ui/back-link";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { DemoBanner } from "@/components/ui/demo-banner";
import { LinkButton } from "@/components/ui/button";
import { FavoriteButton } from "@/components/content/favorite-button";
import { ViewTracker } from "@/components/content/view-tracker";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DEAL_CATEGORIES } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { z } from "zod";

type Props = { params: Promise<{ id: string }> };

async function load(id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("deals")
    .select("*, partner:partners(id, name, logo_url, description, district, address, phone, website, is_demo)")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const deal = await load((await params).id);
  return { title: deal ? `${deal.discount_label} — ${deal.title}` : "Offre" };
}

export default async function DealPage({ params }: Props) {
  const { id } = await params;
  const [deal, profile] = await Promise.all([load(id), requireProfile()]);
  if (!deal) notFound();
  const supabase = await createClient();
  const { data: fav } = await supabase
    .from("deal_favorites")
    .select("deal_id")
    .eq("deal_id", id)
    .eq("user_id", profile.id)
    .maybeSingle();
  const cat = DEAL_CATEGORIES[deal.category];
  const verified = profile.verification_status === "verified";
  const expired = deal.valid_until ? new Date(`${deal.valid_until}T23:59:59`) < new Date() : false;

  return (
    <article className="animate-fade-up mx-auto max-w-3xl">
      <ViewTracker kind="deal" id={deal.id} />
      <BackLink href="/avantages" label="Avantages" />
      <div className="bg-brand-50 relative -mx-4 aspect-[16/9] overflow-hidden md:mx-0 md:rounded-[var(--radius-card)]">
        {deal.image_url && (
          <Image src={deal.image_url} alt="" fill priority sizes="(max-width: 768px) 100vw, 768px" className="object-cover" />
        )}
        <span className="bg-coral-500 absolute bottom-4 left-4 rounded-2xl px-4 py-2 text-2xl font-extrabold text-white shadow-xl">
          {deal.discount_label}
        </span>
        {deal.is_demo && <DemoBadge className="absolute top-4 left-4" />}
      </div>

      <div className="mt-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Badge>
            {cat.emoji} {cat.label}
          </Badge>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight">{deal.title}</h1>
          <p className="text-muted mt-1 font-semibold">{deal.partner?.name}</p>
        </div>
        <FavoriteButton kind="deal" id={deal.id} initial={!!fav} className="ring-line shrink-0 ring-1" />
      </div>

      {deal.is_demo && (
        <div className="mt-4">
          <DemoBanner />
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-[var(--shadow-card)]">
          <MapPin className="text-brand-600 size-5 shrink-0" aria-hidden />
          <div className="min-w-0 text-sm">
            <p className="font-semibold">{deal.district ?? "Guinée"}</p>
            {deal.partner?.address && <p className="text-muted truncate">{deal.partner.address}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-[var(--shadow-card)]">
          <CalendarDays className="text-brand-600 size-5 shrink-0" aria-hidden />
          <div className="text-sm">
            <p className="font-semibold">
              {expired ? "Offre expirée" : deal.valid_until ? `Jusqu'au ${formatDate(deal.valid_until)}` : "Sans date limite"}
            </p>
            <p className="text-muted">Depuis le {formatDate(deal.valid_from)}</p>
          </div>
        </div>
      </div>

      <section className="mt-6 space-y-5 rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <div>
          <h2 className="font-bold">L&apos;offre</h2>
          <p className="text-ink/80 mt-1 leading-relaxed whitespace-pre-line">{deal.description || "—"}</p>
        </div>
        <div>
          <h2 className="font-bold">Conditions</h2>
          <p className="text-ink/80 mt-1 leading-relaxed whitespace-pre-line">
            {deal.conditions || "Aucune condition particulière."}
          </p>
        </div>
        {deal.partner?.description && (
          <div>
            <h2 className="font-bold">À propos de {deal.partner.name}</h2>
            <p className="text-ink/80 mt-1 leading-relaxed">{deal.partner.description}</p>
          </div>
        )}
        {deal.partner?.phone && !deal.partner.is_demo && (
          <a href={`tel:${deal.partner.phone}`} className="text-brand-600 inline-flex items-center gap-2 text-sm font-semibold">
            <Phone className="size-4" /> {deal.partner.phone}
          </a>
        )}
      </section>

      <div className="sticky bottom-20 z-20 mt-6 lg:bottom-4">
        {expired ? (
          <p className="bg-canvas text-muted ring-line rounded-2xl p-4 text-center text-sm font-semibold ring-1">
            Cette offre a expiré.
          </p>
        ) : verified || !deal.requires_verification ? (
          <LinkButton href="/carte" size="lg" className="w-full">
            <CreditCard className="size-5" /> Présenter ma carte
          </LinkButton>
        ) : (
          <LinkButton href="/profil/verification" size="lg" variant="mango" className="w-full">
            <ShieldCheck className="size-5" /> Vérifier mon statut pour en profiter
          </LinkButton>
        )}
      </div>
    </article>
  );
}
