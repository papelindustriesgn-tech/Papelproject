import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, MapPin, MessageCircle, Pencil, Phone } from "lucide-react";
import { z } from "zod";
import { BackLink } from "@/components/ui/back-link";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { DemoBanner } from "@/components/ui/demo-banner";
import { buttonClass } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/field";
import { Avatar } from "@/components/ui/avatar";
import { Gallery } from "@/components/content/gallery";
import { ViewTracker } from "@/components/content/view-tracker";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ITEM_CONDITIONS, MARKET_CATEGORIES } from "@/lib/constants";
import { formatGNF, timeAgo, whatsappLink } from "@/lib/format";
import { param, type SearchParams } from "@/lib/url";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> };

async function load(id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("marketplace_items")
    .select("*, images:marketplace_images(url, position)")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const item = await load((await params).id);
  return { title: item ? `${item.title} — ${formatGNF(item.price_gnf)}` : "Annonce" };
}

export default async function ItemPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const [item, profile] = await Promise.all([load(id), requireProfile()]);
  if (!item) notFound();
  const supabase = await createClient();
  const { data: sellers } = item.seller_id
    ? await supabase.rpc("seller_public_info", { p_ids: [item.seller_id] })
    : { data: null };
  const seller = sellers?.[0];
  const mine = item.seller_id === profile.id;
  const images = [...(item.images ?? [])].sort((a, b) => a.position - b.position).map((i) => i.url);
  const c = MARKET_CATEGORIES[item.category];

  return (
    <article className="animate-fade-up mx-auto max-w-3xl">
      <ViewTracker kind="marketplace" id={item.id} />
      <BackLink href={mine ? "/marketplace/mes-annonces" : "/marketplace"} label={mine ? "Mes annonces" : "Marketplace"} />
      {param(sp, "publie") && (
        <div className="mb-4">
          <FormMessage type="success">Ton annonce est en ligne 🎉</FormMessage>
        </div>
      )}
      {item.status !== "active" && (
        <div className="mb-4">
          <FormMessage type="info">
            {item.status === "sold"
              ? "Cet article est marqué comme vendu."
              : item.status === "hidden"
                ? "Annonce masquée : elle n'est visible que par toi."
                : `Annonce retirée par la modération${item.moderation_note ? ` : ${item.moderation_note}` : "."}`}
          </FormMessage>
        </div>
      )}
      <Gallery images={images} alt={item.title} />
      <div className="mt-5">
        <div className="flex flex-wrap gap-1.5">
          <Badge>
            {c.emoji} {c.label}
          </Badge>
          <Badge tone="neutral">{ITEM_CONDITIONS[item.condition]}</Badge>
          {item.is_demo && <DemoBadge />}
        </div>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight">{item.title}</h1>
        <p className="text-brand-700 mt-1 text-2xl font-extrabold">
          {formatGNF(item.price_gnf)}
          {item.is_negotiable && <span className="text-muted ml-2 text-sm font-semibold">négociable</span>}
        </p>
        <p className="text-muted mt-2 flex items-center gap-1.5 text-sm">
          <MapPin className="size-4" aria-hidden /> {item.district ?? "Conakry"} · {timeAgo(item.created_at)}
        </p>
      </div>

      {item.is_demo && (
        <div className="mt-4">
          <DemoBanner what="annonce" />
        </div>
      )}

      <section className="mt-5 rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <h2 className="font-bold">Description</h2>
        <p className="text-ink/80 mt-1 leading-relaxed whitespace-pre-line">{item.description || "Pas de description."}</p>
      </section>

      <section className="mt-5 rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        {mine ? (
          <div className="flex flex-wrap gap-2">
            <Link href={`/marketplace/${item.id}/modifier`} className={buttonClass("primary", "md")}>
              <Pencil className="size-4" /> Modifier
            </Link>
            <Link href="/marketplace/mes-annonces" className={buttonClass("outline", "md")}>
              Gérer mes annonces
            </Link>
          </div>
        ) : seller ? (
          <>
            <div className="flex items-center gap-3">
              <Avatar src={seller.avatar_url} first={seller.display_name} size={48} />
              <div className="min-w-0">
                <p className="flex items-center gap-1 font-bold">
                  {seller.display_name}
                  {seller.verification_status === "verified" && (
                    <BadgeCheck className="text-mint-500 size-4" aria-label="Étudiant vérifié" />
                  )}
                </p>
                <p className="text-muted truncate text-sm">{seller.university ?? "Membre Uny"}</p>
              </div>
            </div>
            {item.contact_phone && item.status === "active" && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <a href={`tel:${item.contact_phone}`} className={buttonClass("outline", "lg")}>
                  <Phone className="size-5" /> Appeler
                </a>
                <a
                  href={whatsappLink(item.contact_phone, `Bonjour, ton annonce « ${item.title} » sur Uny m'intéresse.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClass("primary", "lg", "bg-[#1fa855] hover:bg-[#178a45]")}
                >
                  <MessageCircle className="size-5" /> WhatsApp
                </a>
              </div>
            )}
            <p className="text-muted mt-3 text-xs">
              Conseil sécurité : rencontre le vendeur dans un lieu public (campus, café) et vérifie l&apos;article avant de payer.
            </p>
          </>
        ) : (
          <p className="text-muted text-sm">Annonce de démonstration : aucun vendeur réel à contacter.</p>
        )}
      </section>
    </article>
  );
}
